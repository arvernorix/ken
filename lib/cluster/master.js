'use strict';

var cluster = require('cluster'),

    shien = require('shien'),
    SortedMap = shien.collection.SortedMap,

    MasterDispatcher = require('./dispatcher/master').Dispatcher,

    processModes = {
        KEEP_ALIVE: 'keepAlive',
        SHUTDOWN: 'shutdown',
        WATCH_FILES: 'watchFiles'
    };

function WorkerData(worker) {
    this.worker = worker;
    this.started = false;
    this.heartbeatAt = null;
    this.retireAt = null;
    this.retired = false;
    this.killed = false;
}

function Master(logger, cfg) {
    shien.enhance(this, logger);

    this.config = cfg || {};
    this.processMode = (this.env === 'development' ?
            processModes.WATCH_FILES : processModes.KEEP_ALIVE);

    this.workers = new SortedMap();
    this.dispatcher = new MasterDispatcher(this);

    this.initialized = false;
    this.started = false;
}

Master.prototype = new function () {

    this.init = function () {
        if (this.initialized) {
            return;
        }

        initMasterListeners.call(this);
        monitorProcesses.call(this);

        if (this.processMode === processModes.WATCH_FILES &&
                    process.platform !== 'win32') {
            watchFiles.call(this);
        }

        this.initialized = true;
    };

    function initMasterListeners() {
        /* jshint validthis: true */

        var self = this;

        // Don't bother with graceful shutdown for win32
        if (process.platform !== 'win32') {
            process.on('SIGTERM', function handleSIGTERM() {
                self.startShutdown();
            });
        }

        cluster.on('exit', function handleWorkerExit(worker) {
            var pid = worker.process.pid.toString();
            handleWorkerExit.call(self, pid);
        });
    }

    function monitorProcesses() {
        /* jshint validthis: true */

        // Stop spawning new worker-processes when shutting down
        if (this.processMode === processModes.SHUTDOWN) {
            return;
        }

        var self = this,
            config = this.config.cluster,
            now = Date.now();

        this.workers.each(function iterateWorkers(workerData, pid) {
            if (!workerData.started) {
                return;
            }

            var worker = workerData.worker,
                killWorker = false;

            // Rotate processes
            if (config.rotateWorkers) {
                // If the process takes too long to retire, just kill it
                if (workerData.retired) {
                    if (!workerData.killed && now > workerData.retireAt + config.rotationTimeout) {
                        self.warning('Process ' + pid +
                                ' took too long to retire, killing process.');
                        killWorker = true;
                    }

                } else {
                    // If this worker is past its freshness date, retire it
                    if (now > workerData.retireAt) {
                        self.info('Rotating ' + pid + ', killing process.');
                        workerData.retired = true;
                        self.message(pid, {
                            action: 'retire'
                        });
                    }
                }

                // Kill if process hasn't called back in a while
                if (now > workerData.heartbeatAt + config.heartbeatTimeout) {
                    if (!workerData.killed) {
                        killWorker = true;
                        self.warning('No current heartbeat from ' + pid + ', killing process.');
                    }
                }
            }

            // Kill, manual-restart from code-changes in dev-mode
            if (self.processMode === processModes.WATCH_FILES) {
                if (!workerData.killed) {
                    killWorker = true;
                    self.info('Code changed, killing ' + pid + ', cycling...');
                }
            }

            if (killWorker) {
                self.killWorker(worker.process.pid);
            }
        });

        createWorkers.call(this);

        // Polling loop
        if (this.processMode === processModes.KEEP_ALIVE) {
            setTimeout(function delayMonitoringProcesses() {
                monitorProcesses.call(self);
            }, 5000);
        }
    }

    function watchFiles() {
        /* jshint validthis: true */
    }

    function createWorkers() {
        /* jshint validthis: true */

        var configCount = this.config.cluster.workers,
            currentCount = (this.processMode === processModes.WATCH_FILES ?
                    0 : this.workers.length),
            neededCount = configCount - currentCount;

        if (neededCount) {
            this.info('Creating ' + neededCount +
                    ' worker process' + (neededCount > 1 ? 'es.' : '.'));
            while (neededCount--) {
                createWorker.call(this);
            }
            if (this.started) {
                startWorkers.call(this);
            }
        }
    }

    function createWorker() {
        /* jshint validthis: true */

        var worker = cluster.fork(),
            pid = worker.process.pid.toString(),
            workerData = new WorkerData(worker);

        this.workers.put(pid, workerData);
        initWorkerListeners.call(this, worker);
        this.message(pid, {
            action: 'config',
            data: this.config
        });
    }

    function initWorkerListeners(worker) {
        /* jshint validthis: true */

        var self = this;
        worker.on('message', function receiveWorkerMessage(data) {
            receiveMessage.call(self, data);
        });
    }

    this.start = function () {
        if (!this.initialized) {
            this.init();
        }

        startWorkers.call(this);
    };

    function startWorkers() {
        /* jshint validthis: true */

        var self = this,
            notStartedCount = 0;

        this.workers.each(function iterateWorkers(workerData) {
            if (!workerData.started) {
                notStartedCount++;
            }
        });

        this.started = true;

        var rotationInterval = this.config.cluster.rotationInterval,
            staggerInterval = rotationInterval / notStartedCount,
            retireAt = Date.now() + rotationInterval;

        this.workers.each(function iterateWorkers(workerData, pid) {
            if (workerData.started) {
                return;
            }

            workerData.started = true;
            workerData.heartbeatAt = Date.now();
            workerData.retireAt = retireAt;

            self.message(pid, {
                action: 'start'
            });

            retireAt -= staggerInterval;
        });
    }

    this.message = function (pid, msg) {
        var workerData = this.workers.get(pid.toString());
        if (!workerData || !workerData.worker) {
            return;
        }

        try {
            workerData.worker.send(msg);
        } catch (err) {
            this.killWorker(pid);
        }
    };

    function receiveMessage(msg) {
        /* jshint validthis: true */

        if (typeof msg !== 'object' || !msg.action) {
            return;
        }

        this.dispatcher.emit(msg.action, msg);
    }

    this.startShutdown = function () {
        var self = this;
        this.processMode = processModes.SHUTDOWN;
        this.notice('Graceful shutdown...');
        this.workers.eachKey(function iterateWorker(pid) {
            self.message(pid, {
                action: 'shutdown'
            });
        });
    };

    this.shutDown = function (code) {
        process.exit(code);
    };

    this.killWorker = function (pid) {
        var self = this,
            workerData = this.workers.get(pid);

        workerData.killed = true;
        process.kill(pid);

        // handleWorkerExit() gets called on the process die/exit event.
        // If for some reason it doesn't get called, we still want
        // the process removed from the list of active processes
        setTimeout(function checkWorkerExit() {
            handleWorkerExit.call(self, pid);
        }, 20000);
    };

    function handleWorkerExit(pid) {
        /* jshint validthis: true */

        var workerData = this.workers.get(pid);
        if (!workerData) {
            return;
        }

        if (!workerData.killed) {
            this.error('Worker ' + pid + ' died.');
        }
        this.workers.remove(pid);

        // As each worker exits, check to see if all processes
        // have exited and we can kill the master process
        if (this.processMode === processModes.SHUTDOWN) {
            checkShutdown.call(this);
        }
    }

    function checkShutdown() {
        /* jshint validthis: true */

        if (!this.workers.length) {
            this.shutDown();
        }
    }

};

exports.processModes = processModes;
exports.WorkerData = WorkerData;
exports.Master = Master;

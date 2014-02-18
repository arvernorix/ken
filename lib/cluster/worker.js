'use strict';

var http = require('http'),

    shien = require('shien'),
    when = require('when'),

    WorkerDispatcher = require('./dispatcher/worker').Dispatcher;

function Worker(isClustered, logger, cfg) {
    shien.enhance(this, logger);

    this.isClustered = isClustered;
    this.config = cfg || {};

    this.dispatcher = new WorkerDispatcher(this);
}

Worker.prototype = new function () {

    this.init = function () {
        var deferred = when.defer();

        this.postConfigure = function () {
            deferred.resolve(this);
        };

        initWorkerListener.call(this);
        createServer.call(this);

        return deferred.promise;
    };

    function initWorkerListener() {
        /* jshint validthis: true */

        var self = this;

        process.on('message', function handleMessageEvent(msg) {
            receiveMessage.call(self, msg);
        });
    }

    function createServer() {
        /* jshint validthis: true */
        this.server = http.createServer();
    }

    this.start = function () {
        var self = this,
            deferred = when.defer();

        this.server.listen(this.config.port, function listenedSuccessfully() {
            if (self.isClustered) {
                startHeartbeat.call(self);
            }
            deferred.resolve(self);
        });

        return deferred.promise;
    };

    this.configure = function (cfg) {
        shien.merge(this.config, cfg);
        this.postConfigure();
    };

    this.message = function (msg) {
        // Add process ID for each sent message
        if (typeof msg === 'object') {
            msg.pid = process.pid.toString();
        }
        process.send(msg);
    };

    function receiveMessage(msg) {
        /* jshint validthis: true */

        if (typeof msg !== 'object' || !msg.action) {
            return;
        }

        this.dispatcher.emit(msg.action, msg);
    }

    this.retire = function () {
        var self = this;

        shutDownCleanly.call(this, this.config.cluster.rotationTimeout)
            .then(function shutDownSuccessfully() {
                self.message({
                    action: 'readyForRetirement'
                });
            });
    };

    this.shutdown = function () {
        var self = this;

        shutDownCleanly.call(this, this.config.cluster.gracefulShutdownTimeout)
            .then(function shutDownSuccessfully() {
                self.message({
                    action: 'readyForShutdown'
                });
            });
    };

    function shutDownCleanly(timeout) {
        /* jshint validthis: true */

        var self = this,
            deadline = Date.now() + timeout,
            deferred = when.defer();

        this.server.on('close', function listenToServerClosing() {
            closeInflightEntries.call(self, deadline, deferred.resolve);
        });

        try {
            this.server.close();
        }
        catch (e) {
        }

        return deferred.promise;
    }

    function closeInflightEntries(deadline, cb) {
        /* jshint validthis: true */

        var self = this,
            inflight = this.server.inflight,
            ready = true;

        if (inflight.count) {
            ready = (Date.now() > deadline); // has timed out
            if (ready) {
                inflight.each(function iterateInflightEntries(entry) {
                    try {
                        if (entry.response) {
                            entry.response.end();
                        }
                    } catch (e) {}
                });
            }
        }

        if (ready) {
            cb();

        } else {
            // Poll to see until all in-flight requests complete or
            // we pass the timeout
            setTimeout(function checkInflightEntries() {
                closeInflightEntries.call(self, deadline, cb);
            }, 2000);
        }
    }

    function startHeartbeat() {
        /* jshint validthis: true */

        var self = this;

        setInterval(function sendHeartbeat() {
            self.message({
                action: 'heartbeat'
            });
        }, self.config.cluster.heartbeatInterval);
    }

};

exports.Worker = Worker;

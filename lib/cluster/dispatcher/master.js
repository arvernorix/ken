'use strict';

var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function Dispatcher(master) {

    var slice = Array.prototype.slice;

    this.on('readyForRetirement', function handleRetirementEvent(msg) {
        master.killWorker(msg.pid);
    });

    this.on('readyForShutdown', function handleShutdownEvent(msg) {
        master.notice('Killing worker for graceful shutdown.', { pid: msg.pid });
        this.killWorker(msg.pid);
    });

    this.on('log', function handleLogEvent(msg) {
        msg.data.length = msg.length;

        var args = slice.call(msg.data);
        args.push({ pid: msg.pid });

        master[msg.level].apply(master, args);
    });

    this.on('heartbeat', function handleHeartbeatEvent(msg) {
        var workerData = master.workers.get(msg.pid);
        if (workerData) {
            workerData.heartbeatAt = Date.now();
        }
    });

}

util.inherits(Dispatcher, EventEmitter);

exports.Dispatcher = Dispatcher;

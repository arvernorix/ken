'use strict';

var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function Dispatcher(worker) {

    this.on('config', function handleConfigurationEvent(msg) {
        worker.configure(msg.data);
    });

    this.on('start', function handleStartEvent() {
        worker.start().done();
    });

    this.on('retire', function handleRetirementEvent() {
        worker.retire().done();
    });

    this.on('shutdown', function handleShutdownEvent() {
        worker.shutdown().done();
    });

}

util.inherits(Dispatcher, EventEmitter);

exports.Dispatcher = Dispatcher;

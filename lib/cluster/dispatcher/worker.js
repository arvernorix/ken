'use strict';

var EventEmitter = require('events').EventEmitter,
    shien = require('shien');

function Dispatcher(worker) {

    this.on('config', function handleConfigurationEvent(msg) {
        worker.configure(msg.data);
    });

    this.on('start', function handleStartEvent() {
        worker.start();
    });

    this.on('retire', function handleRetirementEvent() {
        worker.retire();
    });

    this.on('shutdown', function handleShutdownEvent() {
        worker.shutdown();
    });

}

Dispatcher.prototype = new EventEmitter;

exports.Dispatcher = Dispatcher;

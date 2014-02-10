'use strict';

var cluster = require('cluster'),

    shien = require('shien'),
    SortedMap = shien.SortedMap,

    when = require('when');

function Master(cfg) {
    this.config = cfg || {};
    this.workers = new SortedMap();
}

Master.prototype = new function () {

    this.initCluster = function () {
        this.isMaster = cluster.isMaster;

        if (this.isMaster) {
            this.createWorkers();
            return when.resolve(this);

        } else {
            var Worker = require('./worker').Worker,
                worker = new Worker(this.config);
            return worker.initCluster()
                .yield(worker);
        }
    };

    this.startCluster = function () {
    };

    this.createWorkers = function () {

        function createWorker() {

            function addMessageListener(worker) {
                worker.on('message', function (data) {
                    self.receiveMessage(data);
                });
            }

            var worker = cluster.fork();
            addMessageListener(worker);
        }

        var self = this,
            config = this.config;

        for (var i = 0; i < config.cluster.workers; i++) {
            createWorker();
        }
    };

    this.sendMessage = function (workerId, data) {
        if (data && data === Object(data)) { // Add process ID for each sent message
            data.pid = process.pid.toString();
        }
        process.send(data);
    };

    this.receiveMessage = function (data) {
        console.log(data);
    };

};

exports.Master = Master;

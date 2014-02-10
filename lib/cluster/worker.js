'use strict';

var http = require('http'),
    when = require('when');

function Worker(cfg) {
    this.config = cfg || {};
}

Worker.prototype = new function () {

    this.initCluster = function () {

        function createServer() {
            self.server = http.createServer();
        }

        function addMessageListener() {
            process.on('message', function (data) {
                self.receiveMessage(data);
            });
        }

        function startHeartBeat() {
            setInterval(
                function () {
                    self.sendMessage({
                        method: 'heartbeat'
                    });
                },
                config.cluster.heartbeatInterval
            );
        }

        var self = this,
            config = this.config;

        createServer();

        if (config.cluster.clustered) {
            addMessageListener();
            startHeartBeat();
        }

        return when.resolve(this);
    };

    this.startCluster = function () {
        this.server.listen(this.config.port);
    };

    this.sendMessage = function (data) {
        if (data && data === Object(data)) { // Add process ID for each sent message
            data.workerId = process.pid.toString();
        }
        process.send(data);
    };

    this.receiveMessage = function (data) {
        console.log(data);
    };

};

exports.Worker = Worker;

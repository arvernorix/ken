'use strict';

var when = require('when');

function ClusterLoader() {
}

ClusterLoader.prototype = new function () {

    this.loadCluster = function (cfg) {
        var c = cfg || {};

        c.cluster || (c.cluster = {});
        c.cluster.workers || (c.cluster.workers = 1);

        if (c.cluster.workers === 'max') {
            c.cluster.workers = require('os').cpus().length;
        }

        c.cluster.clustered = (c.cluster.workers > 1);

        try {
            var Instance = (c.cluster.clustered ?
                    require('./master').Master :
                    require('./worker').Worker),
                instance = new Instance(c);
            return instance.initCluster();

        } catch (err) {
            return when.reject(err);
        }
    };

};

module.exports = new ClusterLoader;

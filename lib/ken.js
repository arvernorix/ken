'use strict';

var EventEmitter = require('events').EventEmitter,
    shien = require('shien'),
    when = require('when');

if (global._ken) {
    return (module.exports = global._ken);
}

function Ken() {
}

Ken.prototype = new function () {

    shien.enhance(this, new EventEmitter);

    function loadConfiguration(opts) {
        /* jshint validthis: true */

        var self = this,
            configLoader = require('./config/loader');
        return configLoader.load(this.env)
            .tap(function (config) {
                self.config = shien.merge(config, opts);
            });
    }

    function loadCluster() {
        /* jshint validthis: true */

        var self = this,
            clusterLoader = require('./cluster/loader');
        return clusterLoader.loadCluster(this.config)
            .tap(function (instance) {
                shien.enhance(self, instance);
            });
    }

    function loadApplication() {
        /* jshint validthis: true */

        if (this.isMaster) {
            return when.resolve(this);
        }
        var App = require('./app').App,
            app = new App;
        shien.enhance(this, app);
        return this.initApp();
    }

    this.init = function (env, opts) {
        if (typeof env === 'object') {
            opts = env;
            env = null;
        }

        // TODO: Set environment from CLI
        this.env = env || process.env.NODE_ENV || 'development';
        process.env.NODE_ENV = this.env;

        return loadConfiguration.call(this, opts)
            .then(loadCluster.bind(this))
            .then(loadApplication.bind(this))
            .yield(this);
    };

    this.start = function (env, opts) {
        return this.init(env, opts)
            .tap(function (ken) {
                ken.startCluster();
            });
    };

};

module.exports = global._ken = new Ken;

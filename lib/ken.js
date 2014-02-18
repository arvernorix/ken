'use strict';

var cluster = require('cluster'),
    os = require('os'),

    shien = require('shien'),
    when = require('when'),

    configLoader = require('./config/loader'),

    Logger = require('./log').Logger,

    Master = require('./cluster/master').Master,
    Worker = require('./cluster/worker').Worker;

function Ken() {
}

Ken.prototype = new function () {

    var defineProperty = Object.defineProperty;

    function define(obj, prop, value) {
        defineProperty(obj, prop, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: value
        });
    }

    function expose(dest, src, props) {
        props.forEach(function iterateProperties(prop) {
            dest[prop] = src[prop];
        });
        return dest;
    }

    function loadConfiguration(opts) {
        /* jshint validthis: true */

        var self = this;

        return when.resolve(this.isMaster ? configLoader.load(this.env, opts) : {})
            .tap(function configureFullHostname(cfg) {
                // TODO: What about worker?
                // TODO: Set different port for worker in `test` mode?
                if (!cfg.fullHostname) {
                    cfg.fullHostname = 'http://' + cfg.host + ':' + cfg.port;
                }
            })
            .then(function integrateConfiguration(cfg) {
                self.config = cfg || {};
            });
    }

    function loadCluster() {
        /* jshint validthis: true */

        var self = this;

        return when.promise(function configureCluster(resolve) {
                if (self.isMaster) {
                    var c = self.config;

                    c.cluster || (c.cluster = {});
                    c.cluster.workers || (c.cluster.workers = 1);

                    if (c.cluster.workers === 'max') {
                        c.cluster.workers = os.cpus().length;
                    }

                    self.clustered = (c.cluster.workers > 1);

                } else {
                    self.clustered = true;
                }

                resolve();
            })
            .then(function loadLogger() {
                return new Logger(self.isMaster, self.config);
            })
            .then(function integrateLogger(logger) {
                shien.enhance(self, logger);
                return logger;
            })
            .then(function loadCluster(logger) {
                var cluster = (self.isMaster && self.clustered ?
                            new Master(logger, self.config) :
                            new Worker(self.clustered, logger, self.config)),
                    ret = cluster.init();

                if (self.isMaster && !self.clustered) {
                    cluster.configure();
                }

                return when.resolve(ret)
                    .yield(cluster);
            })
            .then(function integrateCluster(cluster) {
                define(self, 'cluster', cluster);
                return cluster;
            })
            .then(function exposeCluster(cluster) {
                expose(self, cluster, [ 'server', 'message' ]);
            });
    }

    function loadApplication() {
        /* jshint validthis: true */

        if (this.server) {
            this.server.inflight = new shien.SortedMap;

            this.server.on('request', function (req, res) {
                res.end('[' + process.pid.toString() + '] Hello world');
            });
        }
    }

    this.init = function (env, opts) {
        if (typeof env === 'object') {
            opts = env;
            env = null;
        }

        // TODO: Set environment from CLI
        this.env = env || process.env.NODE_ENV || 'development';
        process.env.NODE_ENV = this.env;

        this.isMaster = cluster.isMaster;

        return loadConfiguration.call(this, opts)
            .then(loadCluster.bind(this))
            .then(loadApplication.bind(this))
            .yield(this);
    };

    this.start = function (env, opts) {
        var self = this;

        return this.init(env, opts)
            .then(function initializedSuccessfully() {
                if (!self.isMaster) {
                    return self;
                }

                return when.resolve(self.cluster.start())
                    .then(function startedSuccessfully() {
                        self.notice('Listening on %s', self.config.fullHostname);
                        return self;
                    });
            });
    };

};

module.exports = new Ken;

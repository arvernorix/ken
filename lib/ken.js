/* jshint -W079 */

'use strict';

var cluster = require('cluster'),
    os = require('os'),

    shien = require('shien'),
    when = require('when'),

    Config = require('./config').Config,

    Logger = require('./log').Logger,

    Master = require('./cluster/master').Master,
    Worker = require('./cluster/worker').Worker,

    App = require('./app').App,

    CONFIG_PATH = 'config/config';

function Ken() {
}

Ken.prototype = new function () {

    function loadConfiguration(opts) {
        /* jshint validthis: true */

        var self = this,
            cfg = {};

        if (this.master) {
            cfg = new Config(this.env, CONFIG_PATH);
            shien.merge(cfg, opts);
        }

        return when.resolve(cfg)
            .tap(function configureFullHostname(cfg) {
                // TODO: What about worker with different port?
                // TODO: Set different port for worker in `test` mode?
                if (!cfg.fullHostname) {
                    cfg.fullHostname = 'http://' + cfg.host + ':' + cfg.port;
                }
            })
            .then(function integrateConfiguration(cfg) {
                shien.define(self, 'config', cfg, true);
            });
    }

    function loadCluster() {
        /* jshint validthis: true */

        var self = this;

        // Cluster options

        if (this.master) {
            var c = this.config;

            c.cluster || (c.cluster = {});
            c.cluster.workers || (c.cluster.workers = 1);

            if (c.cluster.workers === 'max') {
                c.cluster.workers = os.cpus().length;
            }

            this.clustered = (c.cluster.workers > 1);

        } else {
            this.clustered = true;
        }

        // Create logger

        var logger = new Logger(self.master, self.config);

        shien.define(this, 'logger', logger);
        shien.enhance(this, logger);

        // Create and initialize cluster

        var cluster = (self.master && self.clustered ?
                    new Master(logger, self.config) :
                    new Worker(self.clustered, logger, self.config)),

            ret = cluster.init();

        if (self.master && !self.clustered) {
            cluster.configure();
        }

        return when.resolve(ret)
            .then(function integrateCluster() {
                shien.define(self, 'cluster', cluster);
                shien.expose(self, cluster, [ 'message' ]);
            });
    }

    function loadApplication() {
        /* jshint validthis: true */

        var self = this,
            isWorkerInstance = (self.cluster instanceof Worker),
            app = new App(this.logger, this.config);

        if (isWorkerInstance) {
            // In order that worker's app can use logger
            shien.expose(app, self.cluster, [ 'message' ]);
        }

        return when.resolve(app.init())
            .then(function integrateApp() {
                shien.define(self, 'app', app);
                shien.expose(self, app, [ 'server', 'rack', 'require' ]);

                // Tell cluster it's ready to start server
                if (isWorkerInstance) {
                    self.cluster.lift(app.server);
                }
            });
    }

    this.init = function (env, opts) {
        if (typeof env === 'object') {
            opts = env;
            env = null;
        }

        // TODO: Set environment from CLI
        this.env = env || process.env.NODE_ENV || 'development';
        process.env.NODE_ENV = this.env;

        this.master = cluster.isMaster;

        return loadConfiguration.call(this, opts)
            .then(loadCluster.bind(this))
            .then(loadApplication.bind(this))
            .yield(this);
    };

    this.start = function (env, opts) {
        var self = this;

        return this.init(env, opts)
            .then(function initializedSuccessfully() {
                if (!self.master) {
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

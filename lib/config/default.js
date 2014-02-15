'use strict';

function DefaultConfig() {
}

DefaultConfig.prototype = new function () {

    this.get = function (env, index) {
        return {
            host: '0.0.0.0',
            port: 1512,

            log: {
                type: 'console'
            },

            cluster: {
                workers: (env === 'development' ? 1 : 'max'),

                // Use worker-process rotation?
                rotateWorkers: true,
                // How long between full rotations
                rotationInterval: 2 * 60 * 60 * 1000,
                // How long to wait for in-flight requests before rotating
                rotationTimeout: 5 * 60 * 1000,

                // How long to wait for in-flight requests before killing
                gracefulShutdownTimeout: 30 * 1000,

                // How long between heartbeat calls from the worker to the master
                heartbeatInterval: 5 * 1000,
                // How old a heartbeat-timestamp can be before assuming a worker is hung,
                // and needs to be killed
                heartbeatTimeout: 20 * 1000,
            },

            mongo: {
                host: 'localhost',
                port: 27017,
                db: 'ken' + (env === 'production' ? '' : '_' + env)
            },

            redis: {
                host: 'localhost',
                port: 6379,
                db: 4 + index
            },

            elastic: {
                host: 'localhost',
                port: 9200
            },

            cookie: {
                secret: 'mpOYqWz4W6gqYv2wIBLDJU4lXXPxfYTH'
            },

            session: {
                key: 'ken.sid',
                secret: '0QLoJca2snJBGxKvJvrn6VX19O93DxF8',
                redisPrefix: 'ken:sid:'
            },

            social: {
                facebook: {
                    clientId: 'Too bad, we cannot have a random client ID!',
                    clientSecret: 'And we cannot have a random client secret too.'
                }
            }
        };
    };

};

module.exports = new DefaultConfig;

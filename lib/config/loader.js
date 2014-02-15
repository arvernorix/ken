'use strict';

var path = require('path'),
    shien = require('shien'),
    when = require('when');

function Config() {
}

Config.prototype = new function () {

    this.load = function (env, opts) {
        env = env || 'development';

        return when.resolve()
            .then(function loadConfiguration() {
                var baseConfig = require('./base'),
                    configPath = path.join(process.cwd(), 'config/config'),
                    userConfig;

                try {
                    userConfig = require(configPath);
                } catch (err) {
                    if (err.code !== 'MODULE_NOT_FOUND') {
                        throw err;
                    }
                }

                if (typeof userConfig === 'function') {
                    userConfig.call(baseConfig);
                }

                return baseConfig.get(env);
            })
            .then(function loadConfigurationOptions(cfg) {
                return shien.merge(cfg, opts);
            });
    };

};

module.exports = new Config;

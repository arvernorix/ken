'use strict';

var path = require('path'),
    when = require('when');

function ConfigLoader() {
}

ConfigLoader.prototype = new function () {

    this.load = function (env) {
        env = env || 'development';

        try {
            var configs = require('../config/base'),
                cwd = process.cwd(),
                userDefinedConfig;

            try {
                userDefinedConfig = require(path.join(cwd, 'config/config'));
            } catch (err) {
                if (err.code !== 'MODULE_NOT_FOUND') {
                    throw err;
                }
            }

            userDefinedConfig && userDefinedConfig.call(configs);

            return when.resolve(configs.get(env));

        } catch (err) {
            return when.reject(err);
        }
    };

};

module.exports = new ConfigLoader;

'use strict';

var path = require('path'),

    shien = require('shien'),
    when = require('when'),

    defaultCfg = require('./default'),

    ENVIRONMENTS = [
        'development',
        'test',
        'stage',
        'production'
    ];

function Config(env, userCfgPath) {
    this.configs = {};

    // Load user configuration
    if (env) {
        if (userCfgPath) {
            userCfgPath = path.join(process.cwd(), userCfgPath);

            var userCfg;

            try {
                userCfg = require(userCfgPath);
            } catch (err) {
                if (err.code !== 'MODULE_NOT_FOUND') {
                    throw err;
                }
            }

            if (typeof userCfg === 'function') {
                userCfg.call(this);
            }
        }

        return this.get(env);
    }
}

Config.prototype = new function () {

    function checkEnvironment(env) {
        if (ENVIRONMENTS.indexOf(env) < 0) {
            throw new Error('Bad environment!', env);
        }
    }

    function getDefaultConfiguration(env) {
        return defaultCfg.get(env, ENVIRONMENTS.indexOf(env));
    }

    function configure(env, cfg) {
        /* jshint validthis: true */

        checkEnvironment(env);

        if (!this.configs[env]) {
            this.configs[env] = {};
        }

        if (typeof cfg === 'undefined') {
            return shien.merge(getDefaultConfiguration(env), this.configs[env]);
        }

        shien.merge(this.configs[env], cfg);
    }

    this.get = function (env) {
        return configure.call(this, env);
    };

    this.set = function (env, cfg) {
        return configure.call(this, env, cfg);
    };

    this.inherit = function (env, targetEnv, cfg) {
        checkEnvironment(env);
        checkEnvironment(targetEnv);
        this.set(env, this.configs[targetEnv]);
        this.set(env, cfg);
    };

};

exports.environments = ENVIRONMENTS;
exports.Config = Config;

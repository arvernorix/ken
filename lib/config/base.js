'use strict';

var shien = require('shien'),
    defaultConfig = require('./default');

function BaseConfig() {
}

BaseConfig.prototype = new function () {

    var environments = [
            'development',
            'test',
            'stage',
            'production'
        ],

        configs = {};

    function checkEnvironment(env) {
        if (environments.indexOf(env) < 0) {
            throw new Error('Bad environment!', env);
        }
    }

    function getDefaultConfiguration(env) {
        return defaultConfig.get(env, environments.indexOf(env));
    }

    function configure(env, cfg) {
        checkEnvironment(env);

        if (!configs[env]) {
            configs[env] = {};
        }

        if (typeof cfg === 'undefined') {
            return shien.merge(getDefaultConfiguration(env), configs[env]);
        }

        shien.merge(configs[env], cfg);
    }

    this.get = function (env) {
        return configure(env);
    };

    this.set = function (env, cfg) {
        return configure(env, cfg);
    };

    this.inherit = function (env, targetEnv, cfg) {
        checkEnvironment(env);
        checkEnvironment(targetEnv);
        this.set(env, configs[targetEnv]);
        this.set(env, cfg);
    };

};

module.exports = new BaseConfig;

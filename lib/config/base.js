'use strict';

var shien = require('shien'),
    defaultConfig = require('./default');

function BaseConfig() {
    this.configs = {};
}

BaseConfig.prototype = new function () {

    var environments = [
            'development',
            'test',
            'stage',
            'production'
        ];

    function checkEnvironment(env) {
        if (environments.indexOf(env) < 0) {
            throw new Error('Bad environment!', env);
        }
    }

    function getDefaultConfiguration(env) {
        return defaultConfig.get(env, environments.indexOf(env));
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

module.exports = new BaseConfig;

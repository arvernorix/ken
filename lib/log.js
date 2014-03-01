'use strict';

var winston = require('winston'),

    logLevels = [
        { level: 'access', color: 'blue' },
        { level: 'debug', color: 'magenta' },
        { level: 'info', color: 'green' },
        { level: 'notice', color: 'cyan' },
        { level: 'warning', color: 'yellow' },
        { level: 'error', color: 'red' },
        { level: 'critical', color: 'red' },
        { level: 'alert', color: 'red' },
        { level: 'emergency', color: 'red' }
    ];

function Logger(isMaster) {
    var logger,
        opts = { levels: {}, colors: {} };

    logLevels.forEach(function iterateLogLevels(v, i) {
        opts.levels[v.level] = i;
        opts.colors[v.level] = v.color;

        if (isMaster) {
            this[v.level] = function () {
                return logger[v.level].apply(logger, arguments);
            };

        } else {
            this[v.level] = function () {
                return this.message({
                    action: 'log',
                    level: v.level,
                    data: arguments,
                    length: arguments.length
                });
            };
        }
    }, this);

    logger = new winston.Logger(opts);
    logger.add(winston.transports.Console, { colorize: true });
}

Logger.prototype = new function () {

    var slice = Array.prototype.slice;

    this.log = function (level) {
        if (typeof this[level] !== 'function') {
            throw new Error('Log level `' + level + '` does not exist!');
        }

        var args = slice.call(arguments);
        args.shift();

        this[level].apply(this, args);
    };

};

exports.logLevels = logLevels;
exports.Logger = Logger;

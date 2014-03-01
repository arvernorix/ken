'use strict';

var shien = require('shien'),

    Key = require('./part/key').Key,
    Glob = require('./part/glob').Glob;

function Route() {
    return this.match.apply(this, arguments);
}

Route.prototype = new function () {

    var // Matches keys
        KEY_REGEX = /:([a-zA-Z_][\w\-]*)/,

        // Matches globs
        GLOB_REGEX = /\*([a-zA-Z_][\w\-\/]*)/,

        // Optional group (the part in parentheses)
        OGRP_REGEX = /\(([^)]+)\)/,

        PARTS_REGEX = new RegExp(
            '\\([^)]+\\)|' +           // OGRPS
            ':[a-zA-Z_][\\w\\-]*|' +    // KEYS
            '\\*[a-zA-Z_][\\w\\-]*|' +  // GLOBS
            '[\\w\\-_\\\\\\/\\.]+',   // TEXT
            'g'
        );

    this.match = function (path, method, optional) {
        if (typeof path !== 'string') {
            throw new Error('Path must be a string!');
        }

        this.path = path;
        this.method = method;
        this.optional = optional;

        this.parts = [];
        this.params = {};

        do {
            var part = PARTS_REGEX.exec(path);
            if (!part) {
                break;
            }

            this.parts.push(part);
        } while (1);

        this.parts.forEach(function iterateParts(part, i) {
            if (OGRP_REGEX.test(part)) { // Optional group
                this.parts[i] = new Route(OGRP_REGEX.exec(part)[1], null, true);
            } else if (KEY_REGEX.test(part)) { // Key
                this.parts[i] = new Key(KEY_REGEX.exec(part)[1]);
            } else if (GLOB_REGEX.test(part)) { // Glob
                this.parts[i] = new Glob(GLOB_REGEX.exec(part)[1]);
            } else { // String
                this.parts[i] = String(part);
            }
        }, this);

        return this;
    };

    this.pattern = function () {
        var ret = '';

        this.parts.forEach(function iterateParts(part) {
            ret += (typeof part.pattern === 'function' ?
                    part.pattern() : shien.regex.escape(part));
        });

        return '(' + ret + ')' + (this.optional ? '?' : '');
    };

    this.test = function (s) {
        if (!this.regex) {
            this.regex = new RegExp('^' + this.pattern() + '(\\?.*)?$');
        }

        return this.regex.test(s);
    };

    this.to = function (endPoint, extraParams) {
        if (typeof endPoint !== 'string') {
            throw new Error('End point must be a string!');
        }

        endPoint = endPoint.split('.');
        if (!Array.isArray(endPoint) || endPoint.length !== 2) {
            throw new Error('End point syntax must be in the form controller.action');
        }

        this.params.controller = endPoint[0];
        this.params.action = endPoint[1];

        shien.assign(this.params, extraParams);

        return this;
    };

    this.where = function (conds) {
        if (typeof conds !== 'object') {
            throw new Error('Conditions must be an object!');
        }

        this.parts.forEach(function iterateParts(part) {
            if (typeof part.where === 'function') {
                part.where(conds);
            }
        });

        return this;
    };

    this.stringify = function (params) {
        var urlParts = [],
            part,

            len,
            i;

        for (i = 0, len = this.parts.length; i < len; i++) {
            part = this.parts[i];

            if (part instanceof Key || part instanceof Glob) {
                var param = part.url(params[part.name]);

                if (param) {
                    urlParts.push(param);
                    delete params[part.name];

                } else if (this.optional) {
                    return false;
                }

            } else {
                urlParts.push(part);
            }
        }

        for (i = urlParts.length - 1; i >= 0; i--) {
            part = urlParts[i];

            if (part instanceof Route) {
                part = part.stringify(params);

                if (part) {
                    params = part[1];
                    urlParts[i] = part = part[0];

                } else {
                    delete urlParts[i];
                }
            }
        }

        for (var prop in this.params) {
            if (this.params.hasOwnProperty(prop)) {
                delete params[prop];
            }
        }

        return [ urlParts.join(''), params ];
    };

    this.keysAndRoutes = function () {
        return this.parts.filter(function filterParts(part) {
            return (part instanceof Key ||
                    part instanceof Glob ||
                    part instanceof Route);
        });
    };

    this.keys = function () {
        return this.parts.filter(function filterParts(part) {
            return (part instanceof Key ||
                    part instanceof Glob);
        });
    };

    this.parse = function (path, method) {
        var params = { method: method },
            head = (method === 'HEAD');

        if (head) {
            params.method = 'GET';
        }

        if (this.method && params.method &&
                this.method !== params.method) {
            return false;
        }

        if (!this.test(path)) {
            return false;
        }

        shien.assign(params, this.params);

        if (!params.method) {
            params.method = this.method;
        }

        var parts = new RegExp('^' + this.pattern() + '$')
                .exec(path)
                .slice(2),
            part,

            keysAndRoutes = this.keysAndRoutes(),
            segment,

            pairings = [],
            pair,

            len,
            i,
            j;

        for (i = 0, j = 0, len = keysAndRoutes.length; i < len; i++, j++) {
            part = parts[j];
            segment = keysAndRoutes[i];

            if (!segment.test(part)) {
                j++;
                continue;
            }

            pairings.push([ part, segment ]);

            if (segment instanceof Route) {
                j += part.match(segment.pattern()).slice(2).length || 0;
            }
        }

        for (i = pairings.length - 1; i >= 0; i--) {
            pair = pairings[i];
            part = pair[0];
            segment = pair[1];

            if (segment instanceof Key || segment instanceof Glob) {
                params[segment.name] = part;
            } else { // instanceof Route
                shien.assign(params, segment.parse(part, method));
            }
        }

        if (head) {
            params.method = 'HEAD';
        }

        return params;
    };

    this.toString = function () {
        var s = this.parts.reduce(function reduceParts(s, part) {
            return (s ? s : '') + part.toString();
        });

        if (this.optional) {
            return '(' + s + ')';
        }

        return s;
    };

};

exports.Route = Route;

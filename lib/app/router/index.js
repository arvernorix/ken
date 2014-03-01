'use strict';

var path = require('path'),
    qs = require('qs'),

    Route = require('./route').Route,

    METHODS = [ 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS' ];

function Router(routesPath) {
    this.routes = [];

    // Load user routes
    if (routesPath) {
        routesPath = path.join(process.cwd(), routesPath);

        var userRouter;

        try {
            userRouter = require(routesPath);
        } catch (err) {
            if (err.code !== 'MODULE_NOT_FOUND') {
                throw err;
            }
        }

        if (typeof userRouter === 'function') {
            userRouter.call(this);
        }
    }
}

Router.prototype = new function () {

    var METHODS_REGEX = new RegExp('^(' + METHODS.join('|') + ')$', 'i');

    this.match = function (path, method) {
        if (typeof method === 'string') {
            method = method.toUpperCase();
        }

        if (method && !METHODS_REGEX.test(method)) {
            throw new Error('Method must be one of `' + METHODS.join('`, `') + '`');
        }

        var route = new Route(path, method);
        this.routes.push(route);

        return route;
    };

    METHODS.forEach(function (method) {
        if (method === 'HEAD') {
            return;
        }

        this[method.toLowerCase()] = function (path) {
            return this.match(path, method);
        };
    }, this);

    this.first = function (path, method) {
        for (var i = 0, len = this.routes.length; i < len; i++) {
            var params = this.routes[i].parse(path, method);
            if (params) {
                return params;
            }
        }

        return false;
    };

    this.all = function () {
        var args = arguments,
            ret = [];

        this.routes.forEach(function iterateRoutes(route) {
            var params = route.parse.apply(route, args);
            if (params) {
                ret.push(params);
            }
        });

        return ret;
    };

    this.url = function (params, addQueryString) {
        var url = false;

        for (var i = 0, len = this.routes.length; i < len; i++) {
            var route = this.routes[i];

            if ((route.params.controller && route.params.controller !== params.controller) ||
                    (route.params.action && route.params.action !== params.action)) {
                continue;
            }

            url = route.stringify(params);
            if (url) {
                break;
            }
        }

        if (!url) {
            return false;
        }

        if (addQueryString) {
            var queryString = qs.stringify(url[1]);
            if (queryString.length) {
                return url[0] + '?' + queryString;
            }
        }

        return url[0];
    };

    this.toString = function () {
        return this.routes.map(function iterateRoutes(route) {
            return route.toString();
        }).join('\n');
    };

};

exports.methods = METHODS;
exports.Router = Router;

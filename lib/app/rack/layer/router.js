'use strict';

var when = require('when'),

    Router = require('../../router').Router,
    Response = require('../response').Response;

module.exports = function (getAction, routesPath) {

    var router = new Router(routesPath);

    function passRequestThroughRoutes(req, routes, routeIndex) {
        if (typeof routeIndex === 'undefined') {
            routeIndex = 0;
        }

        if (routeIndex >= routes.length) {
            return req.next;
        }

        var route = routes[routeIndex];

        req.controller = route.controller;
        req.action = route.action;
        req.params = route;

        delete route.method;
        delete route.controller;
        delete route.action;

        var action = getAction(req.controller, req.action);

        if (typeof action !== 'function') {
            return passRequestThroughRoutes(req, routes, routeIndex + 1);
        }

        return when.resolve(req)
            .then(action)
            .then(function handleActionResponse(res) {
                if (res instanceof Response) {
                    req.emit('response', res);

                } else if (res === req.next) {
                    return passRequestThroughRoutes(req, routes, routeIndex + 1);
                }
            });
    }

    return function handleRequest(req) {
        return passRequestThroughRoutes(
            req,
            router.all(req.pathname, req.method)
        );
    };

};

'use strict';

var http = require('http'),

    shien = require('shien'),
    DoublyLinkedList = shien.collection.DoublyLinkedList,

    Rack = require('./rack').Rack,

    ROUTES_PATH = 'config/routes',
    VIEWS_PATH = 'app/views';

function App(logger, cfg) {
    shien.enhance(this, logger);

    this.config = cfg || {};

    this.rack = new Rack;

    this.server = http.createServer(this.rack);
    this.server.inflight = new DoublyLinkedList;
}

App.prototype = new function () {

    function getAction(controller, action) {
        /* jshint validthis: true */

        var c = this.controller(controller);
        if (c) {
            return c.action(action);
        }
    }

    this.init = function () {
        var path = require('path');
        this.rack.use(Rack.less('/css', {
            src: path.join(process.cwd(), 'web/css'),
            dest: path.join(process.cwd(), 'dist/css')
        }));
        this.rack.use(Rack.static('/css', path.join(process.cwd(), 'dist/css')));
        this.rack.use(Rack.static('/js', path.join(process.cwd(), 'web/js')));

        this.rack.use(
            Rack.viewRenderer(VIEWS_PATH, {
                layoutDir: 'layouts',
                layout: 'base'
            })
        );
        this.rack.use(
            Rack.router(
                getAction.bind(this),
                ROUTES_PATH
            )
        );
    };

    this.controller = function (path) {
        return {
            action: function (name) {
                return function (req) {
                    return req.respond(201, { hello: 'world' });
                };
            }
        }
    };

};

exports.App = App;

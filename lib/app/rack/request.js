'use strict';

var util = require('util'),
    EventEmitter = require('events').EventEmitter,

    shien = require('shien'),
    qs = require('qs'),

    Response = require('./response').Response,

    EXPOSED_REQUEST_INFO = [
        'httpVersion',
        'method',
        'url',
        'headers',
        'statusCode'
    ],

    NEXT = shien.string.random();

function Request(req, res) {
    shien.define(this, 'originalRequest', req);
    shien.define(this, 'originalResponse', res);
    shien.expose(this, req, EXPOSED_REQUEST_INFO);

    shien.define(this, 'next', NEXT);

    var parts = req.url.split('?'),
        pathname = parts[0],
        query = (parts.length >= 2 ? parts[1] : '');

    this.pathname = pathname;
    this.query = qs.parse(query);
}

util.inherits(Request, EventEmitter);

shien.assign(Request.prototype, new function () {

    this.respond = function (statusCode, val, opts) {
        if (typeof statusCode !== 'number') {
            opts = res;
            res = statusCode;
            statusCode = 200;
        }

        this.statusCode = statusCode;

        var o = opts || {},
            res = new Response(val);

        if (typeof o.value !== 'undefined') {
            delete o.value;
        }

        shien.merge(res, o);

        return res;
    };

    this.throw = function (statusCode, err, opts) {
        if (typeof statusCode !== 'number') {
            opts = err;
            err = statusCode;
            statusCode = 500;
        }

        if (typeof err !== 'string' && !(err instanceof Error)) {
            opts = err;
            err = 'Hello world!'; // TODO: Get error message by status code
        }

        // TODO: Get default controller and action for status code
    };

    this.terminate = function () {};

});

exports.Request = Request;

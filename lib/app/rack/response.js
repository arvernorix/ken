'use strict';

var util = require('util');

function Response(val) {
    if (arguments.length === 0) {
        return;
    }

    if (typeof val === 'undefined') {
        val = {};

    } else if (typeof val !== 'object') {
        throw new Error('Value must be an object!');
    }

    this.value = val;
}

function ErrorResponse(err) {
    if (typeof err === 'string') {
        err = new Error(err);

    } else if (!(err instanceof Error)) {
        throw new Error('Value must be a string or an instance of `Error` object');
    }

    Response.call(this, err);
}

util.inherits(ErrorResponse, Response);

exports.Response = Response;
exports.ErrorResponse = ErrorResponse;

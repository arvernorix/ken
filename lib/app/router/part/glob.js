'use strict';

var util = require('util'),

    shien = require('shien'),

    Key = require('./key').Key,

    // URL-friendly regular expression
    DEFAULT_REGEX = /[\w\-\/\s]+?/,

    // Function-name-safe regular expression
    FN_REGEX = /[a-zA-Z_][\w\-]*/;

function Glob(name) {
    this.name = name;
    this.regex = (name === 'controller' || name === 'action' ?
            FN_REGEX : DEFAULT_REGEX);
}

util.inherits(Glob, Key);

shien.assign(Glob.prototype, new function () {

    this.toString = function () {
        return '*' + this.name;
    };

});

exports.Glob = Glob;

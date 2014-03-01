'use strict';

var shien = require('shien'),

    // URL-friendly regular expression
    DEFAULT_REGEX = /[\w\-\s]+/,

    // Function-name-safe regular expression
    FN_REGEX = /[a-zA-Z_][\w\-]*/;

function Key(name) {
    this.name = name;
    this.regex = (name === 'controller' || name === 'action' ?
            FN_REGEX : DEFAULT_REGEX);
}

Key.prototype = new function () {

    var extract = shien.regex.extract;

    this.pattern = function () {
        var ret = extract(String(this.regex));
        return '(' + ret + ')' + (this.optional ? '?' : '');
    };

    this.test = function (s) {
        return new RegExp('^' + this.pattern() + '$')
            .test(s);
    };

    this.url = function (s) {
        return (this.test(s) ? s : false);
    };

    this.where = function (conds) {
        var cond = conds[this.name];

        if (cond instanceof RegExp) {
            this.regex = cond;

        } else if (typeof cond === 'string') {
            this.regex = new RegExp(extract(cond));

        } else if (Array.isArray(cond)) {
            this.regex = new RegExp(
                cond.map(function (c) {
                    return extract(c.toString());
                }).join('|')
            );
        }

        return this;
    };

    this.toString = function () {
        return ':' + this.name;
    };

};

exports.Key = Key;

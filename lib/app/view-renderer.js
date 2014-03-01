'use strict';

var path = require('path'),
    fs = require('fs'),

    when = require('when'),
    dust = require('dustjs-linkedin'),

    loaded = false;

function ViewRenderer(viewDir, opts) {
    if (loaded) {
        throw new Error('View renderer could only be loaded once!')
    }

    var self = this;

    this.viewDir = path.join(process.cwd(), viewDir);
    this.options = opts || {};

    if (typeof this.options.ext !== 'string') {
        this.options.ext = 'dust';
    }

    if (!this.options.cache) {
        var load = dust.load;

        dust.load = function (name) {
            delete dust.cache[name];
            return load.apply(dust, arguments);
        };
    }

    dust.onLoad = function (name, cb) {
        var file = path.join(self.viewDir, name + '.' + self.options.ext);
        fs.readFile(file, 'utf8', cb);
    };

    loaded = true;
}

ViewRenderer.prototype = new function () {

    this.render = function (name, val) {
        return when.promise(function renderView(resolve, reject) {
            dust.render(name, val, function renderingCompleted(err, data) {
                if (err) {
                    return reject(err);
                }
                resolve(data);
            });
        });
    };

    this.renderWithLayout = function (layout, name, val) {
        if (typeof val.view !== 'undefined') {
            throw new Error('`view` is a reserved keyword, cannot be used in response!');
        }

        val.view = name;

        return this.render(layout, val);
    };

};

exports.ViewRenderer = ViewRenderer;

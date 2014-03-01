'use strict';

var path = require('path'),
    fs = require('fs'),

    inflection = require('inflection'),

    shien = require('shien'),
    DoublyLinkedList = shien.collection.DoublyLinkedList,

    when = require('when'),

    Request = require('./request').Request,
    Response = require('./response').Response,

    JS_REGEX = /\.js$/;

function Rack() {
    var rack = function (req, res) {
        rack.pass(new Request(req, res))
            .done();
    };

    rack.layers = new DoublyLinkedList;

    return shien.enhance(rack, Rack.prototype);
}

(function integratePredefinedLayers() {
    var dir = path.join(__dirname, 'layer'),
        files = fs.readdirSync(dir);

    files.forEach(function (file) {
        if (!JS_REGEX.test(file)) {
            return;
        }

        var ext = path.extname(file),
            base = path.basename(file, ext),
            name = inflection.camelize(base.replace('-', '_'), true);

        Rack[name] = require(path.join(dir, base));
    });
})();

Rack.prototype = new function () {

    this.use = function (layer) {
        if (typeof layer !== 'function') {
            throw new Error('Bad rack layer!');
        }

        this.layers.push(layer);
    };

    this.pass = function (req, layerNode) {
        if (typeof layerNode === 'undefined') {
            layerNode = this.layers.head;
        }

        if (!layerNode) {
            return req.throw(404);
        }

        var self = this;

        return when.resolve(req)
            .then(layerNode.value)
            .then(function handleLayerResponse(res) {
                if (res instanceof Response) {
                    req.emit('response', res);

                } else if (res === req.next) {
                    return self.pass(req, layerNode.next);
                }
            });
    };

};

exports.Rack = Rack;

'use strict';

var inflection = require('inflection'),
    shien = require('shien'),
    when = require('when'),

    ViewRenderer = require('../../view-renderer').ViewRenderer;

module.exports = function (viewDir, opts) {

    var o = opts || {},
        viewRenderer = new ViewRenderer(viewDir, o);

    return function handleRequest(req) {
        req.on('response', function (res) {
            var layout = (res.layout !== false ? (res.layout || o.layout) : false),
                view = res.view,

                val = {},
                ret;

            shien.assign(val, res.request);
            shien.merge(val, o.global, res.value);

            if (!view) {
                view = inflection.transform(req.controller, [ 'underscore', 'dasherize' ]) + '/' +
                        inflection.transform(req.action, [ 'underscore', 'dasherize' ]);
            }

            if (layout) {
                layout = (o.layoutDir ? o.layoutDir + '/' : '') + layout;
                ret = viewRenderer.renderWithLayout(layout, view, val);

            } else {
                ret = viewRenderer.render(view, val);
            }

            when.resolve(ret)
                .then(function renderedSuccessfully(data) {
                    req.originalResponse.end(data);
                })
                .done();
        });

        return req.next;
    };

};

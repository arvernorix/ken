'use strict';

var path = require('path'),
    fs = require('fs'),

    mime = require('mime');

module.exports = function (prefix, staticDir) {

    prefix = prefix || '';

    var i = prefix.length;

    while (prefix.charAt(--i) === '/') {}
    prefix = prefix.slice(0, i + 1);

    prefix = new RegExp('^' + prefix + '($|/)');

    return function handleRequest(req) {
        if (!prefix.test(req.pathname)) {
            return req.next;
        }

        var res = req.originalResponse,
            file = path.join(
                staticDir,
                req.pathname.replace(prefix, '/')
            );

        if (!fs.existsSync(file)) {
            res.writeHead(404, 'Not Found'); // TODO: Load default error message
            res.end();
            return;
        }

        res.writeHead(200, { 'Content-Type': mime.lookup(file) });
        fs.createReadStream(file).pipe(res);
    };

};

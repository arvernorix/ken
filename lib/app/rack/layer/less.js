'use strict';

var path = require('path'),
    fs = require('fs'),

    nodeFn = require('when/node/function'),
    Parser = require('less').Parser;

module.exports = function (prefix, opts) {

    var o = opts || {},
        src = o.src || process.cwd(),
        dest = o.dest || src;

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

            file = req.pathname.replace(prefix, '/'),
            less = path.join(src, file),
            css = path.join(dest, file);

        less = less.replace(/\.css$/, '.less');

        if (!fs.existsSync(less)) {
            res.writeHead(404, 'Not Found'); // TODO: Load default error message
            res.end();
            return;
        }

        var readFile = nodeFn.lift(fs.readFile.bind(fs)),
            writeFile = nodeFn.lift(fs.writeFile.bind(fs)),

            parser = new Parser({
                paths: [ path.dirname(less) ],
                filename: less
            }),
            parse = nodeFn.lift(parser.parse.bind(parser));

        return readFile(less, 'utf8')
            .then(parse)
            .then(function parsingCompleted(tree) {
                return writeFile(css, tree.toCSS(), 'utf8');
            })
            .then(
                function wroteFileSuccessfully() {
                    return req.next;
                },
                function failedToWriteFile(err) {
                    console.error(err);
                    res.writeHead(500, 'Internal Server Error'); // TODO: Load default error message
                    res.end();
                    return;
                }
            );
    };

};

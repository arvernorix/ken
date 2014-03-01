'use strict';

var path = require('path'),
    shien = require('shien'),
    Mocha = require('mocha');

module.exports = function (done) {

    var testDir = __dirname,
        testFiles = [],

        thisFile = path.basename(__filename),
        ignore = '^' + thisFile + '$',

        mocha = new Mocha,

        t = shien.file.traverse(testDir, {
            ignore: ignore,
            match: /\.js$/
        });

    t.on('file', function (file) {
        testFiles.push(path.join(testDir, file));
    });

    t.on('done', function () {
        mocha.files = testFiles;
        mocha.run(done);
    });

};

'use strict';

var path = require('path'),
    shien = require('shien'),
    Mocha = require('mocha');

module.exports = function (done) {

    var testDir = __dirname,

        mocha = new Mocha,
        testFiles = [],

        t = shien.traverse(testDir, { match: /\.js$/ });

    t.on('file', function (file) {
        testFiles.push(path.join(testDir, file));
    });

    t.on('done', function () {
        mocha.files = testFiles;
        mocha.run(done);
    });

};

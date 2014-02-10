'use strict';

module.exports = function (grunt) {

    // Load all grunt tasks
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            all: [
                '{bin,lib,test}/{,*/}*.js',
                'Gruntfile.js'
            ]
        }
    });

    grunt.registerTask('mocha', function () {
        var done = this.async(),
            listeners = process.listeners('uncaughtException');

        process.removeAllListeners('uncaughtException');

        require('./test/bootstrap')(function (err) {
            listeners.forEach(function (listener) {
                process.on('uncaughtException', listener);
            });
            done(err ? false : true);
        });
    });

    grunt.registerTask('test', 'Run JSHint and tests', [
        'jshint',
        'mocha'
    ]);

};

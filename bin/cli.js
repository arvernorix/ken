#!/usr/bin/env node

'use strict';

var ken = require('../lib/ken');
ken.start()
    .done(
        function () {
            console.info('Initialized successfully.', ken);
        },
        function (err) {
            console.error('Error occurred while initializing Ken!');
            throw err;
        }
    );

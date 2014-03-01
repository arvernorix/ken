#!/usr/bin/env node

'use strict';

var ken = require('../lib/ken');

ken.start()
    .done(
        function startedSuccessfully() {
            (ken.master ? ken.notice : ken.info).call(ken, 'Meow');
        },
        function failedToStart(err) {
            (ken.error ? ken.error : console.error)
                .call(ken, 'Error occurred while starting Ken!', err);
            throw err;
        }
    );

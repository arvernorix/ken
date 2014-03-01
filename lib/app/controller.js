'use strict';

function Controller() {
    this.actions = {};
}

Controller.prototype = new function () {

    this.action = function (action, fn) {
        if (typeof fn !== 'undefined') {
            if (typeof fn !== 'function') {
                throw new Error('Controler action must be a function!');
            }

            this.actions[action] = fn;
        }

        return this.actions[action];
    };

};

exports.Controller = Controller;

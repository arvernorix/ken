'use strict';

var when = require('when');

function App() {
}

App.prototype = new function () {

    this.initApp = function () {
        return when.resolve(10);
    };

};

exports.App = App;

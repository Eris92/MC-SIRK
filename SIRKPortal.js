"use strict";

var implementation = require("./plugin-main.js");

module.exports.SIRKPortal = function (parent) {
    return implementation.createPlugin(parent, "SIRKPortal");
};

"use strict";

var implementation = require("./plugin-main.js");
var elevatedQuickCommands = require("./server/core/elevated-quick-command-policy.js");

module.exports.SIRKPortal = function (parent) {
    var plugin = implementation.createPlugin(parent, "SIRKPortal");
    elevatedQuickCommands.apply(plugin);
    return plugin;
};

module.exports.applyElevatedQuickCommandPolicy = elevatedQuickCommands.apply;

"use strict";

var implementation = require("./plugin-main.js");
var elevatedQuickCommands = require("./server/core/elevated-quick-command-policy.js");
var agentCommandGuard = require("./server/core/agent-command-guard.js");

module.exports.SIRKPortal = function (parent) {
    var plugin = implementation.createPlugin(parent, "SIRKPortal");
    elevatedQuickCommands.apply(plugin);
    agentCommandGuard.apply(plugin);
    return plugin;
};

module.exports.applyElevatedQuickCommandPolicy = elevatedQuickCommands.apply;
module.exports.applyAgentCommandGuard = agentCommandGuard.apply;

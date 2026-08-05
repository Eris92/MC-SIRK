"use strict";

var implementation = require("./plugin-main.js");
var elevatedQuickCommands = require("./server/core/elevated-quick-command-policy.js");
var loggedOnUserCommands = require("./server/core/logged-on-user-command-policy.js");
var agentCommandGuard = require("./server/core/agent-command-guard.js");
var myScriptsDefaultMulti = require("./server/core/myscripts-default-multi-policy.js");
var myScriptsMultiDevice = require("./server/core/myscripts-multi-device-policy.js");

module.exports.SIRKPortal = function (parent) {
    var plugin = implementation.createPlugin(parent, "SIRKPortal");
    elevatedQuickCommands.apply(plugin);
    loggedOnUserCommands.apply(plugin);
    agentCommandGuard.apply(plugin);
    myScriptsDefaultMulti.apply(plugin);
    myScriptsMultiDevice.apply(plugin);
    return plugin;
};

module.exports.applyElevatedQuickCommandPolicy = elevatedQuickCommands.apply;
module.exports.applyLoggedOnUserCommandPolicy = loggedOnUserCommands.apply;
module.exports.applyAgentCommandGuard = agentCommandGuard.apply;
module.exports.applyMyScriptsDefaultMultiPolicy = myScriptsDefaultMulti.apply;
module.exports.applyMyScriptsMultiDevicePolicy = myScriptsMultiDevice.apply;

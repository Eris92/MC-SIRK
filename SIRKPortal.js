"use strict";

var implementation = require("./plugin-main.js");
var elevatedQuickCommands = require("./server/core/elevated-quick-command-policy.js");
var loggedOnUserCommands = require("./server/core/logged-on-user-command-policy.js");
var agentCommandGuard = require("./server/core/agent-command-guard.js");
var multiDeviceCatalog = require("./server/core/multi-device-catalog-policy.js");

module.exports.SIRKPortal = function (parent) {
    var plugin = implementation.createPlugin(parent, "SIRKPortal");
    elevatedQuickCommands.apply(plugin);
    loggedOnUserCommands.apply(plugin);
    agentCommandGuard.apply(plugin);
    multiDeviceCatalog.apply(plugin);
    return plugin;
};

"use strict";

var implementation = require("./plugin-main.js");

function applyElevatedQuickCommandPolicy(plugin) {
    var device = plugin && plugin.runtime && plugin.runtime.context && plugin.runtime.context.device;
    if (!device || typeof device.sendRunCommands !== "function" || device.__sirkElevatedQuickCommands) return;

    var original = device.sendRunCommands;
    device.sendRunCommands = function (context, command, responseId, sessionId) {
        var effectiveCommand = command;
        if (command && typeof command.cmd === "string" &&
            command.cmd.indexOf("New-ScheduledTaskPrincipal") >= 0 &&
            command.cmd.indexOf("-LogonType Interactive -RunLevel Limited") >= 0) {
            effectiveCommand = Object.assign({}, command, {
                cmd: command.cmd.replace(/-LogonType Interactive -RunLevel Limited/g,
                    "-LogonType Interactive -RunLevel Highest")
            });
        }
        return original.call(device, context, effectiveCommand, responseId, sessionId);
    };
    device.__sirkElevatedQuickCommands = true;
}

module.exports.SIRKPortal = function (parent) {
    var plugin = implementation.createPlugin(parent, "SIRKPortal");
    applyElevatedQuickCommandPolicy(plugin);
    return plugin;
};

module.exports.applyElevatedQuickCommandPolicy = applyElevatedQuickCommandPolicy;

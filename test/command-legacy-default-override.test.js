"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var factory = require("../server/modules/commands/index.js");

var repo = path.resolve(__dirname, "..");
var dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mc-sirk-command-label-"));
var current = {
    modules: {
        mycommands: {
  accessGroupIds: [], folderPermissions: {}, scriptAvailability: {},
  commandOverrides: {
      "network-settings": { label: "Network Connections" },
      "network-adapter-properties": { label: "Właściwości Sieciowe" },
      powershell: { label: "Open PowerShell" },
      cmd: { label: "Otwórz CMD" },
      regedit: { label: "Registry Custom" }
  }
        }
    }
};
var context = {
    fs: fs, path: path, pluginRoot: repo, dataRoot: dataRoot,
    parent: {},
    settings: {
        read: function () { return current; },
        updateSync: function (fn) { current = fn(current) || current; return current; },
        update: function (fn) { current = fn(current) || current; return Promise.resolve(current); }
    },
    secrets: { get: function () { return {}; }, set: function () {} },
    integrations: { configured: function () { return {}; }, readSettings: function () { return {}; } },
    approval: { registerProvider: function () { return function () {}; } },
    device: {}
};

var module = factory.createModule(context);
var user = { _id: "user/admin", siteadmin: true };
var catalog = module.apiGet("catalog", { query: {} }, user).catalog;
function command(id) {
    var found;
    catalog.forEach(function (category) {
        (category.commands || []).forEach(function (item) { if (item.id === id) found = item; });
    });
    return found;
}

assert.strictEqual(command("network-settings").label, "Network Control",
    "Persisted historical Network Connections default must not override the new canonical label.");
assert.strictEqual(command("network-adapter-properties").label, "Network Settings",
    "Persisted historical adapter-properties default must not override the new canonical label.");
assert.strictEqual(command("powershell").label, "PowerShell",
    "Persisted historical Open PowerShell default must not survive runtime catalog generation.");
assert.strictEqual(command("cmd").label, "CMD",
    "Persisted historical Open/Otwórz CMD default must not survive runtime catalog generation.");
assert.strictEqual(command("regedit").label, "Registry Custom",
    "A genuine user-defined command label must remain an override.");

current.modules.mycommands.commandOverrides["network-settings"].label = "My Network Launcher";
catalog = module.apiGet("catalog", { query: {} }, user).catalog;
assert.strictEqual(command("network-settings").label, "My Network Launcher",
    "Only known historical defaults may be ignored; arbitrary custom labels must be preserved.");

fs.rmSync(dataRoot, { recursive: true, force: true });
console.log("Legacy built-in default labels are normalized without deleting genuine command overrides: OK");

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var externalPlugin = { key: "external", closeCount: 0, close: function () { this.closeCount += 1; } };
var context = {
    window: {
        MeshPluginCore: { activePlugin: externalPlugin },
        SirkPlatformCore: { activePlugin: null }
    }
};
context.window.window = context.window;

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "native", "mesh-plugin-core.js"),
    "utf8"
);
vm.runInNewContext(source, context);

var meshCore = context.window.MeshPluginCore;
var sirkCore = context.window.SirkPlatformCore;

assert.notStrictEqual(meshCore, sirkCore,
    "SIRK must not overwrite another plugin's MeshPluginCore implementation.");
assert.strictEqual(sirkCore.activePlugin, externalPlugin,
    "SIRK must see the plugin already active through the shared MeshPluginCore owner.");

var sirkPlugin = { key: "approvalcenter", closeCount: 0, close: function () { this.closeCount += 1; } };
sirkCore.activePlugin = sirkPlugin;
assert.strictEqual(meshCore.activePlugin, sirkPlugin,
    "Other MeshCentral plugins must see the SIRK module as the active plugin.");

var otherPlugin = { key: "other", closeCount: 0, close: function () { this.closeCount += 1; } };
meshCore.activePlugin = otherPlugin;
assert.strictEqual(sirkCore.activePlugin, otherPlugin,
    "SIRK must immediately see an external plugin that replaced the active owner.");

sirkCore.activePlugin.close(false);
assert.strictEqual(otherPlugin.closeCount, 1,
    "The shared owner must allow SIRK to close an external plugin through the standard lifecycle.");

sirkCore.activePlugin = null;
assert.strictEqual(meshCore.activePlugin, null,
    "Clearing the SIRK owner must clear the shared MeshPluginCore owner.");

console.log("Shared MeshPluginCore active-plugin owner: OK");

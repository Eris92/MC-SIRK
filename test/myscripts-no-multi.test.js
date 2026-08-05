"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var toolbarSource = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar-config.js"), "utf8");
var context = { window: {} };
context.window.window = context.window;
vm.runInNewContext(toolbarSource, context, { filename: "toolbar-config.js" });

var config = context.window.SharedToolbarConfig;
assert.ok(config, "SharedToolbarConfig must load.");
assert.strictEqual(config.presets.myscripts.multi, false,
    "My Scripts must not expose multi-device mode.");
assert.strictEqual(config.presets.mycommands.multi, true,
    "Commands must retain multi-device mode.");

var myScriptsButtons = config.resolve("myscripts", {});
assert.strictEqual(myScriptsButtons.some(function (item) { return item.key === "multi"; }), false,
    "The resolved My Scripts toolbar must not contain a multi-device button.");
var commandButtons = config.resolve("mycommands", {});
assert.strictEqual(commandButtons.some(function (item) { return item.key === "multi"; }), true,
    "The resolved Commands toolbar must still contain the multi-device button.");

var entry = fs.readFileSync(path.join(root, "SIRKPortal.js"), "utf8");
assert.strictEqual(entry.indexOf("myscripts-default-multi-policy"), -1,
    "The plugin entrypoint must not load a My Scripts default multi policy.");
assert.strictEqual(entry.indexOf("myscripts-multi-device-policy"), -1,
    "The plugin entrypoint must not load a My Scripts multi-execute policy.");
assert.strictEqual(fs.existsSync(path.join(root, "server", "core", "myscripts-default-multi-policy.js")), false,
    "The My Scripts default multi policy file must be removed.");
assert.strictEqual(fs.existsSync(path.join(root, "server", "core", "myscripts-multi-device-policy.js")), false,
    "The My Scripts multi-device backend policy file must be removed.");

var commandsBackend = fs.readFileSync(path.join(root, "server", "modules", "commands", "index.js"), "utf8");
assert.ok(commandsBackend.indexOf('asset === "multi-execute"') >= 0,
    "Commands must retain its multi-execute backend endpoint.");

console.log("My Scripts single-device-only and Commands multi-device boundary: OK");

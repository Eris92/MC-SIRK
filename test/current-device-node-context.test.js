"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var shell = fs.readFileSync(path.join(root, "public", "shared", "module-shell.js"), "utf8");
var commands = fs.readFileSync(path.join(root, "public", "modules", "commands", "index.js"), "utf8");
var device = fs.readFileSync(path.join(root, "server", "core", "device-service.js"), "utf8");

assert.ok(shell.indexOf('onDeviceRefreshEnd: function (nodeId)') >= 0 && shell.indexOf('state.nodeId = String(nodeId || "")') >= 0,
    "The module shell must update device context from the current MeshCentral device refresh.");
assert.ok(commands.indexOf('function node(shell) { return shell.state.nodeId || window.SirkPlatformRuntime.state.nodeId || window.selectedNode || ""; }') >= 0,
    "Commands must prefer the device ID owned by the current module shell.");
assert.ok(commands.indexOf('var payload = { nodeId: node(shell)') >= 0,
    "Commands execution must submit the current module device ID directly.");
assert.ok(device.indexOf('if (value.indexOf("/") < 0) value = "node/" + domain.id + "/" + value') >= 0,
    "The backend device service must canonicalize short node identifiers.");
assert.ok(device.indexOf('if (parts.length !== 3 || parts[0] !== "node" || parts[1] !== domain.id)') >= 0 &&
    device.indexOf('reject(new Error("Invalid device identifier."))') >= 0,
    "The backend device service must validate canonical MeshCentral node identifiers and domain scope.");
assert.ok(device.indexOf('GetNodeWithRights') >= 0 && device.indexOf('requireCommandRights === true') >= 0,
    "Device resolution must enforce MeshCentral visibility and command rights server-side.");

console.log("Current device node context contract: OK");

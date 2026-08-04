"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.join(__dirname, "..", "server", "core", "elevated-quick-command-policy.js"), "utf8");

assert.ok(source.indexOf("Process.GetProcessesByName(\\\"winlogon\\\")") >= 0,
    "The launcher must obtain a SYSTEM token from winlogon in the target interactive session.");
assert.ok(source.indexOf("DuplicateTokenEx") >= 0,
    "The launcher must duplicate a primary SYSTEM token.");
assert.ok(source.indexOf("CreateProcessAsUser") >= 0,
    "The launcher must create the visible process with the duplicated SYSTEM token.");
assert.ok(source.indexOf("winsta0\\\\\\\\default") >= 0,
    "The launcher must target the visible interactive desktop.");
assert.ok(source.indexOf("WindowsIdentity.GetCurrent().IsSystem") >= 0,
    "The launcher must refuse to claim elevation when MeshAgent is not LocalSystem.");
assert.ok(source.indexOf("New-ScheduledTaskPrincipal") >= 0,
    "Legacy launcher detection must remain explicit.");

console.log("SYSTEM Quick command launcher contract: OK");

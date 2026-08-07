"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var commands = fs.readFileSync(path.join(__dirname, "..", "public", "modules", "commands", "index.js"), "utf8");

assert.ok(commands.indexOf("window.__sirkNativeCommandAutoRun = true") >= 0,
    "The native Commands module must advertise ownership of selection execution.");
assert.ok(commands.indexOf("show(shell, item, true)") >= 0,
    "Selecting a command or script must request native execution immediately.");
assert.ok(commands.indexOf("autoExecute === true && (!Array.isArray(item.variables) || item.variables.length === 0)") >= 0,
    "Only variable-free items may execute automatically.");
assert.ok(commands.indexOf("show(shell, item, false)") >= 0,
    "Restoring an already selected item during page render must not execute it again.");
assert.ok(commands.indexOf('shell.element("button", "btn btn-primary mc-command-run-button"') >= 0 &&
    commands.indexOf("card.appendChild(button)") >= 0,
    "The native Commands renderer must keep a visible Run action for variable or manually confirmed execution.");

console.log("Native Commands selection execution contract: OK");

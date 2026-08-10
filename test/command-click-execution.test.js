"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var commands = fs.readFileSync(path.join(__dirname, "..", "public", "modules", "commands", "index.js"), "utf8");

assert.ok(commands.indexOf("window.__sirkNativeCommandAutoRun = true") >= 0,
    "The native Commands module must advertise ownership of selection execution.");
assert.ok(commands.indexOf("show(shell, item, true)") >= 0,
    "Selecting a command or script must request the native execution flow immediately.");
assert.ok(commands.indexOf("if (autoExecute === true) window.setTimeout(function () { button.click(); }, 0);") >= 0,
    "Selection must enter the Run action for both variable-free and parameterized items.");
assert.ok(commands.indexOf("parameterValues(item, button).then(function (values)") >= 0 &&
    commands.indexOf("if (values == null) return;") >= 0,
    "Parameterized selection must stop at the shared native dialog until valid values are submitted.");
assert.ok(commands.indexOf("show(shell, item, false)") >= 0,
    "Restoring an already selected item during page render must not execute it again.");
assert.ok(commands.indexOf('shell.element("button", "btn btn-primary mc-command-run-button"') >= 0 &&
    commands.indexOf("card.appendChild(button)") >= 0,
    "The native Commands renderer must keep a visible Run action for explicit rerun after dialog cancellation or prior output.");

console.log("Native Commands selection / parameter-dialog execution contract: OK");

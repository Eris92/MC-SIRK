"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "download-results.js"), "utf8");

assert.ok(source.indexOf("function installCommandsCatalogHook()") >= 0,
    "The native Commands catalog must install the selection execution hook.");
assert.ok(source.indexOf("isCommandsCatalog(options)") >= 0,
    "The selection hook must be restricted to the Commands catalog.");
assert.ok(source.indexOf("var result = originalOnScript(item)") >= 0,
    "The existing script-selection behavior must run before automatic execution.");
assert.ok(source.indexOf("scheduleAutomaticRun(item, sequence, previousButtons, 0)") >= 0,
    "Selecting a command or script must schedule execution.");
assert.ok(source.indexOf("item.variables.length") >= 0,
    "Items with declared variables must not auto-run before input is collected.");
assert.ok(source.indexOf(".mc-script-runtime-variables input") >= 0,
    "File-backed scripts with runtime variable controls must remain manual.");
assert.ok(source.indexOf("button.click()") >= 0,
    "Variable-free selected scripts must invoke the existing Run action.");
assert.ok(source.indexOf("previousButtons.indexOf(buttons[index]) < 0") >= 0,
    "The hook must not execute a stale Run button from the previously selected script.");

console.log("Command selection execution contract: OK");

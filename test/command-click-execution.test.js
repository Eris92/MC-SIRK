"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "download-results.js"), "utf8");

assert.ok(source.indexOf("function installCommandsCatalogHook()") >= 0,
    "The Commands catalog must install a selection execution hook.");
assert.ok(source.indexOf("function beginSelectedRun()") >= 0,
    "A selected script must start a new execution sequence.");
assert.ok(source.indexOf("function scheduleSelectedRun(sequence, attempt)") >= 0,
    "Async file-backed script definitions must be polled until the Run action exists.");
assert.ok(source.indexOf(".mc-shared-page-mycommands .mc-tree-script") >= 0,
    "Existing Commands trees mounted before the wrapper loads must have a click fallback.");
assert.ok(source.indexOf(".mc-shared-page-mycommands") >= 0,
    "Automatic execution must be scoped to the Commands page.");
assert.ok(source.indexOf(".mc-script-runtime-variables input") >= 0,
    "Scripts with runtime variables must remain manual.");
assert.ok(source.indexOf("button.click()") >= 0,
    "A variable-free selected script must invoke the existing Run action.");
assert.ok(source.indexOf("data-sirk-auto-run") >= 0,
    "The same selection must not execute twice.");
assert.ok(source.indexOf("sequence !== commandSelectionSequence") >= 0,
    "A stale selection must not execute after a newer script was clicked.");

console.log("Command selection execution contract: OK");

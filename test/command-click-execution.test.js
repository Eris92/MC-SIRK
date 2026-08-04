"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "download-results.js"), "utf8");

assert.ok(source.indexOf("function installCommandsCatalogHook()") >= 0,
    "The Commands catalog must wrap its native script-selection callback.");
assert.ok(source.indexOf("var result = originalOnScript(item)") >= 0,
    "The native script-selection behavior must run before automatic execution.");
assert.ok(source.indexOf("var previousButtons = currentRunButtons()") >= 0,
    "The execution helper must remember the previous selection's Run controls.");
assert.ok(source.indexOf("previousButtons.indexOf(buttons[index]) < 0") >= 0,
    "Only the newly rendered Run action may be invoked.");
assert.ok(source.indexOf("hasRuntimeVariables(button)") >= 0,
    "Scripts with runtime variables must remain manual.");
assert.ok(source.indexOf("button.click()") >= 0,
    "Variable-free scripts must invoke the existing Run action.");
assert.ok(source.indexOf('event.target.closest(".mc-shared-page-mycommands .mc-tree-script")') >= 0,
    "A capture-phase fallback must support already-mounted Commands trees.");
assert.ok(source.indexOf("installCommandsCatalogHook();") >= 0,
    "The catalog hook must be retried during browser scans.");
assert.ok(source.indexOf("sirk-command-run-style") >= 0 && source.indexOf("visibility:visible!important") >= 0,
    "The native Commands Run action must remain visibly accessible.");
assert.ok(source.indexOf("data-sirk-auto-run") >= 0,
    "Automatic execution must be protected against duplicate clicks.");

console.log("Command selection execution contract: OK");

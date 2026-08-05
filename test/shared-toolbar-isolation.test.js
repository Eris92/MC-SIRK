"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var toolbar = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "toolbar.js"), "utf8");

var stableStart = toolbar.indexOf("function addStableDefinitions(options, add, context)");
var quickStart = toolbar.indexOf("function keepQuickToolbarOnOneLine");
var stableBlock = toolbar.slice(stableStart, quickStart);

assert.ok(stableStart >= 0 && quickStart > stableStart,
    "The stable non-Quick mounting function must exist before Quick-only layout helpers.");
assert.ok(stableBlock.indexOf("quickDefinitions") < 0 &&
    stableBlock.indexOf("alignQuickCollapseWithMyScripts") < 0 &&
    stableBlock.indexOf("keepQuickToolbarOnOneLine") < 0,
    "The non-Quick mounting path must not invoke Quick-only behavior.");
assert.ok(toolbar.indexOf("if (quickToolbar) quickDefinitions(options).forEach(add);\n            else addStableDefinitions(options, add, context);") >= 0,
    "Quick and non-Quick toolbar mounting must use explicit isolated branches.");

console.log("Shared toolbar Quick isolation: OK");

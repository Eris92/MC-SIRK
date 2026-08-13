"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/shared/ui/parameter-dialog.js"), "utf8");

assert.ok(source.indexOf('var listMode = variable.listMode === true && (kind === "user" || kind === "select");') >= 0,
    "Shared parameter dialog must recognize listMode only for user/select controls.");
assert.ok(source.indexOf('var control = document.createElement(multiline ? "textarea" : listMode ? "input" : useSelect ? "select" : "input");') >= 0,
    "Multiline must choose TEXTAREA while listMode still chooses INPUT before checklist code assigns type=hidden.");
assert.ok(source.indexOf('if (kind === "assetmulti" || listMode) {') >= 0,
    "assetmulti and listMode must share the hidden-input checklist path.");
assert.ok(source.indexOf('(kind === "assetmulti" && Array.isArray(variable.options))') >= 0,
    "A prefetched assetmulti list must render into the detached dialog before the modal is shown.");
assert.ok(source.indexOf('var provider = options.resolveOptions === null ? null :') >= 0,
    "A wizard step with prefetched options must be able to disable the shared dynamic provider explicitly.");
assert.ok(source.indexOf('control.type = "hidden";') >= 0,
    "Checklist state owner must remain a hidden input.");
assert.ok(source.indexOf('var useSelect = kind === "select" || kind === "asset" || (kind === "user" && !customUser);') >= 0,
    "Ordinary select, asset and non-custom user controls must retain SELECT ownership.");
assert.ok(source.indexOf('document.createElement(useSelect ? "select" : "input")') < 0,
    "buildContent must not create a SELECT before considering listMode.");

console.log("Parameter list-mode and assetmulti hidden INPUT ownership: OK");

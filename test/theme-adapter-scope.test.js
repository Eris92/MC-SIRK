"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");

var refreshStart = source.indexOf("function refresh(root)");
var refreshEnd = source.indexOf("function schedule(root)", refreshStart);
var refresh = source.slice(refreshStart, refreshEnd);
var controlSelector = 'input:not([type=button]):not([type=submit]):not([type=reset]),textarea,select';

assert.ok(refreshStart >= 0 && refreshEnd > refreshStart,
    "MeshThemeAdapter refresh owner must exist.");
assert.ok(refresh.indexOf("queryAll(root, PLUGIN_ROOT_SELECTOR, function (pluginRootElement)") >= 0 &&
    refresh.indexOf('queryAll(pluginRootElement, "' + controlSelector + '", applyControl)') >= 0,
    "Generic control adaptation must be scoped through the existing SIRK plugin roots.");
assert.strictEqual(refresh.indexOf('queryAll(root, "' + controlSelector + '", applyControl)'), -1,
    "MeshThemeAdapter must never mutate native MeshCentral inputs/selects outside SIRK roots.");
assert.ok(source.indexOf('var PLUGIN_ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog-overlay,.mc-move-dialog"') >= 0,
    "Control scoping must reuse the canonical plugin root owner.");

console.log("MeshThemeAdapter keeps generic control classes inside SIRK roots: OK");

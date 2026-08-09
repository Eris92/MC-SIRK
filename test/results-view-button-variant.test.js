"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var results = fs.readFileSync(path.join(root, "public/shared/ui/results.js"), "utf8");
var theme = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");

assert.ok(results.indexOf('view.className = "btn btn-secondary btn-sm mc-results-view-button"') >= 0,
    "Results View must use the standard visible secondary row-action surface.");
assert.ok(results.indexOf('window.MeshThemeAdapter.button(view, "secondary")') >= 0,
    "Results View must receive its native surface synchronously at creation, before deferred theme refresh.");
assert.ok(theme.indexOf('queryAll(root, ".mc-shared-toolbar-button,.mc-tree-script-action,.mc-results-view-button') >= 0,
    "MeshThemeAdapter refresh must continue to own Results View theme reconciliation.");
assert.strictEqual(theme.indexOf('element.classList.contains("mc-command-run-button") || element.classList.contains("mc-results-view-button")'), -1,
    "Results View must not be forced back to the ineffective primary-only contract during refresh.");
assert.ok(results.indexOf('copy.className = "btn btn-secondary btn-sm"') >= 0 &&
    results.indexOf('download.className = "btn btn-secondary btn-sm mc-results-download-button"') >= 0,
    "Copy and Download must remain secondary actions.");
assert.strictEqual(theme.indexOf('.mc-results-view-button{'), -1,
    "Theme adapter JavaScript must not introduce hardcoded View surface CSS.");
console.log("Results View reuses the standard native secondary surface through creation and refresh: OK");
"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var results = fs.readFileSync(path.join(root, "public/shared/ui/results.js"), "utf8");
var theme = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");

assert.ok(results.indexOf('view.className = "btn btn-primary btn-sm mc-results-view-button"') >= 0,
    "Results renderer must declare View as the primary row action.");
assert.ok(theme.indexOf('element.classList.contains("mc-results-view-button")') >= 0,
    "MeshThemeAdapter must preserve View as a primary native action after refresh.");
assert.ok(theme.indexOf('if (element.classList.contains("mc-command-run-button") || element.classList.contains("mc-results-view-button")') >= 0,
    "View must share the existing primary button variant owner rather than a per-theme CSS surface.");
assert.ok(results.indexOf('copy.className = "btn btn-secondary btn-sm"') >= 0 &&
    results.indexOf('download.className = "btn btn-secondary btn-sm mc-results-download-button"') >= 0,
    "Copy and Download must remain secondary actions.");
assert.strictEqual(theme.indexOf('.mc-results-view-button{'), -1,
    "Theme adapter JavaScript must not introduce hardcoded View surface CSS.");
console.log("Results View keeps its native primary variant through theme refresh: OK");

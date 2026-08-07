"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var toolbar = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.js"), "utf8");
var quick = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");
var page = fs.readFileSync(path.join(root, "public", "shared", "ui", "page.js"), "utf8");

assert.ok(toolbar.indexOf("function definitions(options)") >= 0 &&
    toolbar.indexOf("window.SharedToolbarConfig.resolve(options.preset, options.buttons).slice()") >= 0,
    "SharedToolbar must resolve every preset through one canonical definitions path.");
assert.ok(toolbar.indexOf("(options.customButtons || []).forEach") >= 0 &&
    toolbar.indexOf("return items.sort(function (a, b)") >= 0,
    "Custom Quick actions must join the same ordered definition list instead of using a separate mounting branch.");
assert.ok(toolbar.indexOf("definitions(options).forEach(add)") >= 0,
    "All toolbars must mount through one canonical add loop.");

[
    "quickDefinitions",
    "addStableDefinitions",
    "keepQuickToolbarOnOneLine",
    "alignQuickCollapseWithMyScripts",
    "quickToolbar"
].forEach(function (legacy) {
    assert.strictEqual(toolbar.indexOf(legacy), -1,
        "SharedToolbar must not retain Quick-specific compatibility helper: " + legacy);
});

assert.ok(quick.indexOf("window.SharedToolbar.mount({") >= 0 &&
    quick.indexOf('preset: "mycommands"') >= 0 &&
    quick.indexOf("customButtons: [{") >= 0,
    "Quick must consume SharedToolbar through the same public mount API as normal modules.");
assert.ok(page.indexOf("window.SharedToolbar.mount({") >= 0 &&
    page.indexOf("preset: options.preset") >= 0,
    "SharedPage modules must consume the same public mount API.");
assert.strictEqual(quick.indexOf("SharedToolbar.prototype"), -1,
    "Quick must not patch SharedToolbar after loading.");
assert.strictEqual(quick.indexOf("window.SharedToolbar.mount ="), -1,
    "Quick must not replace the shared toolbar mount implementation.");

console.log("One canonical SharedToolbar mount path for Quick and shared modules: OK");

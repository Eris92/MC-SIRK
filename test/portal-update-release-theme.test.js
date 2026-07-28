"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var fix = fs.readFileSync(path.join(root, "public/vendor/sirk-portal/update-release-theme-fix.js"), "utf8");
var loader = fs.readFileSync(path.join(root, "public/vendor/sirk-portal/settings-primary-navigation.js"), "utf8");

assert.ok(fix.indexOf("sirk-update-stopwatch") >= 0, "Update overlay must render a stopwatch.");
assert.ok(fix.indexOf("MutationObserver") >= 0, "Stopwatch must survive repeated update overlay renders.");
assert.ok(fix.indexOf("sirkportal:themechange") >= 0, "Overlay theme must update without a page reload.");
assert.ok(fix.indexOf("sirkReleaseOverlay") >= 0 && fix.indexOf("sirkUpdateFullscreen") >= 0,
    "Both release and update overlays must be themed.");
assert.ok(loader.indexOf("update-release-theme-fix.js") >= 0,
    "The common Portal loader must load the update/release overlay controller.");

console.log("Portal update timer and overlay theme sync: OK");

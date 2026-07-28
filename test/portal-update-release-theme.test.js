"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var fix = fs.readFileSync(path.join(root, "public/vendor/sirk-portal/update-release-theme-fix.js"), "utf8");
var settingsLoader = fs.readFileSync(path.join(root, "public/vendor/sirk-portal/settings-primary-navigation.js"), "utf8");
var portalLoader = fs.readFileSync(path.join(root, "public/portal/vendor/portal-ui-contract.js"), "utf8");

assert.ok(fix.indexOf("sirk-update-stopwatch") >= 0, "Update overlay must render a stopwatch.");
assert.ok(fix.indexOf("MutationObserver") >= 0, "Stopwatch must survive repeated update overlay renders.");
assert.ok(fix.indexOf("sirkportal:themechange") >= 0, "Overlay theme must update without a page reload.");
assert.ok(fix.indexOf("sirkReleaseOverlay") >= 0 && fix.indexOf("sirkUpdateFullscreen") >= 0,
    "Both release and update overlays must be themed.");
assert.ok(fix.indexOf('"--sirk-panel": "#111827"') >= 0 && fix.indexOf("sirk-theme-dark>section") >= 0,
    "Release overlay must have an explicit dark palette fallback.");
assert.ok(fix.indexOf("makeReleaseBlocking") >= 0 && fix.indexOf('aria-modal", "true') >= 0,
    "Release information must remain a blocking modal until acknowledged.");
assert.ok(fix.indexOf("display:grid!important") >= 0 && fix.indexOf("place-items:center!important") >= 0,
    "Release modal must remain centered on the screen.");
assert.ok(fix.indexOf("makeReleaseNonBlocking") < 0 && fix.indexOf("sirk-release-close") >= 0,
    "The compatibility controller may remove old close buttons but must not restore non-blocking mode.");
assert.ok(settingsLoader.indexOf("update-release-theme-fix.js") >= 0,
    "Settings must retain the overlay controller loader.");
assert.ok(portalLoader.indexOf("sirk-update-release-theme-fix") >= 0 && portalLoader.indexOf("update-release-theme-fix.js") >= 0,
    "Portal startup must load the overlay controller before Settings is opened.");

console.log("Portal update timer and blocking release theme sync: OK");
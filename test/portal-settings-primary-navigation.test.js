"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var standalone = fs.readFileSync(path.join(root, "public/portal/vendor/portal-ui-contract.js"), "utf8");
var pluginContract = fs.readFileSync(path.join(root, "public/vendor/sirk-portal/portal-ui-contract.js"), "utf8");
var promoted = fs.readFileSync(path.join(root, "public/vendor/sirk-portal/settings-primary-navigation.js"), "utf8");

assert.ok(standalone.indexOf('data-settings-base-primary') >= 0,
    "The technical Settings button must be retained for the existing renderer.");
assert.ok(standalone.indexOf('base.hidden = true') >= 0 && standalone.indexOf('base.style.display = "none"') >= 0,
    "The technical Settings button must not remain visible.");
assert.ok(standalone.indexOf('data-settings-root-menu') >= 0,
    "Promoted settings sections must use a protected first-column container.");
["modules", "portal", "integrations"].forEach(function (key) {
    assert.ok(standalone.indexOf('rootButton(menu, "' + key + '"') >= 0,
        "Missing promoted standalone first-column section: " + key);
    assert.ok(promoted.indexOf('rootButton(host, "' + key + '"') >= 0,
        "Missing promoted plugin first-column section: " + key);
});
assert.ok(standalone.indexOf('projectSecondary(secondary)') >= 0,
    "The standalone second column must be projected from the selected first-column section.");
assert.ok(promoted.indexOf('function project(secondary)') >= 0,
    "The plugin second column must be projected from the selected first-column section.");
assert.ok(standalone.indexOf('sirk-settings-primary-projected>summary') >= 0,
    "The former second-column root heading must be hidden after promotion.");
assert.ok(standalone.indexOf('serverButton(primary)') >= 0 && promoted.indexOf('serverButton(primary)') >= 0,
    "Server must remain a separate first-column section.");
assert.ok(pluginContract.indexOf('settings-primary-navigation.js') >= 0,
    "Plugin mode must load the promoted settings navigation asset.");
assert.ok(pluginContract.indexOf('function renderBannerSettings') >= 0 && pluginContract.indexOf('function updateStopwatch') >= 0,
    "The complete Portal contract must retain banner and update stopwatch support.");

console.log("Portal promoted settings navigation: OK");

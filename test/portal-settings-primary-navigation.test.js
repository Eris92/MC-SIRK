"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var sourcePath = path.join(root, "public/vendor/sirk-portal/settings-primary-navigation.js");
var source = fs.readFileSync(sourcePath, "utf8");
var standaloneLoader = fs.readFileSync(path.join(root, "public/portal/vendor/portal-ui-contract.js"), "utf8");
var pluginLoader = fs.readFileSync(path.join(root, "public/vendor/sirk-portal/portal-ui-contract.js"), "utf8");

assert.ok(source.indexOf("data-settings-base-primary") >= 0,
    "The technical Settings button must be retained for the existing renderer.");
assert.ok(source.indexOf("data-server-base-primary") >= 0,
    "The technical Server button must be retained behind a promoted proxy.");
assert.ok(source.indexOf("hideTechnical(base") >= 0 && source.indexOf("hideTechnical(server") >= 0,
    "Technical primary buttons must not remain visible.");
assert.ok(source.indexOf("data-settings-root-menu") >= 0,
    "Promoted settings sections must use a protected first-column container.");
["modules", "portal", "integrations", "server"].forEach(function (key) {
    assert.ok(source.indexOf('rootButton(host, "' + key + '")') >= 0,
        "Missing promoted first-column section: " + key);
});
assert.ok(source.indexOf("min-height:42px") >= 0 && source.indexOf("pointer-events:auto") >= 0,
    "Promoted navigation rows must expose a large, fully clickable target.");
assert.ok(source.indexOf("function activateRoot(key)") >= 0 && source.indexOf("if (target && !active(target)) target.click()") >= 0,
    "Promoted sections must resolve and activate the current technical renderer button.");
assert.ok(source.indexOf("project(secondary)") >= 0,
    "The second column must be projected from the selected first-column section.");
assert.ok(source.indexOf("sirk-settings-primary-projected>summary") >= 0,
    "The former second-column root heading must be hidden after promotion.");
assert.ok(source.indexOf('attributeFilter: ["class"]') >= 0,
    "The observer must not watch attributes that are written by every projection pass.");
assert.ok(source.indexOf('attributeFilter: ["class", "open", "hidden"]') < 0,
    "The navigation must not recreate the previous hidden/open mutation loop.");
assert.ok(source.indexOf("if (button.textContent !== text) button.textContent = text") >= 0,
    "Navigation labels must only be rewritten when the language actually changes.");
assert.ok(source.indexOf("sirkCollapseIsolationStyle") >= 0,
    "The Portal must install an explicit collapse-state isolation contract.");
assert.ok(source.indexOf("#sirkStandaloneRoot.is-collapsed .sirk-portal-view-management:not(.is-collapsed)") >= 0,
    "Collapsing the main Portal sidebar must restore the normal Management columns.");
assert.ok(source.indexOf("sirk-management-primary-collapsed") >= 0 && source.indexOf('layout.classList.toggle("is-collapsed", collapsed)') >= 0,
    "Management must copy only its own local collapse state to its layout.");
assert.ok(source.indexOf('new MutationObserver(schedule).observe(shellRoot') >= 0,
    "Main sidebar changes must be observed independently from Management content changes.");
assert.ok(standaloneLoader.indexOf("settings-primary-navigation.js") >= 0,
    "Standalone Portal must load the shared promoted navigation asset.");
assert.ok(pluginLoader.indexOf("settings-primary-navigation.js") >= 0,
    "Plugin Portal must load the shared promoted navigation asset.");

console.log("Portal promoted settings navigation and collapse isolation: OK");
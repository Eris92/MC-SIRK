"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var admin = fs.readFileSync(path.join(root, "web/admin/admin.js"), "utf8");

assert.ok(admin.indexOf('window.nightMode === true') >= 0,
    "Admin theme detection must honor the MeshCentral nightMode runtime signal.");
assert.ok(admin.indexOf('document.body.classList.contains("night")') >= 0,
    "Admin theme detection must honor the Classic/Modern body.night signal.");
assert.ok(admin.indexOf('new MutationObserver(syncHostTheme)') >= 0,
    "Host theme changes must use one direct mutation callback, not polling.");
assert.ok(admin.indexOf('attributeFilter: ["class", "data-bs-theme"]') >= 0,
    "Theme observer must watch both host class and Modern data-bs-theme attributes.");
assert.ok(admin.indexOf('observer.observe(document.documentElement') >= 0 &&
    admin.indexOf('observer.observe(document.body') >= 0,
    "Theme observer must cover both documentElement and body host signals.");
assert.ok(admin.indexOf('root.setAttribute("data-host-theme", theme)') >= 0 &&
    admin.indexOf('root.parentElement.setAttribute("data-sirk-host-theme", theme)') >= 0,
    "Theme synchronization must update only the existing admin theme attributes.");
assert.strictEqual(admin.indexOf('setInterval('), -1,
    "Admin host theme synchronization must not poll.");
var observerStart = admin.indexOf('function observeHostTheme()');
var activateStart = admin.indexOf('function activate(', observerStart);
var observerBody = admin.slice(observerStart, activateStart);
assert.strictEqual(observerBody.indexOf('render('), -1,
    "Theme changes must not rerender admin content or reset form state.");
assert.strictEqual(observerBody.indexOf('fetchJson('), -1,
    "Theme changes must not issue network requests.");
console.log("Admin follows canonical MeshCentral host theme signals without polling/rerender: OK");

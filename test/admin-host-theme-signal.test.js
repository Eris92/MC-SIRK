"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var admin = fs.readFileSync(path.join(root, "web/admin/admin.js"), "utf8");
var adminCss = fs.readFileSync(path.join(root, "web/admin/admin.css"), "utf8");

var htmlThemeCheck = admin.indexOf('document.documentElement.getAttribute("data-bs-theme")');
var nightModeCheck = admin.indexOf('typeof window.nightMode === "boolean"');
assert.ok(htmlThemeCheck >= 0 && htmlThemeCheck < nightModeCheck &&
    admin.indexOf('if (htmlTheme === "dark") return true;') >= 0 &&
    admin.indexOf('if (htmlTheme === "light") return false;') >= 0,
    "Admin theme detection must honor the effective Modern data-bs-theme signal before weaker fallbacks.");
assert.ok(admin.indexOf('document.body.getAttribute("data-bs-theme")') >= 0,
    "Admin theme detection must also accept a body-level data-bs-theme host signal.");
assert.ok(admin.indexOf('typeof window.nightMode === "boolean"') >= 0 &&
    admin.indexOf('return window.nightMode;') >= 0,
    "Admin theme detection must preserve the MeshCentral nightMode runtime fallback.");
assert.ok(admin.indexOf('document.body.classList.contains("night")') >= 0,
    "Admin theme detection must preserve the Classic/Modern body.night fallback.");
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
assert.ok(adminCss.indexOf('.sirk-admin-host{background-color:var(--bs-body-bg,Canvas)!important;color:var(--bs-body-color,CanvasText)!important}') >= 0 &&
    adminCss.indexOf('[data-sirk-host-theme="dark"]') >= 0 &&
    adminCss.indexOf('color-scheme:dark') >= 0 &&
    adminCss.indexOf('color-scheme:light') >= 0,
    "The existing admin host owner must consume the synchronized theme using host/system tokens without a private palette.");
assert.strictEqual(admin.indexOf('setInterval('), -1,
    "Admin host theme synchronization must not poll.");
var observerStart = admin.indexOf('function observeHostTheme()');
var observerEnd = admin.indexOf('function element(', observerStart);
var observerBody = admin.slice(observerStart, observerEnd);
assert.strictEqual(observerBody.indexOf('render('), -1,
    "Theme changes must not rerender admin content or reset form state.");
assert.strictEqual(observerBody.indexOf('fetchJson('), -1,
    "Theme changes must not issue network requests.");
console.log("Admin follows effective MeshCentral host theme signals without polling/rerender: OK");

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var admin = fs.readFileSync(path.join(root, "web/admin/admin.js"), "utf8");
var adminCss = fs.readFileSync(path.join(root, "web/admin/admin.css"), "utf8");

assert.ok(admin.indexOf("var hostWindow = window;") >= 0 &&
    admin.indexOf("var hostDocument = document;") >= 0 &&
    admin.indexOf("window.parent && window.parent !== window && window.parent.document") >= 0 &&
    admin.indexOf("hostWindow = window.parent;") >= 0 &&
    admin.indexOf("hostDocument = window.parent.document;") >= 0,
    "Admin iframe must bind theme synchronization to the same-origin MeshCentral parent document when available.");

var nightModeCheck = admin.indexOf('typeof hostWindow.nightMode === "boolean"');
var htmlThemeCheck = admin.indexOf('hostDocument.documentElement.getAttribute("data-bs-theme")');
assert.ok(htmlThemeCheck >= 0 && nightModeCheck > htmlThemeCheck,
    "Explicit parent data-bs-theme must win over a stale legacy nightMode value when Modern MeshCentral exposes it.");

var hostThemeStart = admin.indexOf("function hostSurfaceStyle()");
var hostThemeEnd = admin.indexOf("function syncHostTheme()", hostThemeStart);
var hostThemeSource = admin.slice(hostThemeStart, hostThemeEnd);
var evaluateHostTheme = new Function("hostWindow", "hostDocument", "colorParts", hostThemeSource + "\nreturn hostIsDark();");
function fakeDocument(theme) {
    return {
        documentElement: { getAttribute: function (name) { return name === "data-bs-theme" ? theme : null; } },
        body: {
            getAttribute: function () { return null; },
            classList: { contains: function () { return false; } }
        }
    };
}
assert.strictEqual(evaluateHostTheme({ nightMode: false }, fakeDocument("dark"), function () { return null; }), true,
    "Modern parent dark data-bs-theme must override stale nightMode=false.");
assert.strictEqual(evaluateHostTheme({ nightMode: true }, fakeDocument("light"), function () { return null; }), false,
    "Modern parent light data-bs-theme must override stale nightMode=true.");
assert.ok(admin.indexOf('hostBody && hostBody.classList.contains("night")') >= 0,
    "Admin theme detection must honor the parent MeshCentral body.night state.");
assert.ok(admin.indexOf('themeStylesheet && background') >= 0 && admin.indexOf('hostWindow.localStorage && hostWindow.localStorage.getItem("nightMode")') >= 0 &&
    admin.indexOf('hostWindow.matchMedia("(prefers-color-scheme: dark)")') >= 0,
    "Stored/system theme fallbacks must use the host window, not the iframe window.");

assert.ok(admin.indexOf('new hostWindow.MutationObserver(syncHostTheme)') >= 0,
    "Host theme changes must reuse one direct observer in the parent window realm.");
assert.ok(admin.indexOf('observer.observe(hostDocument.documentElement') >= 0 &&
    admin.indexOf('observer.observe(hostDocument.body') >= 0 &&
    admin.indexOf('attributeFilter: ["class", "data-bs-theme"]') >= 0,
    "The single observer must watch the actual parent host theme attributes/classes.");
assert.ok(admin.indexOf('hostDocument.getElementById("theme-stylesheet")') >= 0 &&
    admin.indexOf('observer.observe(themeStylesheet, { attributes: true, attributeFilter: ["href"] })') >= 0 &&
    admin.indexOf('themeStylesheet.addEventListener("load", syncHostTheme)') >= 0,
    "The same observer must follow Modern MeshCentral Bootswatch href changes and resync after the stylesheet loads.");
assert.ok(admin.indexOf('hostDocument.getElementById("p43iframe")') >= 0 &&
    admin.indexOf('candidate = candidate && candidate.parentElement ? candidate.parentElement : null;') >= 0 &&
    admin.indexOf('colorParts(candidateStyle.backgroundColor)') >= 0,
    "Admin must resolve the actual opaque page-43 surface surrounding the plugin iframe instead of assuming parent.body is the painted surface.");
assert.ok(admin.indexOf('var surface = hostSurfaceStyle();') >= 0 &&
    admin.indexOf('root.parentElement.style.backgroundColor = hostStyle.backgroundColor || "";') >= 0 &&
    admin.indexOf('root.parentElement.style.color = hostStyle.color || "";') >= 0,
    "The iframe Admin body must copy effective page-43 surface colors instead of owning a private palette.");
assert.ok(admin.indexOf('root.setAttribute("data-host-theme", theme)') >= 0 &&
    admin.indexOf('root.parentElement.setAttribute("data-sirk-host-theme", theme)') >= 0,
    "Theme synchronization must keep the existing semantic theme attributes current.");

assert.strictEqual(adminCss.indexOf('.sirk-admin-host{background-color:'), -1,
    "Admin CSS must not force a Bootstrap/system background that can diverge from the host iframe parent.");
assert.ok(adminCss.indexOf('[data-sirk-host-theme="dark"]') >= 0 &&
    adminCss.indexOf('color-scheme:dark') >= 0 &&
    adminCss.indexOf('color-scheme:light') >= 0,
    "Admin may retain color-scheme semantics without a separate light/dark palette.");
assert.strictEqual(admin.indexOf('setInterval('), -1,
    "Admin host theme synchronization must not poll.");

var observerStart = admin.indexOf('function observeHostTheme()');
var observerEnd = admin.indexOf('function element(', observerStart);
var observerBody = admin.slice(observerStart, observerEnd);
assert.strictEqual(observerBody.indexOf('render('), -1,
    "Theme changes must not rerender admin content or reset unsaved form state.");
assert.strictEqual(observerBody.indexOf('fetch('), -1,
    "Theme changes must not issue backend requests.");

console.log("Admin follows the parent MeshCentral theme owner without polling/rerender: OK");

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
assert.ok(admin.indexOf('hostBody && hostBody.classList.contains("night")') >= 0,
    "Classic MeshCentral body.night must remain an authoritative host state.");
assert.ok(admin.indexOf('hostWindow.localStorage && hostWindow.localStorage.getItem("nightMode")') >= 0 &&
    admin.indexOf('hostWindow.matchMedia("(prefers-color-scheme: dark)")') >= 0,
    "Stored/system fallbacks must use the host window, not the iframe window.");

var hostThemeStart = admin.indexOf("function hostBodyStyle()");
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

assert.ok(admin.indexOf("function hostBodyStyle()") >= 0 &&
    admin.indexOf("hostWindow.getComputedStyle(hostBody)") >= 0,
    "Admin must copy the canonical MeshCentral body paint that current Classic/Modern setNightMode updates.");
assert.strictEqual(admin.indexOf('hostDocument.getElementById("p43iframe")'), -1,
    "Admin must not infer theme from an arbitrary opaque page-43 ancestor that can remain stale during live switching.");
assert.strictEqual(admin.indexOf("theme-stylesheet"), -1,
    "Admin light/dark synchronization must not depend on Bootswatch stylesheet replacement heuristics.");

var observerConstructors = admin.match(/new hostWindow\.MutationObserver/g) || [];
assert.strictEqual(observerConstructors.length, 1,
    "Host theme changes must reuse one bounded parent observer.");
assert.ok(admin.indexOf("new hostWindow.MutationObserver(syncHostTheme)") >= 0,
    "The single observer must call only the existing theme synchronizer; no second lifecycle owner is allowed.");
assert.ok(admin.indexOf('observer.observe(hostDocument.documentElement, { attributes: true, attributeFilter: ["class", "data-bs-theme"] })') >= 0,
    "Modern html data-bs-theme/class changes must be observed directly.");
assert.ok(admin.indexOf('observer.observe(hostDocument.body, { attributes: true, attributeFilter: ["class", "style", "data-bs-theme"] })') >= 0,
    "Classic/Modern body class + inline background mutations from setNightMode must be observed directly.");
assert.strictEqual(admin.indexOf("observer.observe(hostDocument.head"), -1,
    "Theme owner must not observe the whole host head.");
assert.strictEqual(admin.indexOf("observedStylesheet"), -1,
    "Theme owner must not maintain stylesheet replacement state.");
assert.strictEqual(admin.indexOf("observedSurface"), -1,
    "Theme owner must not maintain speculative page-43 surface state.");

assert.ok(admin.indexOf('root.parentElement.style.backgroundColor = hostStyle.backgroundColor || "";') >= 0 &&
    admin.indexOf('root.parentElement.style.color = hostStyle.color || "";') >= 0,
    "The iframe body must copy effective host body colors instead of owning a private palette.");
assert.ok(admin.indexOf('root.setAttribute("data-host-theme", theme)') >= 0 &&
    admin.indexOf('root.parentElement.setAttribute("data-sirk-host-theme", theme)') >= 0,
    "Theme synchronization must keep semantic theme attributes current.");

assert.strictEqual(adminCss.indexOf('.sirk-admin-host{background-color:'), -1,
    "Admin CSS must not force a separate background palette.");
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

console.log("Admin follows canonical MeshCentral html/body theme owner signals without speculative surface tracking: OK");

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "plugin-main.js"), "utf8");
var start = source.indexOf("obj.goPageStart = function (view)");
var end = source.indexOf("obj.onDeviceRefreshEnd = function", start);
assert.ok(start >= 0 && end > start, "Native page lifecycle hook block must exist.");
var hooks = source.slice(start, end);

assert.ok(hooks.indexOf('var adminStateKey = "sirkPlatform.admin.active"') >= 0 &&
    hooks.indexOf('Number(view) === 43') >= 0 &&
    hooks.indexOf('document.getElementById("p43iframe")') >= 0,
    "The existing page-43 lifecycle must track Admin ownership without a new event owner.");
assert.ok(hooks.indexOf('new URL(frameSource, window.location.href)') >= 0 &&
    hooks.indexOf('/\\/pluginadmin\\.ashx$/i.test(frameUrl.pathname)') >= 0 &&
    hooks.indexOf('frameUrl.searchParams.get("pin")') >= 0 &&
    hooks.indexOf('window.__SIRK_PLATFORM_PIN__ || "SIRKPortal"') >= 0,
    "Only the SIRK pluginadmin iframe may arm refresh recovery.");
assert.ok(hooks.indexOf('window.sessionStorage.removeItem(adminStateKey)') >= 0,
    "Leaving page 43 or opening another plugin must clear SIRK Admin ownership.");

var endStart = hooks.indexOf("obj.goPageEnd = function (view)");
var pageEnd = hooks.slice(endStart);
assert.ok(pageEnd.indexOf('window.sessionStorage.getItem("sirkPlatform.admin.active") === "1"') >= 0 &&
    pageEnd.indexOf('if (adminFrame && !frameSource)') >= 0,
    "F5 recovery must require prior SIRK ownership and an actually empty native iframe.");
assert.ok(pageEnd.indexOf('new URL("pluginadmin.ashx", window.location.href)') >= 0 &&
    pageEnd.indexOf('adminUrl.searchParams.set("pin", String(window.__SIRK_PLATFORM_PIN__ || "SIRKPortal"))') >= 0 &&
    pageEnd.indexOf('adminFrame.src = adminUrl.href') >= 0 &&
    pageEnd.indexOf('adminTitle.textContent = "SIRK Management Platform"') >= 0,
    "The existing page-end hook must restore the SIRK iframe and title after native viewmode=43 reload loss.");
assert.strictEqual(hooks.indexOf("setTimeout("), -1,
    "Admin refresh recovery must not add a readiness timer.");
assert.strictEqual(hooks.indexOf("MutationObserver"), -1,
    "Admin refresh recovery must not add a DOM observer.");

console.log("SIRK Admin page-43 refresh recovery is scoped and lifecycle-owned: OK");

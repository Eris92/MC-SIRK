"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var pluginMain = require("../plugin-main.js");

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
assert.ok(hooks.indexOf('window.sessionStorage.setItem(adminStateKey, ownPin)') >= 0,
    "The refresh marker must retain the exact SIRK plugin pin, not a generic boolean.");
assert.ok(hooks.indexOf('window.sessionStorage.removeItem(adminStateKey)') >= 0,
    "Leaving page 43 or opening another plugin must clear SIRK Admin ownership.");

var pageEndStart = hooks.indexOf("obj.goPageEnd = function (view)");
var pageEnd = hooks.slice(pageEndStart);
assert.strictEqual(pageEnd.indexOf('document.getElementById("p43iframe")'), -1,
    "goPageEnd must not duplicate Admin F5 restoration; startup owns recovery.");
assert.strictEqual(pageEnd.indexOf("sessionStorage"), -1,
    "goPageEnd must remain free of duplicate Admin ownership state.");

var startupHook = pluginMain.createSerializedStartupHook("9.9.9", "SIRKPortal");
var startupSource = startupHook.toString();
assert.ok(startupSource.indexOf("restoreOwnedAdminFrame") >= 0 &&
    startupSource.indexOf('sessionStorage.getItem(adminStateKey) !== browserPin') >= 0 &&
    startupSource.indexOf('searchParams.get("viewmode")') >= 0,
    "The canonical startup hook must own one-shot F5 recovery for the exact SIRK page-43 session.");
assert.strictEqual(startupSource.indexOf("setTimeout("), -1,
    "Admin refresh recovery must not add a readiness timer.");
assert.strictEqual(startupSource.indexOf("MutationObserver"), -1,
    "Admin refresh recovery must not add a DOM observer.");

function runStartup(marker, viewmode, initialFrameSource) {
    var frame = {
        src: initialFrameSource || "",
        getAttribute: function (name) { return name === "src" ? (initialFrameSource || "") : null; }
    };
    var title = { textContent: "" };
    var storage = {
        value: marker,
        getItem: function (key) { return key === "sirkPlatform.admin.active" ? this.value : null; },
        setItem: function (key, value) { if (key === "sirkPlatform.admin.active") this.value = value; },
        removeItem: function (key) { if (key === "sirkPlatform.admin.active") this.value = null; }
    };
    var documentStub = {
        documentElement: { classList: { add: function () {} }, appendChild: function () {} },
        head: { appendChild: function () {} },
        getElementById: function (id) {
            if (id === "p43iframe") return frame;
            if (id === "p43title") return title;
            return null;
        },
        createElement: function () {
            return {
                setAttribute: function () {},
                addEventListener: function () {},
                remove: function () {}
            };
        }
    };
    var windowStub = {
        location: { href: "https://mesh.example/?viewmode=" + viewmode },
        sessionStorage: storage,
        console: { error: function () {} }
    };
    var previousWindow = global.window;
    var previousDocument = global.document;
    try {
        global.window = windowStub;
        global.document = documentStub;
        startupHook();
    } finally {
        if (previousWindow === undefined) delete global.window; else global.window = previousWindow;
        if (previousDocument === undefined) delete global.document; else global.document = previousDocument;
    }
    return { frame: frame, title: title, storage: storage };
}

var restored = runStartup("SIRKPortal", 43, "");
assert.ok(/pluginadmin\.ashx\?pin=SIRKPortal/.test(restored.frame.src),
    "F5 startup must restore the SIRK Admin iframe when page 43 is empty and SIRK owned the prior session.");
assert.strictEqual(restored.title.textContent, "SIRK Management Platform",
    "F5 startup must restore the SIRK Admin title together with the iframe.");

var wrongView = runStartup("SIRKPortal", 42, "");
assert.strictEqual(wrongView.frame.src, "",
    "A stored SIRK marker must not load Admin when the current URL is not page 43.");

var otherPlugin = runStartup("OtherPlugin", 43, "");
assert.strictEqual(otherPlugin.frame.src, "",
    "A different plugin ownership marker must not be replaced by SIRK.");

var populated = runStartup("SIRKPortal", 43, "https://mesh.example/pluginadmin.ashx?pin=OtherPlugin");
assert.strictEqual(populated.frame.src, "https://mesh.example/pluginadmin.ashx?pin=OtherPlugin",
    "SIRK must never overwrite an already populated Admin iframe during startup.");

console.log("SIRK Admin page-43 refresh recovery is startup-owned, scoped and functional: OK");

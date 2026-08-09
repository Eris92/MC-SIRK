"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var rootPath = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(rootPath, "web/admin/admin.js"), "utf8");
var start = source.indexOf("var hostWindow = window;");
var end = source.indexOf("function element(", start);
assert.ok(start >= 0 && end > start, "Admin theme owner fragment must exist.");
var themeSource = source.slice(start, end);

function attributes() {
    var values = Object.create(null);
    return {
        setAttribute: function (name, value) { values[name] = String(value); },
        getAttribute: function (name) { return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : null; },
        values: values
    };
}

var rootAttrs = attributes();
var parentAttrs = attributes();
var rootParent = {
    classList: { add: function () {} },
    setAttribute: parentAttrs.setAttribute,
    getAttribute: parentAttrs.getAttribute,
    style: {}
};
var adminRoot = {
    parentElement: rootParent,
    setAttribute: rootAttrs.setAttribute,
    getAttribute: rootAttrs.getAttribute
};

var dark = false;
var bodyAttrs = attributes();
var htmlAttrs = attributes();
var hostBody = {
    classList: { contains: function (name) { return name === "night" && dark; } },
    getAttribute: bodyAttrs.getAttribute
};
var hostHtml = { getAttribute: htmlAttrs.getAttribute };
var hostDocument = { body: hostBody, documentElement: hostHtml };
var observerCallbacks = [];
function HostMutationObserver(callback) { observerCallbacks.push(callback); }
HostMutationObserver.prototype.observe = function () {};

var hostWindow = {
    document: hostDocument,
    nightMode: false,
    MutationObserver: HostMutationObserver,
    localStorage: { getItem: function () { return dark ? "1" : "2"; } },
    matchMedia: function () { return { matches: dark, addEventListener: function () {} }; },
    getComputedStyle: function () {
        return dark
            ? { backgroundColor: "rgb(0, 0, 0)", color: "rgb(255, 255, 255)" }
            : { backgroundColor: "rgb(211, 217, 214)", color: "rgb(0, 0, 0)" };
    }
};
var iframeWindow = { parent: hostWindow };
var iframeDocument = {};
var draft = { value: "unsaved-change" };

var context = {
    window: iframeWindow,
    document: iframeDocument,
    root: adminRoot,
    draft: draft,
    String: String,
    Number: Number
};
vm.runInNewContext(themeSource + "\nobserveHostTheme();", context, { filename: "admin-theme-fragment.js" });

assert.strictEqual(rootAttrs.values["data-host-theme"], "light", "Initial parent light state must reach the Admin iframe.");
assert.strictEqual(parentAttrs.values["data-sirk-host-theme"], "light", "Initial parent light state must reach the Admin host surface.");
assert.strictEqual(rootParent.style.backgroundColor, "rgb(211, 217, 214)");
assert.strictEqual(rootParent.style.color, "rgb(0, 0, 0)");
assert.strictEqual(observerCallbacks.length, 1, "Exactly one parent theme observer must be installed.");

hostWindow.nightMode = true;
dark = true;
observerCallbacks[0]();
assert.strictEqual(rootAttrs.values["data-host-theme"], "dark", "Light -> dark must update without iframe reload.");
assert.strictEqual(parentAttrs.values["data-sirk-host-theme"], "dark");
assert.strictEqual(rootParent.style.backgroundColor, "rgb(0, 0, 0)");
assert.strictEqual(rootParent.style.color, "rgb(255, 255, 255)");
assert.strictEqual(draft.value, "unsaved-change", "Theme synchronization must not touch unsaved form state.");

hostWindow.nightMode = false;
dark = false;
observerCallbacks[0]();
assert.strictEqual(rootAttrs.values["data-host-theme"], "light", "Dark -> light must update without iframe reload.");
assert.strictEqual(parentAttrs.values["data-sirk-host-theme"], "light");
assert.strictEqual(rootParent.style.backgroundColor, "rgb(211, 217, 214)");
assert.strictEqual(rootParent.style.color, "rgb(0, 0, 0)");
assert.strictEqual(observerCallbacks.length, 1, "Repeated switches must not create additional observers.");
assert.strictEqual(draft.value, "unsaved-change");

console.log("Admin parent light/dark runtime synchronization preserves form state: OK");

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
var stalePage43Surface = { parentElement: null };
var hostIframe = { parentElement: stalePage43Surface };
var hostDocument = {
    body: hostBody,
    documentElement: hostHtml,
    getElementById: function (id) { return id === "p43iframe" ? hostIframe : null; }
};
var observerCallbacks = [];
var observed = [];
function HostMutationObserver(callback) { observerCallbacks.push(callback); }
HostMutationObserver.prototype.observe = function (target, options) { observed.push({ target: target, options: options }); };

var hostWindow = {
    document: hostDocument,
    nightMode: false,
    MutationObserver: HostMutationObserver,
    localStorage: { getItem: function () { return dark ? "1" : "2"; } },
    matchMedia: function () { return { matches: dark, addEventListener: function () {} }; },
    getComputedStyle: function (target) {
        if (target === stalePage43Surface) return { backgroundColor: "rgb(255, 255, 255)", color: "rgb(0, 0, 0)" };
        assert.strictEqual(target, hostBody, "Admin must copy the canonical host body style, not an arbitrary page-43 ancestor.");
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
assert.strictEqual(rootParent.style.backgroundColor, "rgb(211, 217, 214)", "Iframe body must copy the actual MeshCentral body surface.");
assert.strictEqual(rootParent.style.color, "rgb(0, 0, 0)");
assert.strictEqual(observerCallbacks.length, 1, "Exactly one parent theme observer must be installed.");
assert.strictEqual(observed.length, 2, "Only the canonical host html/body theme owners must be observed.");
assert.ok(observed.some(function (item) {
    return item.target === hostBody && item.options.attributeFilter.indexOf("style") >= 0;
}), "Classic/Modern setNightMode writes the host body inline background, so body style must be an observed owner signal.");

hostWindow.nightMode = true;
dark = true;
htmlAttrs.setAttribute("data-bs-theme", "dark");
observerCallbacks[0]();
assert.strictEqual(rootAttrs.values["data-host-theme"], "dark", "Light -> dark must update without iframe reload.");
assert.strictEqual(parentAttrs.values["data-sirk-host-theme"], "dark");
assert.strictEqual(rootParent.style.backgroundColor, "rgb(0, 0, 0)", "A stale opaque page-43 ancestor must not keep the iframe white.");
assert.strictEqual(rootParent.style.color, "rgb(255, 255, 255)");
assert.strictEqual(draft.value, "unsaved-change", "Theme synchronization must not touch unsaved form state.");

hostWindow.nightMode = false;
dark = false;
htmlAttrs.setAttribute("data-bs-theme", "light");
observerCallbacks[0]();
assert.strictEqual(rootAttrs.values["data-host-theme"], "light", "Dark -> light must update without iframe reload.");
assert.strictEqual(parentAttrs.values["data-sirk-host-theme"], "light");
assert.strictEqual(rootParent.style.backgroundColor, "rgb(211, 217, 214)");
assert.strictEqual(rootParent.style.color, "rgb(0, 0, 0)");
assert.strictEqual(observerCallbacks.length, 1, "Repeated switches must not create additional observers.");
assert.strictEqual(draft.value, "unsaved-change");

console.log("Admin theme sync follows canonical MeshCentral body state and ignores stale page-43 ancestor paint: OK");

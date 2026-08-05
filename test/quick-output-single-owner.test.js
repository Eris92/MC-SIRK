"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var toolbarApiSource = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar-api.js"), "utf8");
var outputStateSource = fs.readFileSync(path.join(root, "public", "native", "quick-output-state.js"), "utf8");

function classList(initial) {
    var values = {};
    String(initial || "").split(/\s+/).filter(Boolean).forEach(function (name) { values[name] = true; });
    return {
        add: function (name) { values[name] = true; },
        remove: function (name) { delete values[name]; },
        toggle: function (name, enabled) { values[name] = enabled === true; },
        contains: function (name) { return values[name] === true; }
    };
}

var quickHost = { classList: classList("sirk-quick-command-toolbar-host") };
var clicks = 0;
var originalClick = function () { clicks += 1; };
var button = {
    title: "Ukryj wynik",
    onclick: originalClick,
    classList: classList(),
    attributes: {},
    closest: function (selector) { return selector === ".sirk-quick-command-toolbar-host" ? quickHost : null; },
    setAttribute: function (name, value) { this.attributes[name] = String(value); },
    getAttribute: function (name) { return this.attributes[name] || null; }
};
var browser = { classList: classList() };
var panel = {
    attributes: {},
    querySelector: function (selector) {
        if (selector === ".sirk-quick-command-details-toggle") return button;
        if (selector === ".sirk-quick-command-browser") return browser;
        if (selector === ".sirk-quick-command-status") return null;
        return null;
    },
    querySelectorAll: function () { return [button]; },
    setAttribute: function (name, value) { this.attributes[name] = String(value); },
    removeAttribute: function (name) { delete this.attributes[name]; }
};

var elements = {};
var documentObject = {
    documentElement: { appendChild: function (item) { if (item.id) elements[item.id] = item; } },
    head: { appendChild: function (item) { if (item.id) elements[item.id] = item; } },
    getElementById: function (id) { return elements[id] || null; },
    createElement: function () { return { classList: classList(), appendChild: function () {} }; },
    querySelectorAll: function () { return [panel]; }
};
var stored = { "mc-sirk-quickcommands-output-hidden-v2": "1" };
var windowObject = {
    document: documentObject,
    localStorage: {
        getItem: function (key) { return Object.prototype.hasOwnProperty.call(stored, key) ? stored[key] : null; },
        setItem: function (key, value) { stored[key] = String(value); }
    },
    setTimeout: function (callback) { callback(); return 1; },
    clearTimeout: function () {}
};
windowObject.window = windowObject;

var context = {
    window: windowObject,
    document: documentObject,
    MutationObserver: function () { this.observe = function () {}; },
    Promise: Promise,
    AbortController: typeof AbortController === "function" ? AbortController : undefined,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    RegExp: RegExp,
    JSON: JSON,
    setTimeout: windowObject.setTimeout,
    clearTimeout: windowObject.clearTimeout
};

vm.runInNewContext(toolbarApiSource, context, { filename: "toolbar-api.js" });
var api = windowObject.SharedToolbarApi.create({
    root: { closest: function () { return null; } },
    buttons: { details: button },
    groups: {},
    state: {},
    searchInput: {},
    searchWrap: {},
    onSearch: null
});
api.setTitle("details", "Pokaż wynik");
api.setActive("details", false);

assert.strictEqual(button.__sirkStableOutputState, true,
    "The Quick toolbar API must mark the details button as the canonical click owner.");

vm.runInNewContext(outputStateSource, context, { filename: "quick-output-state.js" });

assert.strictEqual(button.onclick, originalClick,
    "The output-state observer must not wrap a button already owned by the Quick toolbar.");
assert.strictEqual(button.title, "Pokaż wynik");
assert.strictEqual(button.attributes["aria-pressed"], "false");

button.onclick();
assert.strictEqual(clicks, 1,
    "One user click must invoke exactly one Quick output handler.");

console.log("Quick output single click owner: OK");

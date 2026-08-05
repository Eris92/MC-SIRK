"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(path.join(__dirname, "..", "public", "native", "quick-output-state.js"), "utf8");
var values = {
    "mc-sirk-quickcommands-output-hidden-v2": "1",
    "mc-sirk-quickcommands-details-collapsed": "0"
};

function classList() {
    var values = {};
    return {
        add: function (name) { values[name] = true; },
        toggle: function (name, enabled) { values[name] = enabled === true; },
        contains: function (name) { return values[name] === true; }
    };
}

var button = {
    title: "Ukryj wynik",
    onclick: function () {},
    classList: classList(),
    attributes: { "aria-pressed": "true" },
    setAttribute: function (name, value) { this.attributes[name] = String(value); }
};
button.classList.add("is-active");

var browser = { classList: classList() };
var panel = {
    attributes: {},
    querySelector: function (selector) {
        if (selector === ".sirk-quick-command-details-toggle") return null;
        if (selector === ".sirk-quick-command-browser") return browser;
        if (selector === ".sirk-quick-command-status") return null;
        return null;
    },
    querySelectorAll: function () { return [button]; },
    setAttribute: function (name, value) { this.attributes[name] = String(value); },
    removeAttribute: function (name) { delete this.attributes[name]; }
};
var documentObject = {
    documentElement: { appendChild: function () {} },
    head: { appendChild: function () {} },
    getElementById: function () { return { id: "sirk-quick-output-state-style" }; },
    querySelectorAll: function () { return [panel]; },
    createElement: function () { return {}; }
};
var windowObject = {
    localStorage: {
        getItem: function (key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
        setItem: function (key, value) { values[key] = String(value); }
    },
    setTimeout: function (callback) { callback(); return 1; },
    clearTimeout: function () {}
};
var context = {
    Array: Array,
    document: documentObject,
    MutationObserver: function () { this.observe = function () {}; },
    window: windowObject
};
windowObject.document = documentObject;
windowObject.window = windowObject;

vm.runInNewContext(source, context, { filename: "quick-output-state.js" });

assert.strictEqual(panel.attributes["data-sirk-output-hidden"], "1",
    "The result pane should remain hidden from the canonical state.");
assert.strictEqual(button.title, "Pokaż wynik",
    "A hidden result pane must show the Show output action on first render.");
assert.strictEqual(button.attributes["aria-label"], "Pokaż wynik",
    "The accessible button label must match the first-render action.");
assert.strictEqual(button.classList.contains("is-active"), false,
    "A hidden result pane must not leave the output button highlighted on first render.");
assert.strictEqual(button.attributes["aria-pressed"], "false",
    "A hidden result pane must expose aria-pressed=false on first render.");

button.onclick();
assert.strictEqual(button.title, "Ukryj wynik",
    "After opening the result pane the action must switch to Hide output.");
assert.strictEqual(button.attributes["aria-label"], "Ukryj wynik");
assert.strictEqual(button.classList.contains("is-active"), true,
    "An open result pane may show the output button as active.");
assert.strictEqual(button.attributes["aria-pressed"], "true");

console.log("Quick output first-render label and active-state synchronization: OK");

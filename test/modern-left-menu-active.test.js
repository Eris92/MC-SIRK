"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

function ClassList(initial) {
    this.values = String(initial || "").split(/\s+/).filter(Boolean);
}
ClassList.prototype.add = function () {
    for (var index = 0; index < arguments.length; index += 1) {
        var value = String(arguments[index]);
        if (this.values.indexOf(value) < 0) this.values.push(value);
    }
};
ClassList.prototype.remove = function () {
    for (var index = 0; index < arguments.length; index += 1) {
        var value = String(arguments[index]);
        var position = this.values.indexOf(value);
        if (position >= 0) this.values.splice(position, 1);
    }
};
ClassList.prototype.contains = function (value) {
    return this.values.indexOf(String(value)) >= 0;
};

function Element(tagName, className) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.classList = new ClassList(className);
    this.attributes = {};
}
Element.prototype.setAttribute = function (name, value) {
    this.attributes[name] = String(value);
};
Element.prototype.removeAttribute = function (name) {
    delete this.attributes[name];
};
Element.prototype.getAttribute = function (name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
};

var core = {
    ensureMenu: function () { return true; },
    setPluginMenuActive: function () {}
};
var document = {
    documentElement: { classList: new ClassList() },
    getElementById: function () { return null; }
};
var context = {
    console: console,
    document: document,
    window: {
        document: document,
        SirkPlatformCore: core
    }
};
context.window.window = context.window;

vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "page.js"), "utf8"),
    context,
    { filename: "page.js" }
);

[
    "LeftMenuSirkPlatform-myscripts",
    "LeftMenuSirkPlatform-mycommands",
    "LeftMenuSirkPlatform-approvalcenter",
    "LeftMenuSirkPlatform-moverequests"
].forEach(function (id) {
    var modern = new Element("a", "nav-link text-center text-white");
    modern.id = id;

    core.setPluginMenuActive(null, modern, true);
    assert.ok(modern.classList.contains("active"),
        id + " must retain the Bootstrap active state.");
    assert.ok(modern.classList.contains("lbbuttonsel2"),
        id + " must also receive MeshCentral's visible left-menu selection class.");
    assert.ok(!modern.classList.contains("lbbuttonsel"),
        id + " must not use the semi-active device-subpage class.");
    assert.strictEqual(modern.getAttribute("aria-current"), "page",
        id + " must expose the current-page state.");

    core.setPluginMenuActive(null, modern, false);
    assert.ok(!modern.classList.contains("active") &&
        !modern.classList.contains("lbbuttonsel") &&
        !modern.classList.contains("lbbuttonsel2"),
        id + " must clear every selected state when inactive.");
    assert.strictEqual(modern.getAttribute("aria-current"), null,
        id + " must clear aria-current when inactive.");
});

var legacy = new Element("div", "lbbutton");
core.setPluginMenuActive(null, legacy, true);
assert.ok(legacy.classList.contains("lbbuttonsel"),
    "Classic MeshCentral must preserve its compact native selected class.");
assert.ok(!legacy.classList.contains("active") && !legacy.classList.contains("lbbuttonsel2"),
    "Classic MeshCentral must not receive modern or wider selection classes.");

console.log("Modern MeshCentral left-menu active highlight: OK");

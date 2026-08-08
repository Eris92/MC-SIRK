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
        var position = this.values.indexOf(String(arguments[index]));
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

var documentObject = {
    documentElement: { classList: new ClassList() },
    querySelectorAll: function () { return []; },
    getElementById: function () { return null; }
};
var windowObject = {
    document: documentObject,
    SirkPlatformCore: {},
    location: { href: "https://mesh.example/" },
    __SIRK_PLATFORM_VERSION__: "test"
};
windowObject.window = windowObject;
var context = {
    console: console,
    document: documentObject,
    window: windowObject,
    URL: URL,
    Promise: Promise
};

vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "public", "shared", "core.js"), "utf8"),
    context,
    { filename: "core.js" }
);

var core = windowObject.SirkPlatformCore;
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
        id + " must also receive MeshCentral's visible Modern left-menu selection class.");
    assert.ok(!modern.classList.contains("lbbuttonsel"),
        id + " must not use the Classic compact selection class.");
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
    "Classic MeshCentral must use its compact native selected class from the core first-paint owner.");
assert.ok(!legacy.classList.contains("active") && !legacy.classList.contains("lbbuttonsel2"),
    "Classic MeshCentral must not receive modern or wider selection classes.");

var pageSource = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "page.js"), "utf8");
assert.strictEqual(pageSource.indexOf("core.setPluginMenuActive = function"), -1,
    "Deferred SharedPage must not replace the active-state owner after first paint.");

console.log("Canonical core Modern/Classic left-menu active highlight: OK");

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
ClassList.prototype.contains = function (value) { return this.values.indexOf(String(value)) >= 0; };
ClassList.prototype.toString = function () { return this.values.join(" "); };

function Element(tagName, className) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.id = "";
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.classList = new ClassList(className);
    this.style = {};
    this.src = "";
    this.textContent = "";
}
Object.defineProperty(Element.prototype, "className", {
    get: function () { return this.classList.toString(); },
    set: function (value) { this.classList = new ClassList(value); }
});
Object.defineProperty(Element.prototype, "firstChild", {
    get: function () { return this.children[0] || null; }
});
Object.defineProperty(Element.prototype, "nextSibling", {
    get: function () {
        if (!this.parentNode) return null;
        var index = this.parentNode.children.indexOf(this);
        return index >= 0 ? this.parentNode.children[index + 1] || null : null;
    }
});
Element.prototype.setAttribute = function (name, value) {
    this.attributes[name] = String(value);
    if (name === "id") this.id = String(value);
};
Element.prototype.getAttribute = function (name) {
    if (name === "id") return this.id || null;
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
};
Element.prototype.hasAttribute = function (name) {
    return name === "id" ? !!this.id : Object.prototype.hasOwnProperty.call(this.attributes, name);
};
Element.prototype.removeAttribute = function (name) {
    delete this.attributes[name];
    if (name === "id") this.id = "";
};
Element.prototype.appendChild = function (child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    this.children.push(child);
    child.parentNode = this;
    return child;
};
Element.prototype.insertBefore = function (child, reference) {
    if (child === reference) return child;
    if (child.parentNode) child.parentNode.removeChild(child);
    var index = reference ? this.children.indexOf(reference) : -1;
    if (index < 0) this.children.push(child); else this.children.splice(index, 0, child);
    child.parentNode = this;
    return child;
};
Element.prototype.removeChild = function (child) {
    var index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
};
Element.prototype.replaceChild = function (replacement, current) {
    var index = this.children.indexOf(current);
    if (index < 0) throw new Error("Child not found");
    if (replacement.parentNode) replacement.parentNode.removeChild(replacement);
    this.children[index] = replacement;
    replacement.parentNode = this;
    current.parentNode = null;
    return current;
};
Element.prototype.cloneNode = function (deep) {
    var copy = new Element(this.tagName, this.className);
    copy.id = this.id;
    copy.src = this.src;
    copy.textContent = this.textContent;
    Object.keys(this.attributes).forEach(function (name) { copy.attributes[name] = this.attributes[name]; }, this);
    Object.keys(this.style).forEach(function (name) { copy.style[name] = this.style[name]; }, this);
    if (deep) this.children.forEach(function (child) { copy.appendChild(child.cloneNode(true)); });
    return copy;
};
Element.prototype.querySelector = function (selector) {
    var selectors = String(selector || "").split(",").map(function (item) { return item.trim(); });
    var queue = this.children.slice();
    while (queue.length) {
        var current = queue.shift();
        for (var index = 0; index < selectors.length; index += 1) {
            var value = selectors[index];
            if (value.charAt(0) === "." && current.classList.contains(value.slice(1))) return current;
            if (value && value.charAt(0) !== "." && current.tagName.toLowerCase() === value.toLowerCase()) return current;
        }
        queue = queue.concat(current.children);
    }
    return null;
};

var html = new Element("html");
var leftHost = new Element("div");
leftHost.id = "page_leftbar";
html.appendChild(leftHost);
var nativeItem = new Element("div", "lbbutton lbbuttonsel");
nativeItem.id = "LeftMenuMyDevices";
var nativeIcon = new Element("div", "lbtg lb2");
nativeIcon.id = "native-device-icon";
nativeItem.appendChild(nativeIcon);
leftHost.appendChild(nativeItem);

function descendants(root) {
    var result = [];
    root.children.forEach(function walk(child) {
        result.push(child);
        child.children.forEach(walk);
    });
    return result;
}

var documentObject = {
    documentElement: html,
    createElement: function (tagName) { return new Element(tagName); },
    getElementById: function (id) {
        return [html].concat(descendants(html)).filter(function (item) { return item.id === id; })[0] || null;
    },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
};
var windowObject = {
    document: documentObject,
    location: { href: "https://mesh.example/" },
    SirkIconMode: { useModern: function () { return false; } },
    SirkPlatformRuntime: { state: { nativePageEnd: 1 } },
    __SIRK_PLATFORM_VERSION__: "test"
};
windowObject.window = windowObject;

vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "public", "shared", "core.js"), "utf8"),
    { window: windowObject, document: documentObject, console: console, URL: URL, Promise: Promise },
    { filename: "core.js" }
);

var definition = {
    mainId: "MainMenuSirkPlatform-approvalcenter",
    leftId: "LeftMenuSirkPlatform-approvalcenter",
    title: "Approval Center",
    viewMode: 105,
    order: 110,
    open: function () { return false; }
};
windowObject.SirkPlatformCore.ensureMenu(definition);

var pluginItem = documentObject.getElementById(definition.leftId);
var pluginIcon = pluginItem.querySelector(".lbtg");
assert.strictEqual(pluginItem.className, "lbbutton",
    "Classic SIRK entry must receive the final native base class on its first core mount.");
assert.strictEqual(pluginIcon.className, nativeIcon.className,
    "Classic SIRK icon host must preserve the native lbtg class geometry from the first mount.");
assert.strictEqual(pluginIcon.getAttribute("id"), null,
    "Cloned native icon ids must be removed to avoid duplicate DOM ids.");
assert.strictEqual(pluginIcon.style.backgroundSize, "48px 48px",
    "Classic SIRK artwork must use the enlarged native-sized drawing immediately, without a later resize pass.");
assert.strictEqual(pluginItem.getAttribute("data-sirk-icon-family"), "classic");
assert.strictEqual(pluginIcon.getAttribute("data-sirk-icon-family"), "classic");
assert.ok(pluginIcon.style.backgroundImage.indexOf("%23fff") >= 0,
    "Classic icon family must use the requested white/native artwork.");
assert.strictEqual(pluginIcon.style.backgroundImage.indexOf("%23666"), -1,
    "Classic icon family must not retain the old gray outline source.");

var firstItem = pluginItem;
var firstIcon = pluginIcon;
windowObject.SirkPlatformCore.setPluginMenuActive(null, pluginItem, true);
assert.ok(pluginItem.classList.contains("lbbuttonsel"));
assert.ok(!pluginItem.classList.contains("lbbuttonsel2"));
assert.strictEqual(pluginItem.getAttribute("aria-current"), "page");

windowObject.SirkPlatformCore.ensureMenu(definition);
assert.strictEqual(documentObject.getElementById(definition.leftId), firstItem,
    "Repeated menu reconciliation must reuse the same Classic menu node.");
assert.strictEqual(firstItem.querySelector(".lbtg"), firstIcon,
    "Repeated menu reconciliation must not replace the Classic icon host.");
assert.ok(firstItem.classList.contains("lbbuttonsel"),
    "Repeated menu reconciliation must preserve active selection instead of causing a visual jump.");

windowObject.SirkPlatformRuntime.state.nativePageEnd = null;
leftHost.removeChild(firstItem);
windowObject.SirkPlatformCore.ensureMenu(definition);
assert.strictEqual(documentObject.getElementById(definition.leftId), null,
    "A host redraw during native page startup must not recreate the SIRK menu before the current page-end signal.");

windowObject.SirkPlatformRuntime.state.nativePageEnd = 1;
windowObject.SirkPlatformCore.ensureMenu(definition);
var restoredItem = documentObject.getElementById(definition.leftId);
assert.ok(restoredItem,
    "The SIRK menu must be created once the current native page has completed.");
assert.strictEqual(leftHost.children.filter(function (item) { return item.id === definition.leftId; }).length, 1,
    "Native page completion must restore exactly one SIRK menu node after a host redraw.");

var pageSource = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "page.js"), "utf8");
assert.strictEqual(pageSource.indexOf("installNativeLeftMenuContract"), -1,
    "Deferred SharedPage must not install a second left-menu owner.");
assert.strictEqual(pageSource.indexOf("originalEnsureMenu"), -1,
    "Deferred SharedPage must not wrap core.ensureMenu after first paint.");

console.log("Classic left menu is final on native page completion with stable node, white artwork and native-sized geometry: OK");
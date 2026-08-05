"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

function ClassList() { this.values = []; }
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
ClassList.prototype.toString = function () { return this.values.join(" "); };

function Style() {
    this.cssText = "";
    this.backgroundImage = "";
    this.backgroundPosition = "";
    this.backgroundRepeat = "";
    this.backgroundSize = "";
}

function Element(tagName) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.id = "";
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.classList = new ClassList();
    this.style = new Style();
}
Object.defineProperty(Element.prototype, "className", {
    get: function () { return this.classList.toString(); },
    set: function (value) {
        this.classList.values = String(value || "").split(/\s+/).filter(Boolean);
    }
});
Object.defineProperty(Element.prototype, "firstChild", {
    get: function () { return this.children[0] || null; }
});
Element.prototype.setAttribute = function (name, value) {
    this.attributes[name] = String(value);
    if (name === "id") this.id = String(value);
    if (name === "class") this.className = value;
};
Element.prototype.getAttribute = function (name) {
    if (name === "id") return this.id || null;
    if (name === "class") return this.className || null;
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
};
Element.prototype.removeAttribute = function (name) {
    delete this.attributes[name];
    if (name === "id") this.id = "";
    if (name === "class") this.className = "";
};
Element.prototype.appendChild = function (child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    this.children.push(child);
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
    current.parentNode = null;
    replacement.parentNode = this;
    return current;
};
Element.prototype.cloneNode = function (deep) {
    var copy = new Element(this.tagName);
    copy.className = this.className;
    copy.style.cssText = this.style.cssText;
    copy.style.backgroundImage = this.style.backgroundImage;
    copy.style.backgroundPosition = this.style.backgroundPosition;
    copy.style.backgroundRepeat = this.style.backgroundRepeat;
    copy.style.backgroundSize = this.style.backgroundSize;
    Object.keys(this.attributes).forEach(function (key) {
        copy.attributes[key] = this.attributes[key];
    }, this);
    if (deep) this.children.forEach(function (child) {
        copy.appendChild(child.cloneNode(true));
    });
    return copy;
};
Element.prototype.querySelector = function (selector) {
    if (selector.charAt(0) !== ".") return null;
    var className = selector.slice(1);
    var queue = this.children.slice();
    while (queue.length) {
        var current = queue.shift();
        if (current.classList.contains(className)) return current;
        queue = queue.concat(current.children);
    }
    return null;
};

var html = new Element("html");
var leftHost = new Element("div");
leftHost.id = "page_leftbar";
html.appendChild(leftHost);

var nativeItem = new Element("div");
nativeItem.id = "LeftMenuMyDevices";
nativeItem.className = "lbbutton lbbuttonsel";
var nativeIcon = new Element("div");
nativeIcon.className = "lbtg lb2";
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

var document = {
    documentElement: html,
    getElementById: function (id) {
        return [html].concat(descendants(html)).filter(function (item) {
            return item.id === id;
        })[0] || null;
    }
};

var core = {
    ensureMenu: function (definition) {
        var item = document.getElementById(definition.leftId);
        if (!item) {
            item = nativeItem.cloneNode(true);
            item.id = definition.leftId;
            leftHost.appendChild(item);
        }
        item.classList.remove("lbbuttonsel", "lbbuttonsel2", "active");
        var icon = item.querySelector(".lbtg");
        icon.className = "lbtg";
        icon.style.backgroundImage = 'url("approval.svg")';
        icon.style.backgroundPosition = "center";
        icon.style.backgroundRepeat = "no-repeat";
        icon.style.backgroundSize = "contain";
        return true;
    },
    setPluginMenuActive: function (_main, left, active) {
        left.classList.remove("lbbuttonsel", "lbbuttonsel2", "active");
        if (active) left.classList.add("lbbuttonsel2");
    }
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

var root = path.join(__dirname, "..");
vm.runInNewContext(
    fs.readFileSync(path.join(root, "public", "shared", "ui", "page.js"), "utf8"),
    context
);

var definition = {
    leftId: "LeftMenuSirkPlatform-approvalcenter",
    title: "Approval Center"
};
core.ensureMenu(definition);

var pluginItem = document.getElementById(definition.leftId);
var pluginIcon = pluginItem.querySelector(".lbtg");
assert.strictEqual(pluginItem.className, "lbbutton",
    "Plugin entry must use the exact native base class without a custom selected variant.");
assert.strictEqual(pluginIcon.className, nativeIcon.className,
    "Plugin icon host must preserve the native lbtg class structure.");
assert.strictEqual(pluginIcon.style.backgroundImage, 'url("approval.svg")',
    "Normalizing the native icon host must preserve the module icon.");
assert.strictEqual(pluginIcon.style.backgroundPosition, "center",
    "Module icon must remain centered in the native host.");
assert.strictEqual(pluginIcon.style.backgroundSize, "40px 40px",
    "Module icon must use a fixed native-sized drawing instead of stretching to contain.");
assert.strictEqual(nativeItem.className, "lbbutton lbbuttonsel",
    "Normalizing a plugin entry must not change the native Devices item.");
assert.strictEqual(nativeIcon.className, "lbtg lb2",
    "Normalizing a plugin entry must not change the native Devices icon host.");

var originalPluginItem = pluginItem;
core.ensureMenu(definition);
assert.strictEqual(document.getElementById(definition.leftId), originalPluginItem,
    "Repeated menu synchronization must not duplicate or replace the plugin menu entry.");
assert.strictEqual(originalPluginItem.children.length, 1,
    "Repeated menu synchronization must keep exactly one native icon host.");

core.setPluginMenuActive(null, pluginItem, true);
assert.ok(pluginItem.classList.contains("lbbuttonsel"),
    "Active plugin entry must use the same lbbuttonsel class as native MeshCentral entries.");
assert.ok(!pluginItem.classList.contains("lbbuttonsel2"),
    "Active plugin entry must never use the wider lbbuttonsel2 variant.");
assert.strictEqual(pluginItem.getAttribute("aria-current"), "page",
    "Active plugin entry must expose the native current-page state.");

core.setPluginMenuActive(null, pluginItem, false);
assert.strictEqual(pluginItem.className, "lbbutton",
    "Inactive plugin entry must return to the exact native base class.");
assert.strictEqual(pluginItem.getAttribute("aria-current"), null,
    "Inactive plugin entry must clear the current-page state.");

console.log("Native MeshCentral left-menu class and icon geometry: OK");

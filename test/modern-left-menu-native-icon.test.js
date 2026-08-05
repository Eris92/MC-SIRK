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
ClassList.prototype.toString = function () { return this.values.join(" "); };

function Element(tagName, className) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.id = "";
    this.classList = new ClassList(className);
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.style = {};
}
Object.defineProperty(Element.prototype, "className", {
    get: function () { return this.classList.toString(); },
    set: function (value) { this.classList = new ClassList(value); }
});
Object.defineProperty(Element.prototype, "firstChild", {
    get: function () { return this.children[0] || null; }
});
Element.prototype.setAttribute = function (name, value) {
    this.attributes[name] = String(value);
    if (name === "id") this.id = String(value);
};
Element.prototype.getAttribute = function (name) {
    if (name === "id") return this.id || null;
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
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
    Object.keys(this.attributes).forEach(function (name) {
        copy.attributes[name] = this.attributes[name];
    }, this);
    Object.keys(this.style).forEach(function (name) {
        copy.style[name] = this.style[name];
    }, this);
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

var root = new Element("html");
var host = new Element("nav", "nav flex-column");
root.appendChild(host);
var native = new Element("a", "nav-link active text-center text-white lbbuttonsel");
native.id = "LeftMenuMyDevices";
var nativeIcon = new Element("svg", "svg-inline--fa fa-computer me-2");
native.appendChild(nativeIcon);
host.appendChild(native);

function descendants(element) {
    var result = [];
    element.children.forEach(function walk(child) {
        result.push(child);
        child.children.forEach(walk);
    });
    return result;
}

var document = {
    documentElement: root,
    createElement: function (tagName) { return new Element(tagName); },
    getElementById: function (id) {
        return [root].concat(descendants(root)).filter(function (item) { return item.id === id; })[0] || null;
    }
};

var core = {
    ensureMenu: function (definition) {
        var item = document.getElementById(definition.leftId);
        if (!item) {
            item = native.cloneNode(true);
            item.id = definition.leftId;
            host.appendChild(item);
        }
        item.classList.remove("active", "lbbuttonsel", "lbbuttonsel2");
        var current = item.querySelector("svg, i, img");
        var image = new Element("img", "sirk-platform-menu-icon");
        image.style.width = "40px";
        image.style.height = "40px";
        image.style.objectFit = "contain";
        if (current) current.parentNode.replaceChild(image, current);
        return true;
    },
    setPluginMenuActive: function () {}
};
var context = {
    console: console,
    document: document,
    window: { document: document, SirkPlatformCore: core }
};
context.window.window = context.window;

vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "page.js"), "utf8"),
    context,
    { filename: "page.js" }
);

var expected = {
    approvalcenter: "clipboard-check",
    myscripts: "file-code",
    mycommands: "terminal",
    moverequests: "right-left"
};

Object.keys(expected).forEach(function (key) {
    var definition = { leftId: "LeftMenuSirkPlatform-" + key };
    core.ensureMenu(definition);
    var item = document.getElementById(definition.leftId);
    var icon = item.querySelector("i");

    assert.strictEqual(item.className, "nav-link text-center text-white",
        key + " must use the exact inactive native anchor classes.");
    assert.strictEqual(item.querySelector("img"), null,
        key + " must not retain the custom raster/image element.");
    assert.ok(icon, key + " must use native Font Awesome source markup.");
    assert.ok(icon.classList.contains("fa-solid") && icon.classList.contains("fa-" + expected[key]),
        key + " must use its native Font Awesome glyph.");
    assert.ok(icon.classList.contains("me-2"),
        key + " must inherit the same icon spacing class as MeshCentral entries.");
    assert.strictEqual(icon.style.width, undefined,
        key + " must not set a custom icon width.");
    assert.strictEqual(icon.style.height, undefined,
        key + " must not set a custom icon height.");
    assert.strictEqual(icon.style.objectFit, undefined,
        key + " must not use image-specific sizing.");

    core.setPluginMenuActive(null, item, true);
    assert.ok(item.classList.contains("active") && item.classList.contains("lbbuttonsel2"),
        key + " must use the same modern active classes as native top-level pages.");
    assert.strictEqual(item.getAttribute("aria-current"), "page",
        key + " must expose the current page state.");
});

assert.strictEqual(native.className, "nav-link active text-center text-white lbbuttonsel",
    "Normalizing plugin entries must not modify the native My Devices entry.");
assert.strictEqual(native.querySelector("svg"), nativeIcon,
    "Normalizing plugin entries must not replace the native MeshCentral SVG.");

console.log("Modern SIRK menu uses native Font Awesome structure and spacing: OK");

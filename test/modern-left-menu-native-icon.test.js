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
    this.src = "";
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
    copy.src = this.src;
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

var expectedSource = "data:image/svg+xml;charset=utf-8,%3Csvg%20data-test%3D%22purple%22%3E%3C%2Fsvg%3E";
var core = {
    ensureMenu: function (definition) {
        var item = document.getElementById(definition.leftId);
        if (!item) {
            item = native.cloneNode(true);
            item.id = definition.leftId;
            host.appendChild(item);
        }
        item.classList.remove("active", "lbbuttonsel", "lbbuttonsel2");
        item.setAttribute("data-sirk-icon-family", "modern");
        var current = item.querySelector("svg, i, img");
        var image = new Element("img", "sirk-platform-menu-icon");
        image.src = expectedSource;
        image.setAttribute("data-sirk-icon-family", "modern");
        image.style.width = "24px";
        image.style.height = "24px";
        image.style.objectFit = "contain";
        if (current) current.parentNode.replaceChild(image, current);
        else item.insertBefore(image, item.firstChild || null);
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

["approvalcenter", "myscripts", "mycommands", "moverequests"].forEach(function (key) {
    var definition = { leftId: "LeftMenuSirkPlatform-" + key };
    core.ensureMenu(definition);
    var item = document.getElementById(definition.leftId);
    var icon = item.querySelector("img");

    assert.strictEqual(item.className, "nav-link text-center text-white",
        key + " must use the exact inactive native anchor classes.");
    assert.ok(icon, key + " must preserve the icon element selected by core.ensureMenu/SirkIconMode.");
    assert.strictEqual(icon.src, expectedSource,
        key + " must preserve the selected custom SVG source instead of replacing it with Font Awesome.");
    assert.strictEqual(icon.getAttribute("data-sirk-icon-family"), "modern",
        key + " must preserve the effective SirkIconMode family marker.");
    assert.strictEqual(item.querySelector("i"), null,
        key + " must not be normalized to a later white/currentColor Font Awesome icon.");

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

var pageSource = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "page.js"), "utf8");
assert.strictEqual(pageSource.indexOf("modernIconNames"), -1,
    "SharedPage must not keep a second Modern icon-family map.");
assert.strictEqual(pageSource.indexOf("normalizeModernIcon"), -1,
    "SharedPage must not replace SirkIconMode-owned Modern icons after first paint.");

console.log("Modern SIRK menu preserves the SirkIconMode-owned icon source and native classes: OK");

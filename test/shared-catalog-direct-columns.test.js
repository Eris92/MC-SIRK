"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(path.resolve(__dirname, "../public/shared/ui/catalog.js"), "utf8");

function ClassList(owner) {
    this.owner = owner;
}
ClassList.prototype._items = function () {
    return String(this.owner.className || "").split(/\s+/).filter(Boolean);
};
ClassList.prototype.add = function () {
    var items = this._items();
    Array.prototype.forEach.call(arguments, function (name) {
        if (items.indexOf(name) < 0) items.push(name);
    });
    this.owner.className = items.join(" ");
};
ClassList.prototype.remove = function () {
    var removed = Array.prototype.slice.call(arguments);
    this.owner.className = this._items().filter(function (name) {
        return removed.indexOf(name) < 0;
    }).join(" ");
};
ClassList.prototype.toggle = function (name, enabled) {
    if (enabled) this.add(name); else this.remove(name);
};
ClassList.prototype.contains = function (name) {
    return this._items().indexOf(name) >= 0;
};

function Node(kind) {
    this.kind = kind || "element";
    this.parentNode = null;
}

function Element(tagName) {
    Node.call(this, "element");
    this.tagName = String(tagName || "div").toUpperCase();
    this.className = "";
    this.classList = new ClassList(this);
    this.childNodes = [];
    this.attributes = Object.create(null);
    this.textContent = "";
    this.onclick = null;
}
Element.prototype = Object.create(Node.prototype);
Element.prototype.constructor = Element;
Object.defineProperty(Element.prototype, "children", {
    get: function () {
        return this.childNodes.filter(function (node) { return node.kind === "element"; });
    }
});
Object.defineProperty(Element.prototype, "innerHTML", {
    get: function () { return ""; },
    set: function () {
        this.childNodes.forEach(function (node) { node.parentNode = null; });
        this.childNodes = [];
    }
});
Element.prototype.setAttribute = function (name, value) {
    this.attributes[name] = String(value);
};
Element.prototype.getAttribute = function (name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
};
Element.prototype.appendChild = function (node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    this.childNodes.push(node);
    node.parentNode = this;
    return node;
};
Element.prototype.insertBefore = function (node, reference) {
    if (node.parentNode) node.parentNode.removeChild(node);
    var index = this.childNodes.indexOf(reference);
    if (index < 0) return this.appendChild(node);
    this.childNodes.splice(index, 0, node);
    node.parentNode = this;
    return node;
};
Element.prototype.removeChild = function (node) {
    var index = this.childNodes.indexOf(node);
    if (index >= 0) this.childNodes.splice(index, 1);
    node.parentNode = null;
    return node;
};

function Comment(value) {
    Node.call(this, "comment");
    this.textContent = String(value || "");
}
Comment.prototype = Object.create(Node.prototype);
Comment.prototype.constructor = Comment;

function button(title) {
    var value = new Element("button");
    value.textContent = title;
    value.className = "mc-shared-nav-item mc-tree-root";
    return value;
}

var document = {
    createElement: function (name) { return new Element(name); },
    createComment: function (value) { return new Comment(value); }
};
var lastTreeOptions = null;
var window = {
    SharedDirectoryTree: {
        mount: function (options) {
            lastTreeOptions = options;
            options.rootsContainer.innerHTML = "";
            options.rootsContainer.appendChild(button("Scripts"));
            options.rootsContainer.appendChild(button("System"));
            return options.state || {};
        }
    },
    SirkSharedListContract: { schedule: function () {} }
};

vm.runInNewContext(source, { window: window, document: document, Object: Object, Array: Array, String: String, Error: Error });

function elementLabels(host) {
    return host.children.map(function (item) {
        if (item.classList.contains("mc-catalog-results")) return "Results";
        return item.textContent;
    });
}

var primary = new Element("div");
window.SharedCatalogView.mount({
    primaryContainer: primary,
    treeContainer: new Element("div"),
    tree: {},
    state: {},
    resultsActive: false
});

assert.deepStrictEqual(elementLabels(primary), ["Results", "Scripts", "System"],
    "Results and catalog roots must be direct primary-column children in the default order.");
assert.ok(primary.classList.contains("sirk-shared-catalog-primary"),
    "The real primary host must own the shared catalog contract.");
assert.strictEqual(primary.children.some(function (item) {
    return item.classList.contains("mc-catalog-navigation") || item.classList.contains("mc-catalog-roots");
}), false, "The shared column must not recreate historical wrapper elements.");

lastTreeOptions.rootsContainer.innerHTML = "";
lastTreeOptions.rootsContainer.appendChild(button("Network"));
assert.deepStrictEqual(elementLabels(primary), ["Results", "Network"],
    "A tree rerender must replace only roots and preserve the Results row and direct structure.");

var endPrimary = new Element("div");
window.SharedCatalogView.mount({
    primaryContainer: endPrimary,
    treeContainer: new Element("div"),
    tree: {},
    state: {},
    resultsPosition: "end"
});
assert.deepStrictEqual(elementLabels(endPrimary), ["Scripts", "System", "Results"],
    "The comment anchor must preserve the configured end position across direct rendering.");

console.log("Shared catalog uses the same direct primary-column structure as Quick: OK");

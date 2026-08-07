"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(path.resolve(__dirname, "../public/shared/ui/catalog.js"), "utf8");

function ClassList(owner) { this.owner = owner; }
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
    this.listeners = Object.create(null);
    this.textContent = "";
    this.onclick = null;
    this.disabled = false;
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
Element.prototype.addEventListener = function (type, handler, capture) {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push({ handler: handler, capture: capture === true });
};
Element.prototype.dispatchEvent = function (event) {
    event = event || {};
    event.type = event.type || "click";
    event.target = this;
    event.currentTarget = this;
    event.defaultPrevented = false;
    event.propagationStopped = false;
    event.preventDefault = function () { event.defaultPrevented = true; };
    event.stopPropagation = function () { event.propagationStopped = true; };
    (this.listeners[event.type] || []).filter(function (entry) { return entry.capture; }).forEach(function (entry) {
        entry.handler.call(this, event);
    }, this);
    if (typeof this.onclick === "function") this.onclick.call(this, event);
    (this.listeners[event.type] || []).filter(function (entry) { return !entry.capture; }).forEach(function (entry) {
        entry.handler.call(this, event);
    }, this);
    return !event.defaultPrevented;
};
Element.prototype.click = function () { return this.dispatchEvent({ type: "click" }); };
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

function rootButton(title) {
    var value = new Element("button");
    value.textContent = title;
    value.className = "mc-shared-nav-item mc-tree-root sirk-shared-list-item active is-active";
    value.setAttribute("aria-selected", "true");
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
            options.rootsContainer.appendChild(rootButton("Scripts"));
            options.rootsContainer.appendChild(rootButton("System"));
            return options.state || {};
        }
    }
};

vm.runInNewContext(source, {
    window: window,
    document: document,
    Object: Object,
    Array: Array,
    String: String,
    Error: Error
});

function elementLabels(host) {
    return host.children.map(function (item) {
        if (item.classList.contains("mc-catalog-results")) return "Results";
        return item.textContent;
    });
}

var resultsClicks = 0;
var primary = new Element("div");
window.SharedCatalogView.mount({
    primaryContainer: primary,
    treeContainer: new Element("div"),
    tree: {},
    state: {},
    resultsActive: false,
    onResults: function () { resultsClicks += 1; }
});

assert.deepStrictEqual(elementLabels(primary), ["Results", "Scripts", "System"],
    "Results and catalog roots must be direct primary-column children in the default order.");
assert.ok(primary.classList.contains("sirk-shared-catalog-primary"),
    "The real primary host must identify the shared catalog column directly.");
assert.strictEqual(primary.children.some(function (item) {
    return item.classList.contains("mc-catalog-navigation") || item.classList.contains("mc-catalog-roots");
}), false, "The shared column must not recreate historical wrapper elements.");

var resultsButton = primary.children[0];
assert.ok(resultsButton.classList.contains("mc-catalog-results") &&
    resultsButton.classList.contains("sirk-shared-list-item"),
    "Results must use the same direct shared-list renderer contract as catalog roots.");
assert.strictEqual(resultsButton.getAttribute("data-sirk-catalog-contract-version"), null,
    "The maintained catalog must not expose release-specific implementation markers.");

resultsButton.onclick = function () {};
assert.strictEqual(resultsButton.click(), false,
    "Results navigation must prevent the native button default action.");
assert.strictEqual(resultsClicks, 1,
    "The capture listener must survive a later onclick property overwrite.");
assert.ok(resultsButton.classList.contains("active") && resultsButton.classList.contains("is-active"),
    "Clicking Results must immediately select the Results row.");
assert.strictEqual(primary.children[1].getAttribute("aria-selected"), "false",
    "Clicking Results must clear root selection before the module rerender.");

lastTreeOptions.rootsContainer.innerHTML = "";
lastTreeOptions.rootsContainer.appendChild(rootButton("Network"));
assert.deepStrictEqual(elementLabels(primary), ["Results", "Network"],
    "A tree rerender must replace only roots and preserve Results and the direct column structure.");
resultsButton.click();
assert.strictEqual(resultsClicks, 2,
    "The preserved Results row must remain clickable after a catalog-root rerender.");

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

assert.strictEqual(source.indexOf("CONTRACT_VERSION"), -1,
    "Catalog source must not carry a release-specific DOM contract version.");
assert.strictEqual(source.indexOf("SirkSharedListContract"), -1,
    "Catalog source must not depend on a post-render normalizer.");

console.log("Shared catalog direct columns and functional Results navigation: OK");

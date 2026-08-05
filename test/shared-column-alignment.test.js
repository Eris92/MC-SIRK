"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "layout.js"),
    "utf8"
);

assert.ok(
    source.indexOf(".mc-shared-page-approvalcenter,.mc-shared-page-mycommands,.mc-shared-page-myscripts") >= 0,
    "Approval, Commands and My Scripts must use one shared column selector."
);
assert.ok(
    source.indexOf("--sirk-shared-primary-track:220px") >= 0 &&
    source.indexOf("--sirk-primary-collapsed-track:64px") >= 0,
    "The shared desktop and collapsed primary tracks must have exact widths."
);
assert.ok(
    source.indexOf("grid-template-columns:var(--sirk-shared-primary-track) var(--sirk-shared-secondary-track) var(--sirk-shared-details-track)!important") >= 0,
    "Every expanded module must start its second column after the same primary track."
);
assert.ok(
    source.indexOf("grid-template-columns:var(--sirk-primary-collapsed-track) var(--sirk-shared-secondary-track) var(--sirk-shared-details-track)!important") >= 0,
    "Every collapsed module must start its second column after the same 64 px track."
);
assert.ok(
    source.indexOf("--sirk-shared-primary-track:190px") >= 0,
    "The narrower desktop breakpoint must remain shared by all three modules."
);
assert.strictEqual(
    source.indexOf("minmax(220px,300px)"),
    -1,
    "The primary track must not remain content-dependent."
);
assert.ok(
    source.indexOf('var SHARED_SCRIPT_LAYOUT_KEY = "sirkPlatform.layout.shared-script-columns.collapsed"') >= 0,
    "The three modules must share one Collapse state."
);

function ClassList(initial) {
    this.values = (initial || []).slice();
}
ClassList.prototype.contains = function (name) {
    return this.values.indexOf(String(name)) >= 0;
};
ClassList.prototype.toggle = function (name, enabled) {
    name = String(name);
    var index = this.values.indexOf(name);
    if (enabled === true && index < 0) this.values.push(name);
    if (enabled === false && index >= 0) this.values.splice(index, 1);
};

function Element(tagName, classes) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.classList = new ClassList(classes || []);
    this.className = (classes || []).join(" ");
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.innerHTML = "";
    this.id = "";
}
Element.prototype.appendChild = function (child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
};
Element.prototype.setAttribute = function (name, value) {
    this.attributes[name] = String(value);
    if (name === "id") this.id = String(value);
};
Element.prototype.closest = function (selector) {
    if (selector !== ".mc-shared-page") return null;
    for (var current = this; current; current = current.parentNode) {
        if (current.classList && current.classList.contains("mc-shared-page")) return current;
    }
    return null;
};

var storage = Object.create(null);
var styles = [];
var document = {
    getElementById: function (id) {
        return styles.filter(function (item) { return item.id === id; })[0] || null;
    },
    createElement: function (tag) { return new Element(tag); },
    head: {
        appendChild: function (item) { styles.push(item); }
    },
    documentElement: {
        appendChild: function (item) { styles.push(item); }
    },
    querySelector: function () { return null; }
};
var context = {
    console: console,
    document: document,
    window: {
        document: document,
        localStorage: {
            getItem: function (key) {
                return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null;
            },
            setItem: function (key, value) { storage[key] = String(value); }
        }
    }
};
context.window.window = context.window;
vm.runInNewContext(source, context, { filename: "layout.js" });

function mount(preset, legacyValue) {
    var page = new Element("div", ["mc-shared-page", "mc-shared-page-" + preset]);
    var host = new Element("div", ["mc-shared-layout-host"]);
    page.appendChild(host);
    if (legacyValue) storage["sirkPlatform.layout." + preset + ".collapsed"] = legacyValue;
    var layout = context.window.SharedLayout.mount({
        container: host,
        storageKey: "sirkPlatform.layout." + preset + ".collapsed"
    });
    return { page: page, host: host, layout: layout };
}

var approval = mount("approvalcenter", "collapsed");
assert.strictEqual(approval.layout.isCollapsed(), true,
    "The first mounted module must migrate its existing Collapse state.");

var commands = mount("mycommands", "expanded");
var scripts = mount("myscripts", "expanded");
assert.strictEqual(commands.layout.isCollapsed(), true,
    "Commands must use the shared collapsed state instead of its legacy setting.");
assert.strictEqual(scripts.layout.isCollapsed(), true,
    "My Scripts must use the same collapsed state as Approval and Commands.");

commands.layout.setCollapsed(false);
assert.strictEqual(approval.layout.isCollapsed(), false,
    "Expanding Commands must align Approval immediately.");
assert.strictEqual(commands.layout.isCollapsed(), false,
    "Commands must become expanded.");
assert.strictEqual(scripts.layout.isCollapsed(), false,
    "Expanding Commands must align My Scripts immediately.");

scripts.layout.setCollapsed(true);
assert.strictEqual(approval.layout.isCollapsed(), true,
    "Collapsing My Scripts must align Approval immediately.");
assert.strictEqual(commands.layout.isCollapsed(), true,
    "Collapsing My Scripts must align Commands immediately.");
assert.strictEqual(storage["sirkPlatform.layout.shared-script-columns.collapsed"], "collapsed",
    "The synchronized state must be stored under one shared key."
);
assert.strictEqual(styles.length, 1,
    "The shared column contract stylesheet must be installed once."
);
assert.ok(styles[0].textContent.indexOf("margin:0!important;padding:0!important") >= 0,
    "Every layout host must use the same zero inset before the first track."
);

console.log("Approval, Commands and My Scripts second-column alignment: OK");

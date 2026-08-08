"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public", "shared", "ui", "layout.js"), "utf8");
var sharedCss = fs.readFileSync(path.join(root, "public", "shared", "ui", "shared-ui.css"), "utf8");
var toolbarCss = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.css"), "utf8");

assert.ok(source.indexOf('var SHARED_SCRIPT_LAYOUT_KEY = "sirkPlatform.layout.shared-script-columns.collapsed"') >= 0,
    "Approval, Commands and My Scripts must share one Collapse state key.");
["approvalcenter", "mycommands", "myscripts"].forEach(function (preset) {
    assert.ok(source.indexOf(preset + ": true") >= 0,
        "Shared Collapse state must include " + preset + ".");
});
assert.ok(source.indexOf("initialCollapsed(storageKey, options.collapsed)") >= 0 &&
    source.indexOf("synchronizeShared(collapsed, entry)") >= 0,
    "SharedLayout must migrate legacy state and synchronize mounted script layouts.");
assert.ok(source.indexOf("isCollapsed: function ()") >= 0 &&
    source.indexOf("toggleCollapsed: function ()") >= 0,
    "SharedLayout must expose the Collapse API consumed by module-shell.");
assert.strictEqual(source.indexOf('createElement("style")'), -1,
    "SharedLayout must not generate runtime CSS.");

assert.ok(sharedCss.indexOf("--sirk-shared-primary-track:minmax(165px,205px)") >= 0 &&
    sharedCss.indexOf("--sirk-primary-collapsed-track:64px") >= 0 &&
    sharedCss.indexOf("--sirk-shared-secondary-track:minmax(285px,340px)") >= 0,
    "Shared desktop tracks must match the canonical Quick primary and secondary geometry.");
assert.ok(sharedCss.indexOf("grid-template-columns:var(--sirk-shared-primary-track) var(--sirk-shared-secondary-track) var(--sirk-shared-details-track)") >= 0,
    "Expanded modules must use the shared static tracks.");
assert.ok(sharedCss.indexOf(".mc-shared-layout.is-collapsed{grid-template-columns:var(--sirk-primary-collapsed-track) var(--sirk-shared-secondary-track) var(--sirk-shared-details-track)}") >= 0,
    "The base collapsed track must keep the 64 px primary without !important so action modes can override secondary geometry.");
assert.ok(toolbarCss.indexOf(".mc-shared-page:is(.is-edit-mode,.is-multi-mode) .mc-shared-layout.is-collapsed{grid-template-columns:var(--sirk-primary-collapsed-track) calc(var(--sirk-mode-secondary-width,340px) + var(--sirk-actions-width) + var(--sirk-actions-column-gap)) var(--sirk-edit-details-track)}") >= 0,
    "Collapsed Edit and Multi must keep their measured action rail outside the captured secondary text track.");
assert.ok(sharedCss.indexOf(".mc-shared-nav-item{display:flex;align-items:center;gap:9px;width:100%;min-width:0;min-height:36px;padding:8px") >= 0,
    "Shared navigation rows must retain the compact canonical row geometry.");
assert.strictEqual(toolbarCss.indexOf(".mc-shared-layout:has(.mc-tree-script-actions:not(:empty))"), -1,
    "Toolbar CSS must not create a second column system based on action buttons.");
assert.strictEqual(/(^|})\.mc-shared-layout\{grid-template-columns:/.test(toolbarCss), false,
    "Toolbar CSS must not override the canonical global shared layout tracks.");

function ClassList() { this.values = []; }
ClassList.prototype.contains = function (name) { return this.values.indexOf(String(name)) >= 0; };
ClassList.prototype.toggle = function (name, enabled) {
    name = String(name);
    var index = this.values.indexOf(name);
    if (enabled === true && index < 0) this.values.push(name);
    else if (enabled === false && index >= 0) this.values.splice(index, 1);
    else if (enabled == null) {
        if (index >= 0) this.values.splice(index, 1); else this.values.push(name);
    }
};
ClassList.prototype.set = function (value) {
    this.values = String(value || "").split(/\s+/).filter(Boolean);
};

function Element(tagName) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.classList = new ClassList();
    this.children = [];
    this.parentNode = null;
    this.innerHTML = "";
}
Object.defineProperty(Element.prototype, "className", {
    get: function () { return this.classList.values.join(" "); },
    set: function (value) { this.classList.set(value); }
});
Element.prototype.appendChild = function (child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
};

var values = Object.create(null);
var document = {
    createElement: function (tag) { return new Element(tag); },
    querySelector: function () { return null; }
};
var context = {
    console: console,
    document: document,
    window: {
        document: document,
        localStorage: {
            getItem: function (key) {
                return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null;
            },
            setItem: function (key, value) { values[key] = String(value); }
        }
    }
};
context.window.window = context.window;
vm.runInNewContext(source, context, { filename: "layout.js" });

function mount(preset, legacyValue) {
    var host = new Element("div");
    var key = "sirkPlatform.layout." + preset + ".collapsed";
    if (legacyValue != null) values[key] = legacyValue;
    var layout = context.window.SharedLayout.mount({ container: host, storageKey: key });
    return layout;
}

var approval = mount("approvalcenter", "collapsed");
assert.strictEqual(approval.isCollapsed(), true,
    "The first shared module must migrate its existing legacy Collapse state.");
assert.strictEqual(values["sirkPlatform.layout.shared-script-columns.collapsed"], "collapsed",
    "Migrated Collapse state must be persisted under the shared key.");
assert.strictEqual(approval.root.classList.contains("sirk-shared-quick-columns"), true,
    "Approval must expose the shared Quick-aligned layout role.");
assert.strictEqual(approval.primary.classList.contains("sirk-shared-quick-primary"), true,
    "The first column must expose the shared Quick-aligned role.");
assert.strictEqual(approval.secondary.classList.contains("sirk-shared-quick-secondary"), true,
    "The second column must expose the shared Quick-aligned role.");

var commands = mount("mycommands", "expanded");
var scripts = mount("myscripts", "expanded");
assert.strictEqual(commands.isCollapsed(), true,
    "Commands must prefer the migrated shared state over its old per-module value.");
assert.strictEqual(scripts.isCollapsed(), true,
    "My Scripts must prefer the same shared state.");

commands.setCollapsed(false);
assert.strictEqual(approval.isCollapsed(), false,
    "Expanding Commands must align Approval immediately.");
assert.strictEqual(commands.isCollapsed(), false,
    "Commands must become expanded.");
assert.strictEqual(scripts.isCollapsed(), false,
    "Expanding Commands must align My Scripts immediately.");

scripts.toggleCollapsed();
assert.strictEqual(approval.isCollapsed(), true,
    "Collapsing My Scripts must align Approval immediately.");
assert.strictEqual(commands.isCollapsed(), true,
    "Collapsing My Scripts must align Commands immediately.");
assert.strictEqual(values["sirkPlatform.layout.shared-script-columns.collapsed"], "collapsed",
    "Synchronized state must remain stored under one shared key.");

var independent = mount("standard", "expanded");
independent.setCollapsed(true);
assert.strictEqual(independent.isCollapsed(), true,
    "Non-script layouts must retain their own Collapse state.");
assert.strictEqual(values["sirkPlatform.layout.standard.collapsed"], "collapsed",
    "Non-script layouts must persist using their supplied storage key.");

console.log("Approval, Commands and My Scripts share canonical static columns and Collapse state: OK");

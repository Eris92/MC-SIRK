"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var shared = read("public/shared/ui/shared-ui.css");
var quick = read("public/native/desktop-commands.css");
var desktop = read("public/native/desktop-commands.js");
var tree = read("public/shared/ui/tree.js");
var adapter = read("public/shared/ui/toolbar-config.js");
var settings = read("public/shared/ui/settings.js");

assert.ok(adapter.indexOf(".sirk-quick-command-browser button") >= 0,
    "Quick rows must be included in the same native navigation adapter as shared module rows.");
assert.ok(adapter.indexOf('syncOwnedClasses(element, ["list-group-item", "list-group-item-action"])') >= 0,
    "Modern Quick and module rows must use native MeshCentral list-group action classes.");
assert.ok(adapter.indexOf('syncOwnedClasses(element, [selected ? "style10s" : "style10"])') >= 0,
    "Classic Quick and module rows must use native MeshCentral style10/style10s classes.");
assert.ok(adapter.indexOf('element.classList.contains("is-active")') >= 0,
    "The native adapter must preserve functional selected state.");
assert.ok(adapter.indexOf("function syncOwnedClasses(element, desired)") >= 0,
    "Quick and module rows must not reset valid native classes during synchronization.");

assert.ok(tree.indexOf('function applyNav(button)') >= 0 &&
    tree.indexOf('window.MeshThemeAdapter.nav(button)') >= 0 &&
    tree.indexOf('applyNav(button);') >= 0,
    "Shared tree rows must receive native selected classes synchronously during render.");
assert.ok(desktop.indexOf('function applyQuickNav(button, active)') >= 0 &&
    desktop.indexOf('button.classList.toggle("active", active)') >= 0 &&
    desktop.indexOf('button.setAttribute("aria-selected", active ? "true" : "false")') >= 0 &&
    desktop.indexOf('window.MeshThemeAdapter.nav(button)') >= 0,
    "Quick rows must receive active/is-active/aria-selected and native classes synchronously.");
assert.ok(desktop.indexOf('applyQuickNav(button, activeCategory)') >= 0 &&
    desktop.indexOf('applyQuickNav(button, selectedItem)') >= 0,
    "Both Quick category and command selections must be visibly selected immediately after render.");

assert.ok(adapter.indexOf("function installObserver()") >= 0,
    "The single theme observer may remain as a fallback for asynchronous host theme changes.");
assert.strictEqual(settings.indexOf("syncNativeContainers"), -1,
    "Settings must not own a second native-class synchronization path.");
assert.strictEqual(settings.indexOf("MutationObserver"), -1,
    "Settings must not duplicate the native theme adapter observer.");

[
    [shared, "--mc-shared-selection", "shared selection palette"],
    [shared, ".mc-shared-nav-item:hover", "plugin-owned shared hover color"],
    [quick, "--sdc-active", "Quick active palette"],
    [quick, "--sdc-hover", "Quick hover palette"],
        [quick, ".sirk-quick-command-browser button.is-active{background", "Quick-owned active background"]
].forEach(function (entry) {
    assert.strictEqual(entry[0].indexOf(entry[1]), -1,
        "Native selection contract forbids " + entry[2] + ".");
});

console.log("Quick and shared rows apply native MeshCentral selection synchronously: OK");

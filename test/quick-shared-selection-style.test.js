"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var shared = read("public/shared/ui/shared-ui.css");
var quick = read("public/native/desktop-commands.css");
var adapter = read("public/shared/ui/toolbar-config.js");
var lifecycle = read("public/shared/ui/settings.js");

assert.ok(adapter.indexOf(".sirk-quick-command-browser button") >= 0,
    "Quick rows must be included in the same native navigation adapter as shared module rows.");
assert.ok(adapter.indexOf('syncOwnedClasses(element, ["list-group-item", "list-group-item-action"])') >= 0,
    "Modern Quick and module rows must use native MeshCentral list-group action classes.");
assert.ok(adapter.indexOf('syncOwnedClasses(element, [selected ? "style10s" : "style10"])') >= 0,
    "Classic Quick and module rows must use native MeshCentral style10/style10s classes.");
assert.ok(adapter.indexOf('element.classList.contains("is-active")') >= 0,
    "The native adapter must preserve the functional Quick selected state.");
assert.ok(adapter.indexOf("function syncOwnedClasses(element, desired)") >= 0,
    "Quick and module rows must not reset valid native classes during synchronization.");
assert.ok(lifecycle.indexOf("syncNativeContainers") >= 0,
    "Quick native row classes must be restored after each asynchronous render.");

[
    [shared, "--mc-shared-selection", "shared selection palette"],
    [shared, ".mc-shared-nav-item:hover", "plugin-owned shared hover color"],
    [quick, "--sdc-active", "Quick active palette"],
    [quick, "--sdc-hover", "Quick hover palette"],
    [quick, "box-shadow:inset 3px 0 0", "Quick-only selected stripe"],
    [quick, ".sirk-quick-command-browser button.is-active{background", "Quick-owned active background"]
].forEach(function (entry) {
    assert.strictEqual(entry[0].indexOf(entry[1]), -1,
        "Native selection contract forbids " + entry[2] + ".");
});

console.log("Quick and shared rows inherit native MeshCentral selection classes: OK");

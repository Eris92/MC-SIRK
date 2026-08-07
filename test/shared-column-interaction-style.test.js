"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var adapter = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");
var toolbar = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.css"), "utf8");
var quick = fs.readFileSync(path.join(root, "public/native/desktop-commands.css"), "utf8");
var shared = fs.readFileSync(path.join(root, "public/shared/ui/shared-ui.css"), "utf8");

assert.ok(adapter.indexOf('syncOwnedClasses(element, ["list-group-item", "list-group-item-action"])') >= 0,
    "Modern shared rows must inherit MeshCentral/Bootstrap native hover and active behavior.");
assert.ok(adapter.indexOf('syncOwnedClasses(element, [selected ? "style10s" : "style10"])') >= 0,
    "Classic shared rows must inherit MeshCentral style10/style10s interaction behavior.");
assert.ok(adapter.indexOf('.mc-shared-nav-item,.mc-approval-provider,.mc-approval-status,.mc-catalog-results,.mc-tree-root,.mc-tree-script,.mc-tree-folder-header,.sirk-quick-command-browser button') >= 0,
    "Approval, Commands, My Scripts and Quick rows must pass through the same native navigation adapter.");
assert.ok(adapter.indexOf('element.classList.toggle("active", selected)') >= 0,
    "Modern selected rows must expose the native active state instead of plugin-owned selection CSS.");

[
    [toolbar, "--bs-list-group-action-hover-bg", "duplicated Bootstrap hover styling in toolbar CSS"],
    [toolbar, "--bs-list-group-active-border-color", "duplicated Bootstrap active styling in toolbar CSS"],
    [shared, "--mc-shared-selection", "private shared selection palette"],
    [shared, "--sirk-column-hover", "private shared hover palette"],
    [quick, "--sdc-active", "private Quick active palette"],
    [quick, "--sdc-hover", "private Quick hover palette"],
    [quick, "box-shadow:inset 3px 0 0", "Quick-only selected stripe"]
].forEach(function (entry) {
    assert.strictEqual(entry[0].indexOf(entry[1]), -1,
        "Native interaction contract forbids " + entry[2] + ".");
});

assert.strictEqual(toolbar.indexOf("transform:"), -1,
    "Toolbar styling must not move shared rows during hover or selection.");
assert.strictEqual(toolbar.indexOf("scale:"), -1,
    "Toolbar styling must not resize shared rows during hover or selection.");
assert.strictEqual(quick.indexOf("transform:"), -1,
    "Quick styling must not move rows during hover or selection.");
assert.strictEqual(quick.indexOf("scale:"), -1,
    "Quick styling must not resize rows during hover or selection.");

console.log("Approval, Commands, My Scripts and Quick inherit native row interaction states: OK");

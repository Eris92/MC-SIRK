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
    "Modern selected rows must expose the native active state instead of plugin-owned selection colors.");

[
    [toolbar, "--bs-list-group-action-hover-bg", "duplicated Bootstrap hover styling in toolbar CSS"],
    [toolbar, "--bs-list-group-active-border-color", "duplicated Bootstrap active styling in toolbar CSS"],
    [shared, "--mc-shared-selection", "private shared selection palette"],
    [shared, "--sirk-column-hover", "private shared hover palette"],
    [quick, "--bs-list-group-action-hover-bg", "duplicated Bootstrap hover styling in Quick CSS"],
    [quick, "--bs-list-group-active-border-color", "duplicated Bootstrap active styling in Quick CSS"],
    [quick, "--sdc-active", "private Quick active palette"],
    [quick, "--sdc-hover", "private Quick hover palette"],
        [quick, "data-sirk-output-hidden", "legacy Quick output visibility compatibility state"]
].forEach(function (entry) {
    assert.strictEqual(entry[0].indexOf(entry[1]), -1,
        "Native interaction contract forbids " + entry[2] + ".");
});

assert.ok(toolbar.indexOf('.mc-shared-page button,.mc-shared-page button:hover,.mc-shared-page button:focus,.mc-shared-page button:active{transform:none!important;scale:none!important;zoom:1!important}') >= 0,
    "Shared plugin controls must neutralize host transforms that change column geometry.");
assert.ok(quick.indexOf('.sirk-desktop-commands-panel button:hover') >= 0 &&
    quick.indexOf('transform:none!important;scale:none!important;zoom:1!important') >= 0,
    "Quick controls must neutralize host transforms that resize the panel on hover.");
assert.strictEqual(toolbar.indexOf("--sirk-column-hover"), -1,
    "Geometry guards must not become a plugin-owned hover palette.");
assert.strictEqual(quick.indexOf(".sirk-quick-command-browser button:hover{background"), -1,
    "Quick geometry guards must not own hover colors.");
assert.ok(quick.indexOf("transform:translateY(-50%)") >= 0,
    "The Desktop edge toggle may retain its positioning transform because it is geometry, not row interaction styling.");

console.log("Native row colors with scoped non-scaling geometry guards: OK");

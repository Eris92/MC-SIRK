"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var css = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "shared-ui.css"),
    "utf8"
);

assert.ok(
    css.indexOf(".mc-tree-folder-body{margin:0 0 0 6px}") >= 0,
    "Every expanded folder body must add only a light 6 px indentation."
);
assert.ok(
    css.indexOf(".mc-tree-folder-header{width:100%;padding:8px;") >= 0,
    "Folder rows must keep the normal 8 px row padding instead of adding a large depth padding."
);
assert.ok(
    css.indexOf(".mc-tree-script{padding-left:8px}") >= 0,
    "Script rows must use the same base padding as folder rows."
);
assert.ok(
    css.indexOf("button.mc-tree-folder-header.sirk-shared-list-item,html.sirk-platform-native-ui body button.mc-tree-script.sirk-shared-list-item{padding-left:8px!important}") >= 0,
    "The shared list contract must not restore the previous 12 px per-level padding."
);
assert.strictEqual(
    css.indexOf("var(--mc-tree-depth,0) * 12px"),
    -1,
    "The old large per-level indentation must not remain in the canonical shared stylesheet."
);

console.log("Nested folders and scripts use a light cumulative 6 px indentation: OK");

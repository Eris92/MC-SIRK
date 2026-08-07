"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "styles", "main.css"),
    "utf8"
);

assert.ok(
    source.indexOf("#SirkPlatformWorkspace{width:100%;box-sizing:border-box;padding:0 12px 20px}") >= 0,
    "Workspace geometry must be scoped to the SIRK workspace element."
);
assert.strictEqual(
    source.indexOf(".mc-workspace{"),
    -1,
    "SIRK CSS must not use a generic workspace selector that can affect native MeshCentral surfaces."
);
assert.strictEqual(
    source.indexOf("#devListToolbarViewIcons"),
    -1,
    "SIRK CSS must not hide, resize or otherwise style the native Devices view toolbar."
);

console.log("Native Devices toolbar is outside SIRK CSS ownership: OK");

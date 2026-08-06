"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "styles", "main.css"),
    "utf8"
);

assert.ok(
    source.indexOf("html.sirk-platform-workspace-active #devListToolbarViewIcons{display:none!important}") >= 0,
    "MeshCentral device-list view icons must be hidden while a SIRK workspace is active."
);
assert.strictEqual(
    source.indexOf("\n#devListToolbarViewIcons{display:none!important}"),
    -1,
    "The native view icons must not be hidden globally outside SIRK workspaces."
);

console.log("Native device-list view icons are isolated from SIRK workspaces: OK");

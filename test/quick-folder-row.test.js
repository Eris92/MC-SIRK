"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var css = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.css"), "utf8");
var source = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");

assert.ok(
    css.indexOf(".sirk-quick-command-tree button.sirk-quick-command-folder{grid-template-columns:20px minmax(0,1fr)}") >= 0,
    "Quick folder rows must contain only the folder icon and label columns."
);
assert.ok(
    css.indexOf(".sirk-quick-command-arrow{display:none!important}") >= 0,
    "Quick folder expand/collapse arrows must not be visible."
);
assert.ok(
    source.indexOf("if (hasContents) state.expanded[group.key] = !state.expanded[group.key]") >= 0,
    "Clicking the folder row must continue to expand and collapse its contents."
);

console.log("Quick folder rows without arrows: OK");

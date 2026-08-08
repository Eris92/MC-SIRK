"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var quick = fs.readFileSync(path.join(root, "public/native/desktop-commands.js"), "utf8");
var commands = fs.readFileSync(path.join(root, "public/modules/commands/index.js"), "utf8");
var css = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.css"), "utf8");

["scripts", "network", "system", "other"].forEach(function (tone) {
    assert.strictEqual(css.indexOf(".sirk-command-icon-" + tone + "{color:"), -1,
        "Navigation/list icon tone class must not own a semantic color: " + tone);
});
assert.ok(quick.indexOf('function addIcon(host, iconData, kind, tone)') >= 0 && quick.indexOf('" sirk-command-icon-" + tone') >= 0,
    "Existing icon identity classes may remain, but without palette ownership.");
assert.ok(quick.indexOf('image.className = "sirk-quick-command-icon"') >= 0,
    "Custom iconData must remain an unrecolored image.");
assert.ok(commands.indexOf('function tonedIcon(markup, tone)') >= 0,
    "My Commands may retain semantic identity classes without using them as colors.");
assert.ok(css.indexOf('.sirk-quick-command-details-toggle.has-output-attention .mc-shared-toolbar-icon{color:var(--bs-danger,currentColor)!important}') >= 0,
    "Output attention must retain its separate semantic danger color.");
assert.ok(css.indexOf('.mc-tree-favorite-action .mc-tree-script-action-icon.is-favorite-active{color:var(--bs-warning,#ffc107)!important}') >= 0,
    "Active Favorites must retain their separate warning color.");
console.log("Navigation and list icons inherit native color while semantic exception states remain: OK");

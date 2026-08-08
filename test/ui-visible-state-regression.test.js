"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var core = read("public/shared/core.js");
var tools = read("public/shared/ui/script-tools.js");
var tree = read("public/shared/ui/tree.js");
var css = read("public/shared/ui/toolbar.css");

assert.ok(core.indexOf('var iconSource = family[key] || definition.icon || modernMenuIcons[key] || "";') >= 0,
    "Admin icon family must win over a module/default icon override.");
assert.ok(core.indexOf('left.setAttribute("data-sirk-icon-family", useModernIcons ? "modern" : "classic")') >= 0,
    "Rendered plugin menu entries must expose the selected icon family.");
assert.ok(core.indexOf('if (!legacyIcon || leftModern)') >= 0,
    "Menu icons must have an explicit image fallback when the host does not expose legacy .lbtg markup.");

var actionsStart = tools.indexOf("scriptActions: function (script, config)");
assert.ok(actionsStart >= 0, "Shared scriptActions owner must remain present.");
var editStart = tools.indexOf("if (state.editMode) {", actionsStart);
var editEnd = tools.indexOf("if (state.multiPickMode", editStart);
var editBlock = tools.slice(editStart, editEnd);
var credentials = editBlock.indexOf('key: "credentials"');
var favorite = editBlock.indexOf('key: "favorite"', credentials);
var link = editBlock.indexOf('key: "link"', favorite);
var edit = editBlock.indexOf('key: "edit"', link);
assert.ok(credentials >= 0 && favorite > credentials && link > favorite && edit > link,
    "Edit mode action order must be Credentials, Favorite, Copy link, Edit.");
assert.ok(editBlock.indexOf('disabled: !hasCredentials') >= 0,
    "Credentials must remain visible but disabled when the script has no secret variables.");
assert.ok(tree.indexOf('action.disabled = definition.disabled === true') >= 0 && tree.indexOf('if (action.disabled) return;') >= 0,
    "Tree actions must render and enforce disabled actions.");
assert.ok(css.indexOf('.mc-shared-page :is(.sirk-shared-list-item,.mc-shared-nav-item):is(.active,.is-active)') >= 0,
    "All shared first/second-column navigation rows, including Approval, must use one visible selected-state fallback.");
assert.ok(css.indexOf('.sirk-quick-command-browser button:is(.active,.is-active)') >= 0,
    "Quick selected rows must use the same visible host-token fallback.");
assert.ok(css.indexOf('var(--bs-primary,currentColor)') >= 0,
    "Visible selection must derive from the active host theme rather than a private fixed color.");

console.log("Visible menu icon family, Edit actions and selected rows regression contract: OK");

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var core = read("public/shared/core.js");
var page = read("public/shared/ui/page.js");
var tools = read("public/shared/ui/script-tools.js");
var tree = read("public/shared/ui/tree.js");
var css = read("public/shared/ui/toolbar.css");

assert.ok(core.indexOf('var iconSource = family[key] || definition.icon || modernMenuIcons[key] || "";') >= 0,
    "Admin icon family must win over a module/default icon override.");
assert.ok(core.indexOf('setAttributeValue(left, "data-sirk-icon-family", familyName)') >= 0,
    "Rendered plugin menu entries must expose the selected icon family on the first core mount.");
assert.ok(core.indexOf('if (legacyIcon && !leftModern)') >= 0 &&
    core.indexOf('var image = currentIcon && String(currentIcon.tagName || "").toLowerCase() === "img"') >= 0,
    "Core must preserve Classic .lbtg markup and provide the canonical image path for Modern/non-legacy menu hosts.");
assert.strictEqual(page.indexOf("installNativeLeftMenuContract"), -1,
    "Deferred SharedPage must not rewrite the rendered icon family or geometry after first paint.");

var actionsStart = tools.indexOf("scriptActions: function (script, config)");
assert.ok(actionsStart >= 0, "Shared scriptActions owner must remain present.");
var editStart = tools.indexOf("if (state.editMode) {", actionsStart);
var editEnd = tools.indexOf("if (state.multiPickMode", editStart);
var editBlock = tools.slice(editStart, editEnd);
var credentials = editBlock.indexOf('key: "credentials"');
var favorite = editBlock.indexOf('key: "favorite"', Math.max(0, credentials));
var link = editBlock.indexOf('key: "link"', favorite);
var edit = editBlock.indexOf('key: "edit"', link);
assert.ok(credentials >= 0 && favorite > credentials && link > favorite && edit > link,
    "When local secrets exist, Edit mode action order must be Credentials, Favorite, Copy link, Edit.");
assert.ok(editBlock.indexOf("config.canEdit === true && Array.isArray(script.secretVariables) && script.secretVariables.length > 0") >= 0,
    "Standalone Credentials must be rendered only for editable scripts with backend-declared local SaveSecret variables.");
assert.strictEqual(editBlock.indexOf('disabled: !hasCredentials'), -1,
    "Scripts without local secrets must omit standalone Credentials instead of reserving a disabled action.");
assert.ok(tree.indexOf('action.disabled = definition.disabled === true') >= 0 && tree.indexOf('if (action.disabled) return;') >= 0,
    "Tree actions must continue to render and enforce disabled actions for contracts that still use them.");
assert.ok(css.indexOf('.mc-shared-page :is(.sirk-shared-list-item,.mc-shared-nav-item):is(.active,.is-active)') >= 0,
    "All shared first/second-column navigation rows, including Approval, must use one visible selected-state fallback.");
assert.ok(css.indexOf('.sirk-quick-command-browser button:is(.active,.is-active)') >= 0,
    "Quick selected rows must use the same visible host-token fallback.");
assert.ok(css.indexOf('var(--bs-primary,currentColor)') >= 0,
    "Visible selection must derive from the active host theme rather than a private fixed color.");

console.log("Visible first-paint menu icon family, gated Edit credentials and selected rows regression contract: OK");

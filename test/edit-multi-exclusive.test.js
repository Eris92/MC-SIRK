"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public", "shared", "ui", "script-tools.js"), "utf8");
var toolbarConfig = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar-config.js"), "utf8");
var toolbarApi = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar-api.js"), "utf8");
var toolbarCss = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.css"), "utf8");

var stored = Object.create(null);
var context = {
    URL: URL,
    Promise: Promise,
    Array: Array,
    String: String,
    JSON: JSON,
    console: console,
    navigator: { clipboard: null },
    document: {
        title: "Commands",
        querySelectorAll: function () { return []; }
    },
    window: {
        location: { href: "https://mesh.example/?viewmode=19" },
        history: { state: null, replaceState: function () {} },
        localStorage: {
            getItem: function (key) { return stored[key] || null; },
            setItem: function (key, value) { stored[key] = String(value); }
        },
        prompt: function () {},
        confirm: function () { return true; },
        setTimeout: function () {}
    }
};
context.window.window = context.window;

vm.runInNewContext(source, context, { filename: "script-tools.js" });

var tools = context.window.SharedScriptTools.create({
    storageKey: "test.commands.preferences",
    deepLinkParameter: "mycommand"
});
var active = Object.create(null);
var visible = Object.create(null);
var enabled = Object.create(null);
var toolbar = {
    setActive: function (key, value) { active[key] = value === true; },
    setVisible: function (key, value) { visible[key] = value !== false; },
    setEnabled: function (key, value) { enabled[key] = value !== false; },
    setTitle: function () {}
};
var config = {
    canEdit: true,
    enableMulti: true,
    onEdit: function () {},
    onMulti: function () {}
};
var script = {
    path: "folder/test.ps1",
    secretVariables: [{ name: "Password" }]
};

function actions() {
    return Array.from(tools.scriptActions(script, config));
}

function actionKeys() {
    return actions().map(function (item) { return item.key; }).join(",");
}

function sync() {
    tools.syncToolbar(toolbar, "commands", null, config);
}

sync();
assert.strictEqual(visible.manage, true, "Neutral mode must show the Edit choice.");
assert.strictEqual(visible.multi, true, "Neutral mode must show the Multi choice.");
assert.strictEqual(enabled.manage, true, "Edit must be enabled for administrators.");
assert.strictEqual(enabled.multi, true, "Multi must be enabled when the module allows it.");

tools.toggleEdit(toolbar);
sync();
assert.strictEqual(tools.state.editMode, true, "Edit must activate.");
assert.strictEqual(tools.state.multiPickMode, false, "Activating Edit must disable Multi.");
assert.strictEqual(active.manage, true, "The Edit toolbar button must be active.");
assert.strictEqual(active.multi, false, "The Multi toolbar button must be inactive in Edit mode.");
assert.strictEqual(visible.manage, true, "The Edit button must remain visible while active.");
assert.strictEqual(visible.multi, true, "The Multi button must remain available as a direct switch from Edit.");
assert.strictEqual(actionKeys(), "credentials,favorite,link,edit",
    "Edit mode must expose Credentials, Favorite, Copy link and Edit when local secrets exist.");
assert.strictEqual(actions()[0].disabled, false,
    "Credentials must be enabled when local secret variables exist.");

script.secretVariables = [];
assert.strictEqual(actionKeys(), "favorite,link,edit",
    "Scripts without local SaveSecret directives must not expose the standalone Credentials action.");
delete script.secretVariables;
assert.strictEqual(actionKeys(), "favorite,link,edit",
    "Missing secretVariables metadata must fail closed and hide standalone Credentials.");
script.secretVariables = [{ name: "Password" }];

tools.toggleMulti(toolbar);
sync();
assert.strictEqual(tools.state.editMode, false, "Activating Multi must disable Edit.");
assert.strictEqual(tools.state.multiPickMode, true, "Multi must activate.");
assert.strictEqual(active.manage, false, "The Edit toolbar button must be inactive in Multi mode.");
assert.strictEqual(active.multi, true, "The Multi toolbar button must be active.");
assert.strictEqual(visible.manage, true, "The Edit button must remain available as a direct switch from Multi.");
assert.strictEqual(visible.multi, true, "The active Multi button must remain visible.");
assert.strictEqual(actionKeys(), "multi", "Multi mode must expose only the multi-device row action.");

tools.toggleMulti(toolbar);
sync();
assert.strictEqual(tools.state.editMode, false, "Closing Multi must return to neutral mode, not Edit.");
assert.strictEqual(tools.state.multiPickMode, false, "Clicking active Multi again must return to neutral mode.");
assert.strictEqual(visible.manage, true, "Neutral mode must retain Edit after Multi is closed.");
assert.strictEqual(visible.multi, true, "Neutral mode must retain Multi after Multi is closed.");

tools.toggleEdit(toolbar);
sync();
assert.strictEqual(tools.state.editMode, true, "Edit must reactivate.");
assert.strictEqual(tools.state.multiPickMode, false, "Reactivating Edit must keep Multi disabled.");
assert.strictEqual(visible.manage, true, "Edit must remain visible after reactivation.");
assert.strictEqual(visible.multi, true, "Multi must remain visible while Edit is active again.");

assert.ok(source.indexOf('toolbar.setVisible("manage", config.canEdit === true)') >= 0 &&
    source.indexOf('toolbar.setVisible("multi", config.enableMulti === true)') >= 0,
    "Mode visibility must follow capabilities, not the currently active mode.");
assert.ok(source.indexOf('if (state.multiPickMode) state.editMode = false') >= 0 &&
    source.indexOf('toolbar.setActive("manage", false)') >= 0,
    "Multi activation must clear both the Edit state and Edit toolbar state.");
assert.ok(/manage:[^\n]*order: 40/.test(toolbarConfig), "Edit must remain directly before Multi.");
assert.ok(/multi:[^\n]*order: 41/.test(toolbarConfig), "Multi must remain directly beside Edit.");
assert.ok(/refresh:[^\n]*order: 50/.test(toolbarConfig), "Refresh must remain after the Edit and Multi controls.");
assert.ok(toolbarApi.indexOf('key === "favorites" || key === "manage" || key === "multi"') >= 0,
    "Favorites, Edit and Multi must share the icon-only active visual contract.");
assert.ok(toolbarApi.indexOf('item.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "Icon-only active state must preserve aria-pressed semantics.");
assert.ok(toolbarApi.indexOf('icon.classList.toggle("is-toolbar-active", iconOnly && active)') >= 0,
    "Edit and Multi must toggle the shared gold active-icon modifier.");
assert.ok(toolbarConfig.indexOf('element.getAttribute("data-sirk-icon-active-only") !== "true"') >= 0,
    "MeshThemeAdapter must keep icon-only toolbar modes on the base button surface.");
assert.ok(toolbarCss.indexOf('.mc-shared-toolbar-icon.is-toolbar-active,.mc-shared-toolbar-icon.is-favorite-active{color:var(--bs-warning,#ffc107)}') >= 0,
    "The shared toolbar must reuse one warning/gold token for active icons.");
assert.strictEqual(source.indexOf('createElement("style")'), -1,
    "Edit/Multi behavior must not install runtime styles; styling belongs to static CSS.");

console.log("Edit and Multi remain mutually exclusive with gated credentials and icon-only active styling: OK");
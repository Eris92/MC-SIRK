"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "script-edit-actions.js"),
    "utf8"
);
var toolbarConfig = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "toolbar-config.js"),
    "utf8"
);

function createBaseTools() {
    var tools = {
        state: {
            editMode: false,
            multiPickMode: false,
            linkPickMode: false
        },
        syncToolbar: function () {},
        toggleEdit: function (toolbar, onChange) {
            this.state.editMode = !this.state.editMode;
            this.state.multiPickMode = false;
            toolbar.setActive("manage", this.state.editMode);
            toolbar.setActive("multi", false);
            if (onChange) onChange();
        },
        toggleMulti: function (toolbar, onChange) {
            this.state.multiPickMode = !this.state.multiPickMode;
            toolbar.setActive("multi", this.state.multiPickMode);
            if (onChange) onChange();
        },
        scriptActions: function () {
            if (!this.state.editMode) return [];
            return [{
                key: "favorite",
                onClick: function () {}
            }];
        },
        isFavorite: function () { return false; },
        copyText: function () { return Promise.resolve(true); }
    };
    return tools;
}

function actionKeys(tools, script, config) {
    return Array.from(tools.scriptActions(script, config), function (item) {
        return item.key;
    });
}

var appendedStyles = [];
var context = {
    URL: URL,
    Promise: Promise,
    Array: Array,
    String: String,
    console: console,
    document: {
        title: "Commands",
        getElementById: function () { return null; },
        createElement: function () { return {}; },
        head: {
            appendChild: function (node) { appendedStyles.push(node); }
        }
    },
    window: {
        location: { href: "https://mesh.example/?viewmode=19" },
        history: { state: null, replaceState: function () {} },
        prompt: function () {},
        SharedScriptTools: {
            create: function () { return createBaseTools(); }
        }
    }
};
context.window.window = context.window;

vm.runInNewContext(source, context, { filename: "script-edit-actions.js" });

var tools = context.window.SharedScriptTools.create({ deepLinkParameter: "mycommand" });
var active = Object.create(null);
var visible = Object.create(null);
var toolbar = {
    setActive: function (key, value) { active[key] = value === true; },
    setVisible: function (key, value) { visible[key] = value !== false; },
    setEnabled: function () {}
};
var config = {
    canEdit: true,
    enableMulti: true,
    onEdit: function () {},
    onMulti: function () {}
};
var script = { path: "folder/test.ps1", secretVariables: [] };

tools.syncToolbar(toolbar, "catalog", null, config);
assert.strictEqual(visible.manage, true, "Neutral mode must show the Edit choice.");
assert.strictEqual(visible.multi, true, "Neutral mode must show the Multi choice.");

tools.toggleEdit(toolbar);
assert.strictEqual(tools.state.editMode, true, "Edit must activate.");
assert.strictEqual(tools.state.multiPickMode, false, "Activating Edit must disable Multi.");
assert.strictEqual(active.manage, true, "The Edit toolbar button must be active.");
assert.strictEqual(active.multi, false, "The Multi toolbar button must be inactive in Edit mode.");
assert.strictEqual(visible.manage, true, "The Edit button must remain visible while active.");
assert.strictEqual(visible.multi, true, "The Multi button must remain available as a direct switch from Edit.");
assert.deepStrictEqual(
    actionKeys(tools, script, config),
    ["credentials", "favorite", "link", "edit"],
    "Edit mode must show only Edit actions."
);

tools.toggleMulti(toolbar);
assert.strictEqual(tools.state.editMode, false, "Activating Multi must disable Edit.");
assert.strictEqual(tools.state.multiPickMode, true, "Multi must activate.");
assert.strictEqual(active.manage, false, "The Edit toolbar button must be inactive in Multi mode.");
assert.strictEqual(active.multi, true, "The Multi toolbar button must be active.");
assert.strictEqual(visible.manage, true, "The Edit button must remain available as a direct switch from Multi.");
assert.strictEqual(visible.multi, true, "The active Multi button must remain visible.");
assert.deepStrictEqual(
    actionKeys(tools, script, config),
    ["multi"],
    "Multi mode must show only the multi-device action."
);

tools.toggleMulti(toolbar);
assert.strictEqual(tools.state.multiPickMode, false, "Clicking active Multi again must return to neutral mode.");
assert.strictEqual(visible.manage, true, "Neutral mode must retain Edit after Multi is closed.");
assert.strictEqual(visible.multi, true, "Neutral mode must retain Multi after it is closed.");

tools.toggleEdit(toolbar);
assert.strictEqual(tools.state.editMode, true, "Edit must reactivate.");
assert.strictEqual(tools.state.multiPickMode, false, "Reactivating Edit must keep Multi disabled.");
assert.strictEqual(visible.manage, true, "Edit must remain visible after reactivation.");
assert.strictEqual(visible.multi, true, "Multi must remain visible while Edit is active again.");

assert.ok(source.indexOf('toolbar.setVisible("manage", modeCapabilities.canEdit === true)') >= 0 &&
    source.indexOf('toolbar.setVisible("multi", modeCapabilities.enableMulti === true)') >= 0,
    "Mode visibility must follow capabilities, not the currently active mode.");
assert.ok(/manage:[^\n]*order: 40/.test(toolbarConfig),
    "Edit must remain directly before Multi.");
assert.ok(/multi:[^\n]*order: 41/.test(toolbarConfig),
    "Multi must remain directly beside Edit.");
assert.ok(/refresh:[^\n]*order: 50/.test(toolbarConfig),
    "Refresh must remain after the Edit and Multi controls.");

assert.strictEqual(appendedStyles.length, 1, "The edit action style must be installed once.");
console.log("Edit and Multi remain visible and switch active modes directly: OK");

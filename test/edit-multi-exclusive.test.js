"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "script-edit-actions.js"),
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
        scriptActions: function (script) {
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
var toolbar = {
    setActive: function (key, value) { active[key] = value === true; },
    setVisible: function () {},
    setEnabled: function () {}
};
var config = {
    canEdit: true,
    enableMulti: true,
    onEdit: function () {},
    onMulti: function () {}
};
var script = { path: "folder/test.ps1", secretVariables: [] };

tools.toggleEdit(toolbar);
assert.strictEqual(tools.state.editMode, true, "Edit must activate.");
assert.strictEqual(tools.state.multiPickMode, false, "Activating Edit must disable Multi.");
assert.strictEqual(active.manage, true, "The Edit toolbar button must be active.");
assert.strictEqual(active.multi, false, "The Multi toolbar button must be inactive in Edit mode.");
assert.deepStrictEqual(
    tools.scriptActions(script, config).map(function (item) { return item.key; }),
    ["credentials", "favorite", "link", "edit"],
    "Edit mode must show only Edit actions."
);

tools.toggleMulti(toolbar);
assert.strictEqual(tools.state.editMode, false, "Activating Multi must disable Edit.");
assert.strictEqual(tools.state.multiPickMode, true, "Multi must activate.");
assert.strictEqual(active.manage, false, "The Edit toolbar button must be inactive in Multi mode.");
assert.strictEqual(active.multi, true, "The Multi toolbar button must be active.");
assert.deepStrictEqual(
    tools.scriptActions(script, config).map(function (item) { return item.key; }),
    ["multi"],
    "Multi mode must show only the multi-device action."
);

tools.toggleEdit(toolbar);
assert.strictEqual(tools.state.editMode, true, "Edit must reactivate.");
assert.strictEqual(tools.state.multiPickMode, false, "Reactivating Edit must disable Multi again.");
assert.strictEqual(active.manage, true, "The Edit toolbar button must be active again.");
assert.strictEqual(active.multi, false, "The Multi toolbar button must be inactive again.");
assert.deepStrictEqual(
    tools.scriptActions(script, config).map(function (item) { return item.key; }),
    ["credentials", "favorite", "link", "edit"],
    "Returning to Edit must remove the multi-device action."
);

assert.strictEqual(appendedStyles.length, 1, "The edit action style must be installed once.");
console.log("Edit and Multi modes are mutually exclusive: OK");

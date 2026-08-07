"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "script-tools.js"),
    "utf8"
);

var storage = Object.create(null);
var context = {
    console: console,
    Promise: Promise,
    URL: URL,
    navigator: {},
    document: {
        title: "MC-SIRK",
        querySelectorAll: function () { return []; }
    },
    window: {
        localStorage: {
            getItem: function (key) { return storage[key] || null; },
            setItem: function (key, value) { storage[key] = String(value); }
        },
        location: { href: "https://mesh.example/" },
        history: { state: null, replaceState: function () {} }
    }
};
context.window.window = context.window;
vm.runInNewContext(source, context, { filename: "script-tools.js" });

var tool = context.window.SharedScriptTools.create({ storageKey: "test.edit.atomic" });
var active = Object.create(null);
var events = [];
var toolbar = {
    setActive: function (key, value) {
        active[key] = value === true;
        events.push("active:" + key + ":" + String(value === true));
    },
    setEnabled: function () {},
    setVisible: function () {},
    setTitle: function () {}
};

function deferred() {
    var resolve;
    var reject;
    var promise = new Promise(function (yes, no) { resolve = yes; reject = no; });
    return { promise: promise, resolve: resolve, reject: reject };
}

(async function () {
    var opening = deferred();
    var openResult = tool.toggleEdit(toolbar, function () {
        events.push("render:open:start");
        return opening.promise.then(function () { events.push("render:open:commit"); });
    });

    assert.strictEqual(tool.state.editMode, true, "Edit state must toggle before rendering the new tree.");
    assert.strictEqual(active.manage, undefined,
        "Edit geometry must not activate before the render that adds action buttons commits.");
    assert.strictEqual(active.link, false, "Edit must still clear link mode immediately.");
    assert.strictEqual(tool.state.multiPickMode, false,
        "Edit must clear the Multi state before staging the new tree.");
    assert.strictEqual(active.multi, undefined,
        "Edit must not mutate live Multi geometry before the atomic render commits.");

    opening.resolve();
    await openResult;
    assert.strictEqual(active.manage, true,
        "Edit geometry must activate only after the action-bearing render commits.");
    assert.ok(events.indexOf("render:open:commit") < events.indexOf("active:manage:true"),
        "Opening Edit must commit the new action DOM before expanding the live layout.");

    events.length = 0;
    var closing = deferred();
    var closeResult = tool.toggleEdit(toolbar, function () {
        events.push("render:close:start");
        return closing.promise.then(function () { events.push("render:close:commit"); });
    });

    assert.strictEqual(tool.state.editMode, false, "Edit state must toggle off before rendering normal rows.");
    assert.strictEqual(active.manage, true,
        "The live layout must stay expanded while the old action DOM is still connected.");

    closing.resolve();
    await closeResult;
    assert.strictEqual(active.manage, false,
        "Edit geometry must collapse only after the render without action buttons commits.");
    assert.ok(events.indexOf("render:close:commit") < events.indexOf("active:manage:false"),
        "Closing Edit must remove action DOM before shrinking the live secondary track.");

    events.length = 0;
    var syncResult = tool.toggleEdit(toolbar, function () {
        events.push("render:sync");
        return "sync-result";
    });
    assert.strictEqual(syncResult, "sync-result", "Synchronous render callbacks must keep their return value.");
    assert.strictEqual(active.manage, true, "Synchronous callbacks must still synchronize Edit geometry.");
    assert.ok(events.indexOf("render:sync") < events.indexOf("active:manage:true"),
        "Synchronous callbacks must run before Edit geometry is changed.");

    events.length = 0;
    var multiOpening = deferred();
    var multiResult = tool.toggleMulti(toolbar, function () {
        events.push("render:multi:start");
        tool.syncToolbar(toolbar, "commands", "", { canEdit: true, enableMulti: true });
        return multiOpening.promise.then(function () { events.push("render:multi:commit"); });
    });
    assert.strictEqual(tool.state.editMode, false, "Opening Multi must disable Edit state before rendering.");
    assert.strictEqual(tool.state.multiPickMode, true, "Multi state must toggle before rendering its action DOM.");
    assert.strictEqual(active.manage, true,
        "The old Edit geometry must remain live while the staged Multi render is pending.");
    assert.strictEqual(active.multi, false,
        "Staged syncToolbar must not mutate live Multi geometry before atomic commit.");
    multiOpening.resolve();
    await multiResult;
    assert.strictEqual(active.manage, false, "Edit geometry must clear after the Multi DOM commits.");
    assert.strictEqual(active.multi, true, "Multi geometry must activate after its action DOM commits.");
    assert.ok(events.indexOf("render:multi:commit") < events.indexOf("active:multi:true"),
        "Opening Multi must commit the new action DOM before changing live geometry.");

    events.length = 0;
    var multiClosing = deferred();
    var multiCloseResult = tool.toggleMulti(toolbar, function () {
        events.push("render:multi-close:start");
        return multiClosing.promise.then(function () { events.push("render:multi-close:commit"); });
    });
    assert.strictEqual(active.multi, true,
        "The live Multi geometry must remain until the action DOM has been removed.");
    multiClosing.resolve();
    await multiCloseResult;
    assert.strictEqual(active.multi, false,
        "Multi geometry must collapse only after the normal rows commit.");
    assert.ok(events.indexOf("render:multi-close:commit") < events.indexOf("active:multi:false"),
        "Closing Multi must remove action DOM before shrinking the live secondary track.");

    console.log("Edit and Multi geometry follow one atomic action DOM lifecycle: OK");
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

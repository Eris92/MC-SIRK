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
    }
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
    assert.strictEqual(active.multi, false, "Edit must still clear multi mode immediately.");

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

    console.log("Edit mode geometry follows atomic action DOM commit: OK");
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

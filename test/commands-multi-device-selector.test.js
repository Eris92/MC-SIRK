"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public", "shared", "ui", "script-tools.js"), "utf8");
var backend = fs.readFileSync(path.join(root, "server", "modules", "commands", "index.js"), "utf8");

var nodeA = "node/domain/alpha";
var nodeB = "node/domain/beta";
var nodeC = "node/domain/gamma";
var hiddenNode = "node/domain/hidden";

var context = {
    URL: URL,
    Promise: Promise,
    Array: Array,
    String: String,
    Number: Number,
    Object: Object,
    JSON: JSON,
    Math: Math,
    Set: Set,
    isFinite: isFinite,
    console: console,
    navigator: { clipboard: null },
    document: {
        title: "Commands",
        querySelectorAll: function () { return []; }
    },
    window: {
        nodes: [
            { _id: nodeA, name: "Alpha", rname: "alpha-host", meshid: "mesh/domain/prod", tags: ["Prod", "Blue"] },
            { _id: nodeB, name: "Beta", rname: "beta-host", meshid: "mesh/domain/prod", tags: ["Prod"] },
            { _id: nodeC, name: "Gamma", rname: "gamma-host", meshid: "mesh/domain/lab", tags: ["Blue"] },
            { _id: nodeA, name: "Duplicate Alpha", rname: "duplicate-host", meshid: "mesh/domain/lab", tags: ["Duplicate"] }
        ],
        meshes: {
            "mesh/domain/prod": { name: "Production" },
            "mesh/domain/lab": { name: "Lab" },
            "mesh/domain/hidden": { name: "Hidden group" }
        },
        devices: {
            "node/domain/hidden": { _id: hiddenNode, name: "Hidden host" }
        },
        checkedNodeids: {},
        selectedNodeIds: [hiddenNode],
        location: { href: "https://mesh.example/?viewmode=19" },
        history: { state: null, replaceState: function () {} },
        localStorage: { getItem: function () { return null; }, setItem: function () {} },
        setTimeout: function () {},
        prompt: function () {},
        confirm: function () { return true; }
    }
};
context.window.window = context.window;
context.window.checkedNodeids[nodeB] = 1;

vm.runInNewContext(source, context, { filename: "script-tools.js" });

var shared = context.window.SharedScriptTools;
assert.ok(shared && typeof shared.buildMultiDeviceCatalog === "function", "SharedScriptTools must own the visible-device catalog.");
assert.ok(typeof shared.createMultiDeviceSelection === "function", "SharedScriptTools must own multi-device selection state.");

var catalog = shared.buildMultiDeviceCatalog(nodeA);
assert.deepStrictEqual(Array.from(catalog.devices, function (device) { return device.id; }), [nodeA, nodeB, nodeC],
    "The catalog must use visible MeshCentral nodes, sort them stably and deduplicate by nodeId.");
assert.strictEqual(catalog.devices.some(function (device) { return device.id === hiddenNode; }), false,
    "Hosts outside the permission-filtered MeshCentral nodes store must not leak into the selector.");
assert.deepStrictEqual(Array.from(catalog.initialIds), [nodeB],
    "Native checkedNodeids must seed the selector when a MeshCentral multi-selection exists.");

function scopeByName(items, name) {
    return items.filter(function (item) { return item.name === name; })[0];
}

var production = scopeByName(catalog.groups, "Production");
var lab = scopeByName(catalog.groups, "Lab");
var prodTag = scopeByName(catalog.tags, "Prod");
var blueTag = scopeByName(catalog.tags, "Blue");
assert.ok(production && lab && prodTag && blueTag, "Visible groups and tags must be available as selection scopes.");
assert.deepStrictEqual(Array.from(production.ids), [nodeA, nodeB], "Production must contain only its visible hosts.");
assert.deepStrictEqual(Array.from(lab.ids), [nodeC], "Duplicate node records must not change group membership after nodeId dedupe.");
assert.deepStrictEqual(Array.from(prodTag.ids), [nodeA, nodeB], "Tag scope must contain matching visible hosts.");
assert.deepStrictEqual(Array.from(blueTag.ids), [nodeA, nodeC], "Overlapping tag scope must preserve stable node identities.");
assert.strictEqual(catalog.groups.some(function (group) { return group.name === "Hidden group"; }), false,
    "Groups without any visible host must not be exposed.");

var selection = shared.createMultiDeviceSelection(catalog, 2);
assert.strictEqual(selection.count(), 1, "Initial selection must contain the native MeshCentral selection only.");
assert.deepStrictEqual(Array.from(selection.selectedIds()), [nodeB], "Initial selected ids must be canonical nodeIds.");
assert.strictEqual(selection.canRun(), true, "One selected host must be runnable under a limit of two.");

selection.setScope(production.ids, true);
assert.deepStrictEqual(Array.from(selection.selectedIds()), [nodeA, nodeB], "Selecting a group must select each matching host once.");
assert.strictEqual(selection.count(), 2, "Group selection must not create duplicates.");
assert.strictEqual(selection.canRun(), true, "Selection at the configured limit must remain runnable.");

selection.setScope(blueTag.ids, true);
assert.deepStrictEqual(Array.from(selection.selectedIds()), [nodeA, nodeB, nodeC],
    "Overlapping tag and group scopes must deduplicate by stable nodeId.");
assert.strictEqual(selection.count(), 3, "Overlapping scopes must still have one canonical Set owner.");
assert.strictEqual(selection.overLimit(), true, "Selection above maxMultiHostNodes must be reported explicitly.");
assert.strictEqual(selection.canRun(), false, "Run must be disabled above maxMultiHostNodes instead of truncating.");

var filtered = selection.filter("ALPHA-HOST");
assert.deepStrictEqual(Array.from(filtered, function (device) { return device.id; }), [nodeA],
    "Search must be case-insensitive and include the MeshCentral hostname/rname.");
assert.deepStrictEqual(Array.from(selection.selectedIds()), [nodeA, nodeB, nodeC],
    "Filtering must not mutate hidden selections.");

selection.setHost(nodeC, false);
assert.strictEqual(selection.count(), 2, "Manual host checkbox changes must update the canonical Set.");
assert.strictEqual(selection.canRun(), true, "Run must re-enable when the selection returns to the limit.");
selection.setScope(prodTag.ids, false);
assert.strictEqual(selection.count(), 0, "Clearing a tag scope must clear matching selected hosts.");
assert.strictEqual(selection.canRun(), false, "Run must stay disabled with zero selected hosts.");
selection.setAll(true);
assert.strictEqual(selection.count(), 3, "All hosts must select every visible accessible host.");
assert.strictEqual(selection.canRun(), false, "All hosts must not silently truncate a selection above the limit.");

var reopened = shared.createMultiDeviceSelection(shared.buildMultiDeviceCatalog(nodeA), 2);
assert.deepStrictEqual(Array.from(reopened.selectedIds()), [nodeB],
    "Reopening the selector must rebuild initial state from MeshCentral selection without accumulating prior local state.");

context.window.checkedNodeids = {};
var currentFallback = shared.buildMultiDeviceCatalog(nodeA);
assert.deepStrictEqual(Array.from(currentFallback.initialIds), [nodeA],
    "When native selection is empty, the current visible node must seed initial state even if a legacy alias references a hidden host.");

var multiStart = source.indexOf("function openMultiExecution");
var multiEnd = source.indexOf("\n\n            var tool =", multiStart);
var multiSource = source.slice(multiStart, multiEnd);
assert.ok(multiStart >= 0 && multiEnd > multiStart, "The shared multi-device renderer must exist.");
assert.strictEqual(multiSource.indexOf("shell.api("), -1, "Opening or searching the selector must not request a new host catalog.");
assert.strictEqual(multiSource.indexOf("setInterval("), -1, "The selector must not add polling loops.");
assert.strictEqual(multiSource.indexOf("MutationObserver"), -1, "The selector must not add observers.");
assert.ok(multiSource.indexOf("selection.filter(search.value)") >= 0, "Host search must remain client-side over the normalized catalog.");
assert.ok(multiSource.indexOf("ids.length + \" selected device(s)?\"") >= 0,
    "Final confirmation must show the unique final device count.");

assert.ok(backend.indexOf('if (ids.length > maxMultiHostNodes) throw new Error("A maximum of " + maxMultiHostNodes + " devices can be selected.");') >= 0,
    "Backend multi-execute must keep the oversized payload guard as the authoritative limit.");

console.log("Commands multi-device catalog, scopes, search, dedupe, limit, security and reopen behavior: OK");

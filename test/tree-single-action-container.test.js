"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "tree.js"),
    "utf8"
);

var context = {
    window: {},
    document: {},
    MutationObserver: function () {}
};
context.window.window = context.window;
vm.runInNewContext(source, context, { filename: "tree.js" });

function classList(names) {
    names = names || [];
    return {
        contains: function (name) { return names.indexOf(name) >= 0; }
    };
}

function actionContainer(actionCount, canonical) {
    return {
        classList: classList(["mc-tree-script-actions"]),
        parentNode: null,
        getAttribute: function (name) {
            return name === "data-sirk-action-container" && canonical ? "canonical" : null;
        },
        querySelectorAll: function (selector) {
            return selector === ".mc-tree-script-action"
                ? new Array(actionCount).fill({})
                : [];
        }
    };
}

function row(containers) {
    var value = {
        children: containers.slice(),
        removeChild: function (child) {
            var index = this.children.indexOf(child);
            if (index >= 0) this.children.splice(index, 1);
            child.parentNode = null;
            return child;
        }
    };
    value.children.forEach(function (child) { child.parentNode = value; });
    return value;
}

var normalize = context.window.SharedDirectoryTree.normalizeActionContainers;
assert.strictEqual(typeof normalize, "function",
    "The tree renderer must expose its action-container invariant for regression tests.");

var legacyFavorite = actionContainer(1, false);
var canonicalEdit = actionContainer(4, true);
var editRow = row([legacyFavorite, canonicalEdit]);
assert.strictEqual(normalize(editRow), canonicalEdit,
    "Edit mode must retain the canonical four-button action group.");
assert.deepStrictEqual(editRow.children, [canonicalEdit],
    "The standalone legacy Favorite group must be removed from Edit mode.");

var legacyMulti = actionContainer(1, false);
var canonicalMulti = actionContainer(1, true);
var multiRow = row([legacyMulti, canonicalMulti]);
assert.strictEqual(normalize(multiRow), canonicalMulti,
    "Multi mode must prefer the explicitly marked canonical action group.");
assert.deepStrictEqual(multiRow.children, [canonicalMulti],
    "The duplicate standalone Multi action must be removed.");

var largerUnmarked = actionContainer(4, false);
var smallerUnmarked = actionContainer(1, false);
var fallbackRow = row([largerUnmarked, smallerUnmarked]);
assert.strictEqual(normalize(fallbackRow), largerUnmarked,
    "Unmarked compatibility containers must retain the group with the most actions.");
assert.deepStrictEqual(fallbackRow.children, [largerUnmarked],
    "The smaller unmarked duplicate group must be removed.");

var firstTie = actionContainer(1, false);
var lastTie = actionContainer(1, false);
var tieRow = row([firstTie, lastTie]);
assert.strictEqual(normalize(tieRow), lastTie,
    "Equal compatibility groups must keep the last rendered container.");
assert.deepStrictEqual(tieRow.children, [lastTie],
    "Only one action container may remain after a tie.");

assert.ok(source.indexOf('actions.setAttribute("data-sirk-action-container", "canonical")') >= 0,
    "The shared renderer must mark its canonical action group.");
assert.ok(source.indexOf("installActionContainerGuard(treeHost)") >= 0,
    "The tree host must guard against action containers added by later decorators.");
assert.ok(source.indexOf('observer.observe(root, { childList: true, subtree: true })') >= 0,
    "The guard must cover asynchronous nested row mutations.");

console.log("One canonical action container per script row: OK");

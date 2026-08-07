"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "tree.js"),
    "utf8"
);

var renderActionsStart = source.indexOf("function renderActions(host, script, options)");
var renderScriptStart = source.indexOf("function renderScript(host, script, options)", renderActionsStart);
assert.ok(renderActionsStart >= 0 && renderScriptStart > renderActionsStart,
    "The canonical tree action renderer must exist.");
var renderActions = source.slice(renderActionsStart, renderScriptStart);

assert.ok(renderActions.indexOf('var actions = document.createElement("span")') >= 0 &&
    renderActions.indexOf('actions.className = "mc-tree-script-actions"') >= 0,
    "Each script render must create one action container locally.");
assert.ok(renderActions.indexOf("var renderedKeys = Object.create(null)") >= 0 &&
    renderActions.indexOf("if (renderedKeys[identity]) return") >= 0 &&
    renderActions.indexOf("renderedKeys[identity] = true") >= 0,
    "Duplicate action definitions must be eliminated before buttons are appended.");
assert.ok(renderActions.indexOf('action.setAttribute("data-sirk-action-key", identity)') >= 0,
    "Every rendered action must expose its canonical identity for diagnostics.");
assert.ok(renderActions.indexOf("if (actions.childNodes.length) host.appendChild(actions)") >= 0,
    "The action container must be appended exactly once and only when it contains visible actions.");
assert.strictEqual((renderActions.match(/host\.appendChild\(actions\)/g) || []).length, 1,
    "The action renderer must have exactly one action-container append path.");

var renderScriptEnd = source.indexOf("function renderDirectory(host, directory, options)", renderScriptStart);
var renderScript = source.slice(renderScriptStart, renderScriptEnd);
assert.ok(renderScript.indexOf("row.appendChild(button)") >= 0 &&
    renderScript.indexOf("renderActions(row, script, options)") >= 0 &&
    renderScript.indexOf("host.appendChild(row)") >= 0,
    "A script row must render its button, then its one canonical action group, then enter the tree.");
assert.strictEqual((renderScript.match(/renderActions\(row, script, options\)/g) || []).length, 1,
    "A script row must request action rendering exactly once.");

assert.strictEqual(source.indexOf("normalizeActionContainers"), -1,
    "Production tree code must not export a test-only duplicate-container cleanup API.");
assert.strictEqual(source.indexOf("installActionContainerGuard"), -1,
    "Production tree code must not repair duplicate action containers after rendering.");
assert.strictEqual(source.indexOf("MutationObserver"), -1,
    "The tree renderer must prevent duplicates at creation time instead of observing and repairing the DOM.");
assert.strictEqual(source.indexOf("data-sirk-action-container"), -1,
    "The removed compatibility ownership marker must not return.");

console.log("One action container is created per script row with duplicate keys rejected at render time: OK");

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var shell = fs.readFileSync(path.join(root, "public", "shared", "module-shell.js"), "utf8");
var layout = fs.readFileSync(path.join(root, "public", "shared", "ui", "layout.js"), "utf8");

assert.ok(shell.indexOf("var sequence = Number(state.renderSequence || 0) + 1") >= 0 &&
    shell.indexOf("state.renderSequence = sequence") >= 0,
    "Every module render must receive a monotonically increasing sequence number.");
assert.ok(shell.indexOf('var nextSecondary = document.createElement("section")') >= 0 &&
    shell.indexOf('var nextDetails = document.createElement("section")') >= 0,
    "Secondary and details content must be rendered into detached replacement sections.");
assert.ok(shell.indexOf("page.secondary = nextSecondary") >= 0 &&
    shell.indexOf("page.details = nextDetails") >= 0,
    "Module renderers must write into detached sections instead of clearing the live page.");
assert.ok(shell.indexOf("if (sequence !== state.renderSequence) return") >= 0,
    "An older asynchronous render must be discarded when a newer render has already started.");
assert.ok(shell.indexOf("replaceChildren(realSecondary, nextSecondary)") >= 0 &&
    shell.indexOf("replaceChildren(realDetails, nextDetails)") >= 0,
    "Live module columns must be replaced only during the final atomic commit.");
assert.ok(shell.indexOf("restoreReferences();") >= 0,
    "Page references must be restored to the live DOM before commit or error handling.");
assert.ok(shell.indexOf('window.MeshThemeAdapter.refresh(page.root || realDetails.parentNode)') >= 0,
    "The atomic commit must reapply native MeshCentral classes to the completed render.");
assert.ok(shell.indexOf("if (sequence === state.renderSequence) renderError(realDetails, error)") >= 0,
    "Only the latest render may replace the live details column with an error state.");

var renderStart = shell.indexOf("render: function () {");
var renderEnd = shell.indexOf("api: function (asset", renderStart);
assert.ok(renderStart >= 0 && renderEnd > renderStart,
    "The canonical module render function must exist.");
var renderBlock = shell.slice(renderStart, renderEnd);
assert.strictEqual(renderBlock.indexOf("page.layout.clear()"), -1,
    "Rerendering must never blank the live three-column layout before new data is ready.");
assert.strictEqual(renderBlock.indexOf('realSecondary.innerHTML = ""'), -1,
    "Rerendering must not clear the live secondary column before commit.");
assert.strictEqual(renderBlock.indexOf('realDetails.innerHTML = ""'), -1,
    "Rerendering must not clear the live details column before commit.");
assert.strictEqual(shell.indexOf("__sirkStableModuleRenderingInstalled"), -1,
    "Stable rendering must be the canonical module-shell implementation, not an installed compatibility patch.");
assert.strictEqual(layout.indexOf("SirkPlatformModuleShell"), -1,
    "SharedLayout must not monkey-patch module rendering lifecycle.");
assert.strictEqual(layout.indexOf("renderQueued"), -1,
    "SharedLayout must not maintain a second render queue.");

console.log("Canonical atomic shared module rendering without blank intermediate state: OK");

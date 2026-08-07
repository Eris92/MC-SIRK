"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var adapter = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar-config.js"), "utf8");
var toolbarApi = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar-api.js"), "utf8");
var settings = fs.readFileSync(path.join(root, "public", "shared", "ui", "settings.js"), "utf8");
var layout = fs.readFileSync(path.join(root, "public", "shared", "ui", "layout.js"), "utf8");
var shell = fs.readFileSync(path.join(root, "public", "shared", "module-shell.js"), "utf8");

assert.ok(adapter.indexOf("function syncOwnedClasses(element, desired)") >= 0,
    "The native adapter must update only classes whose desired state changed.");
assert.strictEqual(adapter.indexOf("function reset(element)"), -1,
    "The native adapter must not reset and re-add all classes on every pass.");
assert.ok(adapter.indexOf("contentObserver.observe(target, { childList: true, subtree: true })") >= 0,
    "The content observer must watch only newly inserted DOM nodes.");
assert.ok(adapter.indexOf('themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-bs-theme"] })') >= 0,
    "Theme attributes may be observed only on the document root.");
assert.ok(adapter.indexOf('themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "data-bs-theme"] })') >= 0,
    "Theme attributes may be observed only on the body.");
assert.strictEqual(adapter.indexOf("attributes: true, subtree: true"), -1,
    "The adapter must never observe class changes throughout the full document subtree.");
assert.ok(adapter.indexOf("Promise.resolve().then(function ()") >= 0,
    "Native class synchronization must be coalesced in a microtask before paint.");

assert.ok(toolbarApi.indexOf('item.classList.toggle("is-active", active)') >= 0 &&
    toolbarApi.indexOf('item.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "Toolbar active state must be owned by the canonical toolbar API.");
assert.ok(toolbarApi.indexOf('window.MeshThemeAdapter.button(item)') >= 0,
    "Changing a toolbar active state must immediately reapply its native MeshCentral button class.");
assert.strictEqual(settings.indexOf("installSynchronousToolbarTheme"), -1,
    "Settings must not monkey-patch toolbar state synchronization.");
assert.strictEqual(settings.indexOf("MutationObserver"), -1,
    "Settings must not duplicate the canonical theme adapter observer.");

assert.ok(layout.indexOf("clear: function ()") >= 0 &&
    layout.indexOf('primary.innerHTML = ""') >= 0 &&
    layout.indexOf('secondary.innerHTML = ""') >= 0 &&
    layout.indexOf('details.innerHTML = ""') >= 0,
    "Layout clear must remain an explicit API operation instead of an implicit render side effect.");
assert.ok(shell.indexOf('var nextSecondary = document.createElement("section")') >= 0 &&
    shell.indexOf('var nextDetails = document.createElement("section")') >= 0,
    "Module rendering must build secondary and details content off the live page.");
assert.ok(shell.indexOf("replaceChildren(realSecondary, nextSecondary)") >= 0 &&
    shell.indexOf("replaceChildren(realDetails, nextDetails)") >= 0,
    "Atomic render commit must replace live content only after the next render is ready.");
assert.ok(shell.indexOf("state.renderSequence") >= 0 && shell.indexOf("sequence !== state.renderSequence") >= 0,
    "Stale overlapping renders must be discarded instead of repainting over newer state.");

console.log("Native theme adapter and atomic module rendering have no feedback or blank-render loop: OK");

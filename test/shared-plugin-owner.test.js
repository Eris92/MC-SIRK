"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var core = fs.readFileSync(path.join(root, "public", "shared", "core.js"), "utf8");
var shell = fs.readFileSync(path.join(root, "public", "shared", "module-shell.js"), "utf8");
var runtime = fs.readFileSync(path.join(root, "public", "shared", "runtime.js"), "utf8");
var startup = fs.readFileSync(path.join(root, "plugin-main.js"), "utf8");

assert.ok(core.indexOf('window.SirkPlatformCore = window.SirkPlatformCore || {}') >= 0 &&
    core.indexOf('core.activePlugin = core.activePlugin || null') >= 0,
    "SIRK must have one explicit shared core and active workspace owner.");
assert.ok(shell.indexOf('if (core.activePlugin && core.activePlugin !== moduleInstance && typeof core.activePlugin.close === "function")') >= 0 &&
    shell.indexOf('core.activePlugin.close(false)') >= 0 &&
    shell.indexOf('core.activePlugin = moduleInstance') >= 0,
    "Switching SIRK modules must close the previous SIRK owner and transfer ownership atomically.");
assert.ok(shell.indexOf('if (core.activePlugin === moduleInstance) core.activePlugin = null') >= 0,
    "Closing a SIRK workspace must release only its own shared owner.");

assert.strictEqual(core.indexOf("MeshPluginCore"), -1,
    "SIRK core must not alias, replace or monkey-patch another plugin's global owner.");
assert.strictEqual(shell.indexOf("MeshPluginCore"), -1,
    "Module lifecycle must not depend on another plugin's private global owner.");
assert.strictEqual(runtime.indexOf("MeshPluginCore"), -1,
    "Runtime lifecycle must stay isolated from removed MeshPluginCore compatibility code.");
assert.strictEqual(startup.indexOf("mesh-plugin-core"), -1,
    "Browser startup must not load the removed MeshPluginCore compatibility layer.");

assert.ok(core.indexOf('item.setAttribute("data-meshcentral-plugin-menu", String(order))') >= 0 &&
    core.indexOf('items = Array.prototype.slice.call(host.children).filter(function (child)') >= 0,
    "SIRK menu ordering must affect only entries explicitly registered by SIRK.");
assert.ok(core.indexOf('return child.hasAttribute("data-meshcentral-plugin-menu")') >= 0,
    "Unrelated third-party menu entries must stay outside SIRK reordering.");
assert.ok(core.indexOf('"#MainMenuSpan .fullselect"') >= 0 &&
    core.indexOf('"#page_leftbar .lbbuttonsel2"') >= 0,
    "Native selection cleanup must target known MeshCentral selected states.");
assert.strictEqual(core.indexOf('[id^="MainMenu"]'), -1,
    "SIRK must not clear every top-menu entry by generic ID prefix.");
assert.strictEqual(core.indexOf('[id^="LeftMenu"]'), -1,
    "SIRK must not clear every left-menu entry by generic ID prefix.");

assert.ok(core.indexOf('main.classList.add((String(main.tagName || "").toLowerCase() === "a" || main.classList.contains("nav-link")) ? "active" : "fullselect")') >= 0,
    "Top-menu selection must use Bootstrap active in Modern MeshCentral and fullselect in Classic MeshCentral.");
assert.ok(core.indexOf('left.classList.add((String(left.tagName || "").toLowerCase() === "a" || left.classList.contains("nav-link")) ? "active" : "lbbuttonsel2")') >= 0,
    "Left-menu selection must use Bootstrap active in Modern MeshCentral and lbbuttonsel2 in Classic MeshCentral.");
assert.ok(core.indexOf('main.setAttribute("aria-current", "page")') >= 0 &&
    core.indexOf('left.setAttribute("aria-current", "page")') >= 0,
    "Active Modern/Classic menu entries must expose accessible current-page state.");

assert.ok(core.indexOf('image.className = "sirk-platform-menu-icon"') >= 0 &&
    core.indexOf('image.style.width = "24px"') >= 0 &&
    core.indexOf('image.style.height = "24px"') >= 0 &&
    core.indexOf('image.style.objectFit = "contain"') >= 0,
    "Modern SIRK menu icons must use one canonical 24 px native-aligned image geometry.");
assert.ok(core.indexOf('legacyIcon.style.backgroundSize = "contain"') >= 0,
    "Classic SIRK menu icons must keep their native slot and preserve proportions.");

console.log("Isolated SIRK owner and native third-party-safe menu lifecycle: OK");

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var core = fs.readFileSync(path.join(root, "public", "shared", "core.js"), "utf8");
var page = fs.readFileSync(path.join(root, "public", "shared", "ui", "page.js"), "utf8");
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
assert.ok(core.indexOf('if (cursor.nextSibling !== entry) host.insertBefore(entry, cursor.nextSibling)') >= 0,
    "Stable ordered entries must not be detached/reinserted during repeated reconciliation.");
assert.ok(core.indexOf('"#MainMenuSpan .fullselect"') >= 0 &&
    core.indexOf('"#page_leftbar .lbbuttonsel"') >= 0 &&
    core.indexOf('"#page_leftbar .lbbuttonsel2"') >= 0,
    "Native selection cleanup must target known Classic and Modern MeshCentral selected states.");
assert.strictEqual(core.indexOf('[id^="MainMenu"]'), -1,
    "SIRK must not clear every top-menu entry by generic ID prefix.");
assert.strictEqual(core.indexOf('[id^="LeftMenu"]'), -1,
    "SIRK must not clear every left-menu entry by generic ID prefix.");

assert.ok(core.indexOf('main.classList.add(isModernMenuItem(main) ? "active" : "fullselect")') >= 0,
    "Top-menu selection must use Bootstrap active in Modern MeshCentral and fullselect in Classic MeshCentral.");
assert.ok(core.indexOf('if (isModernMenuItem(left)) left.classList.add("active", "lbbuttonsel2")') >= 0 &&
    core.indexOf('else left.classList.add("lbbuttonsel")') >= 0,
    "Left-menu selection must use Modern active/lbbuttonsel2 and compact Classic lbbuttonsel without a deferred owner.");
assert.ok(core.indexOf('main.setAttribute("aria-current", "page")') >= 0 &&
    core.indexOf('left.setAttribute("aria-current", "page")') >= 0,
    "Active Modern/Classic menu entries must expose accessible current-page state.");

assert.ok(core.indexOf('image.className = "sirk-platform-menu-icon"') >= 0 &&
    core.indexOf('image.style.width = "32px"') >= 0 &&
    core.indexOf('image.style.height = "32px"') >= 0 &&
    core.indexOf('image.style.objectFit = "contain"') >= 0,
    "Modern SIRK menu icons must use the enlarged canonical image geometry on the first mount.");
assert.ok(core.indexOf('icon.style.backgroundSize = "48px 48px"') >= 0,
    "Classic SIRK menu icons must use final native-sized drawing geometry on the first mount.");
assert.strictEqual(page.indexOf("installNativeLeftMenuContract"), -1,
    "Deferred SharedPage must not become a second menu owner.");

console.log("Isolated SIRK first-paint owner and native third-party-safe menu lifecycle: OK");

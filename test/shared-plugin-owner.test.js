"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

function createClassList(initial) {
    var values = Array.isArray(initial) ? initial.slice() : [];
    return {
        add: function () {
            Array.prototype.forEach.call(arguments, function (value) {
                if (values.indexOf(value) < 0) values.push(value);
            });
        },
        remove: function () {
            Array.prototype.forEach.call(arguments, function (value) {
                var index = values.indexOf(value);
                if (index >= 0) values.splice(index, 1);
            });
        },
        contains: function (value) { return values.indexOf(value) >= 0; },
        values: function () { return values.slice(); }
    };
}

function createElement(initialClasses) {
    var attributes = Object.create(null);
    return {
        classList: createClassList(initialClasses),
        setAttribute: function (name, value) { attributes[name] = String(value); },
        removeAttribute: function (name) { delete attributes[name]; },
        getAttribute: function (name) { return attributes[name]; },
        querySelector: function () { return null; }
    };
}

var externalPlugin = { key: "external", closeCount: 0, close: function () { this.closeCount += 1; } };
var leftImage = { style: {} };
var leftMenu = createElement(["nav-link", "text-center", "text-white", "active"]);
leftMenu.querySelector = function (selector) {
    return selector === "img.sirk-platform-menu-icon" ? leftImage : null;
};
var ensureMenuCount = 0;
var context = {
    document: {
        getElementById: function (id) { return id === "LeftMenuSirkPlatform-myscripts" ? leftMenu : null; }
    },
    window: {
        MeshPluginCore: { activePlugin: externalPlugin },
        SirkPlatformCore: {
            activePlugin: null,
            ensureMenu: function () { ensureMenuCount += 1; return true; }
        }
    }
};
context.window.window = context.window;
context.window.document = context.document;

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "native", "mesh-plugin-core.js"),
    "utf8"
);
vm.runInNewContext(source, context);

var meshCore = context.window.MeshPluginCore;
var sirkCore = context.window.SirkPlatformCore;

assert.notStrictEqual(meshCore, sirkCore,
    "SIRK must not overwrite another plugin's MeshPluginCore implementation.");
assert.strictEqual(sirkCore.activePlugin, externalPlugin,
    "SIRK must see the plugin already active through the shared MeshPluginCore owner.");

var sirkPlugin = { key: "approvalcenter", closeCount: 0, close: function () { this.closeCount += 1; } };
sirkCore.activePlugin = sirkPlugin;
assert.strictEqual(meshCore.activePlugin, sirkPlugin,
    "Other MeshCentral plugins must see the SIRK module as the active plugin.");

var otherPlugin = { key: "other", closeCount: 0, close: function () { this.closeCount += 1; } };
meshCore.activePlugin = otherPlugin;
assert.strictEqual(sirkCore.activePlugin, otherPlugin,
    "SIRK must immediately see an external plugin that replaced the active owner.");

sirkCore.activePlugin.close(false);
assert.strictEqual(otherPlugin.closeCount, 1,
    "The shared owner must allow SIRK to close an external plugin through the standard lifecycle.");

sirkCore.activePlugin = null;
assert.strictEqual(meshCore.activePlugin, null,
    "Clearing the SIRK owner must clear the shared MeshPluginCore owner.");

var mainMenu = createElement(["nav-link", "active"]);
sirkCore.setPluginMenuActive(mainMenu, leftMenu, true);
assert.strictEqual(mainMenu.classList.contains("fullselect"), true,
    "The active top-menu entry must use MeshCentral's original fullselect class.");
assert.strictEqual(mainMenu.classList.contains("active"), false,
    "SIRK must not replace MeshCentral's original top-menu state with Bootstrap active.");
assert.strictEqual(leftMenu.classList.contains("lbbuttonsel2"), true,
    "The active left-menu entry must use MeshCentral's original lbbuttonsel2 class.");
assert.strictEqual(leftMenu.classList.contains("active"), false,
    "SIRK must not use Bootstrap active for native MeshCentral left-menu entries.");

sirkCore.setPluginMenuActive(mainMenu, leftMenu, false);
assert.strictEqual(mainMenu.classList.contains("fullselect"), false,
    "Closing a SIRK module must clear the original top-menu selection.");
assert.strictEqual(leftMenu.classList.contains("lbbuttonsel2"), false,
    "Closing a SIRK module must clear the original left-menu selection.");

assert.strictEqual(sirkCore.ensureMenu({ leftId: "LeftMenuSirkPlatform-myscripts" }), true,
    "The original menu registration result must be preserved.");
assert.strictEqual(ensureMenuCount, 1,
    "The native menu wrapper must call the original registration exactly once.");
assert.strictEqual(leftImage.style.width, "40px",
    "SIRK menu icons must use the original MyScripts 40px width.");
assert.strictEqual(leftImage.style.height, "40px",
    "SIRK menu icons must use the original MyScripts 40px height.");
assert.strictEqual(leftImage.style.objectFit, "contain",
    "SIRK menu icons must keep their original proportions.");

console.log("Shared owner and original MeshCentral menu contract: OK");

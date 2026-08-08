"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var settings = fs.readFileSync(path.join(root, "public/shared/ui/settings.js"), "utf8");
var runtime = fs.readFileSync(path.join(root, "public/shared/runtime.js"), "utf8");
var shell = fs.readFileSync(path.join(root, "public/shared/module-shell.js"), "utf8");
var core = fs.readFileSync(path.join(root, "public/shared/core.js"), "utf8");
var page = fs.readFileSync(path.join(root, "public/shared/ui/page.js"), "utf8");
var admin = fs.readFileSync(path.join(root, "web/admin/admin.js"), "utf8");

assert.ok(settings.indexOf('set: function (value)') >= 0 && settings.indexOf('runtime.state.bootstrap.ui.iconMode = value') >= 0,
    "SirkIconMode must be the single browser owner updating the current bootstrap mode.");
assert.ok(settings.indexOf('runtime.refreshMenus()') >= 0,
    "A real icon mode change must refresh existing menu entries through the runtime lifecycle.");
assert.ok(runtime.indexOf('runtime.refreshMenus = function ()') >= 0 && runtime.indexOf('notify("refreshMenu")') >= 0,
    "Runtime must fan out exactly one menu refresh without polling or observers.");
assert.ok(shell.indexOf('function refreshMenu()') >= 0 && shell.indexOf('refreshMenu: refreshMenu') >= 0,
    "Each module shell must expose its existing menu registration lifecycle for controlled refresh.");
assert.ok(core.indexOf('document.getElementById(definition.leftId)') >= 0 &&
    core.indexOf('var left = existingLeft || leftAnchor.cloneNode(true);') >= 0 &&
    core.indexOf('(existingLeft || canCreateMenu)') >= 0,
    "ensureMenu must reuse an existing menu node and create a missing node only after native page readiness.");
assert.ok(core.indexOf('left.setAttribute("data-sirk-icon-family", familyName)') >= 0,
    "Refreshed menu entries must expose their effective icon family.");
assert.strictEqual(page.indexOf('installNativeLeftMenuContract'), -1,
    "Deferred SharedPage must not install a second menu presentation owner after first paint.");
assert.ok(admin.indexOf('previousIconMode !== nextIconMode') >= 0 && admin.indexOf('window.SirkIconMode.set(nextIconMode)') >= 0,
    "Admin Save must trigger the browser owner only when the persisted icon mode actually changed.");
assert.strictEqual(runtime.indexOf('setInterval('), -1, "Icon mode synchronization must not poll.");
console.log("Admin icon mode save -> owner -> stable native-ready existing-menu refresh contract: OK");
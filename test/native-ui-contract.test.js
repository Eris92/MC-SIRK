"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var shell = read("public/shared/module-shell.js");
var sharedCore = read("public/shared/core.js");
assert.ok(sharedCore.indexOf("approvalcenter: svgData") >= 0 && sharedCore.indexOf('fill="#7b1fa2"') >= 0,
    "Approval Center must use its original purple clipboard menu icon.");
assert.ok(sharedCore.indexOf('url.searchParams.delete("viewmode")') >= 0,
    "Leaving a SIRK workspace must remove its custom viewmode from the URL.");
assert.ok(sharedCore.indexOf('if (url.hash === "#") url.hash = ""') >= 0,
    "Leaving a SIRK workspace must remove an empty trailing hash.");
var topTabStart = shell.indexOf("function ensureTopTab()");
var topTabEnd = shell.indexOf("function remove()", topTabStart);
var topTab = shell.slice(topTabStart, topTabEnd);
assert.ok(topTabStart >= 0 && topTabEnd > topTabStart, "Commands device-tab registration must exist.");
assert.ok(topTab.indexOf('document.getElementById(pageId)') < 0,
    "Commands top tab must not wait for its own unopened plugin page.");
assert.ok(topTab.indexOf('document.getElementById("MainDevTerminal")') >= 0,
    "Commands top tab must attach beside the native Terminal tab.");

var browserRuntime = read("public/shared/runtime.js");
assert.ok(browserRuntime.indexOf('core.assetUrl("", "shared-ui/') < 0,
    "Browser runtime must not reload shared UI assets already serialized by plugin-main.");
assert.ok(browserRuntime.indexOf('if (view != null && !isCustomView(view)) core.restoreWorkspace();') >= 0,
    "Every transition to a native MeshCentral page must clear the SIRK workspace URL.");

var approvals = read("server/modules/approval-center/index.js");
assert.ok(approvals.indexOf("current.modules.approvals") >= 0,
    "Approval Center must use the shared approval settings store.");
assert.ok(approvals.indexOf("current.modules.approvalcenter.retentionDays") < 0,
    "Approval Center must not persist retention in a disconnected module key.");

var serverRuntime = read("server/core/runtime.js");
["showTab", "showOverview", "allowNoApproval", "existing.levels"].forEach(function (field) {
    assert.ok(serverRuntime.indexOf(field) >= 0,
        "Admin settings must persist the Approval provider option: " + field);
});
assert.ok(serverRuntime.indexOf("userGroups: shared.getUserGroups(parent)") >= 0,
    "Approval settings must receive MeshCentral groups for Level 1-3 selection.");

var adminUi = read("web/admin/admin.js");
["Allow execution without approval", "Level 1 approver groups", "Level 2 approver groups", "Level 3 approver groups", "Show provider tab", "Show provider in Approval overview"].forEach(function (label) {
    assert.ok(adminUi.indexOf(label) >= 0, "Approval settings UI is missing: " + label);
});

var admin = read("admin.js");
assert.ok(admin.indexOf('var action = String(req && req.query && req.query.action || "")') >= 0,
    "Admin POST routing must read the requested action.");

var desktopCommands = read("public/native/desktop-commands.js");
assert.ok(desktopCommands.indexOf('document.getElementById("DeskToolsButton")') >= 0,
    "Desktop Commands must mount beside MeshCentral's native Tools button.");
assert.ok(desktopCommands.indexOf('tools.parentNode.insertBefore(wrapper, tools.nextSibling)') >= 0,
    "Desktop Commands must be inserted immediately after the native Tools button.");
assert.ok(admin.indexOf('"desktop-commands.js": ["public/native/desktop-commands.js"') >= 0,
    "Desktop Commands script must be exposed by the plugin asset router.");

var pluginMain = read("plugin-main.js");
assert.ok(pluginMain.indexOf('["sirk-platform-desktop-commands", "desktop-commands.js"]') >= 0,
    "Desktop Commands must load during native MeshCentral startup.");

console.log("Native UI contracts: OK");

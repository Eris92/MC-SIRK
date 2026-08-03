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
var toolbarIcons = read("public/shared/ui/toolbar-config.js");
var statusIcons = read("public/shared/ui/status-nav.js");
var approvalIcons = read("public/modules/approvals/index.js");
[toolbarIcons, statusIcons, approvalIcons].forEach(function (source) {
    assert.ok(source.indexOf('fill="none"') >= 0 && source.indexOf('stroke="currentColor"') >= 0,
        "Native inline icons must use theme-aware line rendering instead of black browser fills.");
});
assert.ok(browserRuntime.indexOf("stroke='currentColor'") >= 0,
    "Decorated command icons must follow the active MeshCentral theme.");
var directoryTree = read("public/shared/ui/tree.js");
assert.ok(directoryTree.indexOf('function lineIcon(kind)') >= 0 && directoryTree.indexOf('icon: "▣"') < 0,
    "Script-tree fallback icons must be proper SVG artwork rather than solid text blocks.");
var editActions = read("public/shared/ui/script-edit-actions.js");
assert.ok(editActions.indexOf('if (config.canEdit === true && typeof config.onEdit === "function")') >= 0,
    "The edit action must only be rendered for editable file-backed scripts.");
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
var saveAdminStart = serverRuntime.indexOf("function saveAdminSettings");
var saveAdminEnd = serverRuntime.indexOf("function moduleFolders", saveAdminStart);
assert.ok(serverRuntime.slice(saveAdminStart, saveAdminEnd).indexOf("integrations.save") < 0,
    "Module settings saves must not rewrite integrations or the encrypted secret store.");

var adminUi = read("web/admin/admin.js");
["Allow execution without approval", "Level 1 approver groups", "Level 2 approver groups", "Level 3 approver groups", "Show provider tab", "Show provider in Approval overview"].forEach(function (label) {
    assert.ok(adminUi.indexOf(label) >= 0, "Approval settings UI is missing: " + label);
});
assert.ok(adminUi.indexOf("AbortController") >= 0 && adminUi.indexOf("15000") >= 0,
    "Admin saves must time out and restore the Save button instead of hanging indefinitely.");

var admin = read("admin.js");
assert.ok(admin.indexOf("req.query.action") >= 0 && admin.indexOf("req.body.action") >= 0,
    "Admin POST routing must read the requested action from both query and form body.");

var desktopCommands = read("public/native/desktop-commands.js");
var desktopCommandsCss = read("public/native/desktop-commands.css");
var commandsModule = read("public/modules/commands/index.js");
['scripts:', 'network:', 'system:', 'other:'].forEach(function (icon) {
    assert.ok(commandsModule.indexOf(icon) >= 0,
        "My Commands must provide a distinct SVG menu icon for " + icon);
});
assert.ok(commandsModule.indexOf("iconMarkup: ICONS[command.id]") >= 0,
    "My Commands entries must expose their command-specific SVG artwork to the shared tree.");
assert.ok(desktopCommands.indexOf('document.getElementById("deskarea3x")') >= 0,
    "Desktop Commands must mount on the native desktop stage.");
assert.ok(desktopCommands.indexOf('window.SirkPlatformCore.api("mycommands", "scripts")') >= 0,
    "Desktop Commands must load the complete command and script tree.");
assert.ok(desktopCommands.indexOf("sirk-quick-command-browser") >= 0 && desktopCommands.indexOf("variableForm") >= 0,
    "Desktop Commands must retain the historical category browser and variable form.");
assert.ok(desktopCommandsCss.indexOf("body.night .sirk-desktop-commands") >= 0,
    "Desktop Commands must follow MeshCentral's native night-mode class.");
assert.ok(desktopCommandsCss.indexOf("var(--sdc-panel)") >= 0 && desktopCommandsCss.indexOf("var(--sdc-text)") >= 0,
    "Desktop Commands surfaces must use theme variables instead of fixed colors.");
assert.ok(admin.indexOf('"desktop-commands.js": ["public/native/desktop-commands.js"') >= 0,
    "Desktop Commands script must be exposed by the plugin asset router.");

var pluginMain = read("plugin-main.js");
assert.ok(pluginMain.indexOf('["sirk-platform-desktop-commands", "desktop-commands.js"]') >= 0,
    "Desktop Commands must load during native MeshCentral startup.");

console.log("Native UI contracts: OK");

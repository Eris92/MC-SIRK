"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8").replace(/\r\n/g, "\n"); }

var core = read("public/shared/core.js");
var shell = read("public/shared/module-shell.js");
var runtime = read("public/shared/runtime.js");
var toolbar = read("public/shared/ui/toolbar-config.js");
var status = read("public/shared/ui/status-nav.js");
var tree = read("public/shared/ui/tree.js");
var scriptTools = read("public/shared/ui/script-tools.js");
var approvalsUi = read("public/modules/approvals/index.js");
var commandsUi = read("public/modules/commands/index.js");
var desktop = read("public/native/desktop-commands.js");
var desktopCss = read("public/native/desktop-commands.css");
var sharedCss = read("public/shared/ui/shared-ui.css");
var approvalsServer = read("server/modules/approval-center/index.js");
var commandsServer = read("server/modules/commands/index.js");
var loggedOnUserPolicy = read("server/core/logged-on-user-command-policy.js");
var serverRuntime = read("server/core/runtime.js");
var adminRouter = read("admin.js");
var adminJs = read("web/admin/admin.js");
var adminCss = read("web/admin/admin.css");
var pluginMain = read("plugin-main.js");

assert.ok(core.indexOf('url.searchParams.delete("viewmode")') >= 0 && core.indexOf('if (url.hash === "#") url.hash = ""') >= 0,
    "Leaving a SIRK workspace must clean its custom URL state.");
assert.ok(shell.indexOf('if (!core.workspaceState && typeof window.go === "function") window.go(1)') >= 0,
    "Native Devices may be entered before the first SIRK workspace, but not between SIRK workspaces.");
assert.ok(shell.indexOf("core.activePlugin && core.activePlugin !== moduleInstance") >= 0 &&
    shell.indexOf("core.activePlugin = moduleInstance") >= 0,
    "SIRK workspaces must have one active owner.");
assert.ok(shell.indexOf("state.renderSequence") >= 0 && shell.indexOf("replaceChildren(realSecondary, nextSecondary)") >= 0,
    "Workspace renders must commit atomically and discard stale renders.");

var topTabStart = shell.indexOf("function ensureTopTab()");
var topTabEnd = shell.indexOf("function remove()", topTabStart);
var topTab = shell.slice(topTabStart, topTabEnd);
assert.ok(topTabStart >= 0 && topTabEnd > topTabStart, "Commands device-tab registration must exist.");
assert.ok(topTab.indexOf('document.getElementById("MainDevTerminal")') >= 0,
    "Commands must attach beside the native Terminal tab.");
assert.ok(topTab.indexOf('document.getElementById(pageId)') < 0,
    "Commands tab registration must not depend on an already opened plugin page.");

[toolbar, status, approvalsUi].forEach(function (source) {
    assert.ok(source.indexOf('fill="none"') >= 0 && source.indexOf('stroke="currentColor"') >= 0,
        "Inline UI icons must follow the active MeshCentral theme.");
});
assert.ok(tree.indexOf("function lineIcon(kind)") >= 0 && tree.indexOf('icon: "▣"') < 0,
    "Tree fallback icons must use SVG artwork rather than solid text glyphs.");
assert.ok(scriptTools.indexOf("if (state.editMode) {") >= 0 &&
    scriptTools.indexOf('key: "credentials"') > scriptTools.indexOf("if (state.editMode) {") &&
    scriptTools.indexOf('key: "edit"') > scriptTools.indexOf("if (state.editMode) {"),
    "Credential and edit row actions must remain inside Edit mode.");
assert.ok(scriptTools.indexOf('if (config.canEdit === true) actions.push({ key: "edit"') >= 0,
    "Edit actions must require edit capability.");
assert.strictEqual(pluginMain.indexOf("script-edit-actions.js"), -1,
    "Startup must not reload the removed script-edit compatibility layer.");
assert.ok(runtime.indexOf('core.assetUrl("", "shared-ui/') < 0,
    "Browser runtime must not reload shared UI assets serialized by plugin-main.");
assert.ok(runtime.indexOf('!(Number(view) === 1 && core.workspaceState)') >= 0 &&
    runtime.indexOf('core.activateMenu(core.workspaceState.viewMode)') >= 0,
    "Native p1 redraws must preserve an active SIRK workspace and menu selection.");

assert.ok(approvalsServer.indexOf("current.modules.approvals") >= 0 &&
    approvalsServer.indexOf("current.modules.approvalcenter.retentionDays") < 0,
    "Approval Center must use the shared approval settings store only.");
["showTab", "showOverview", "allowNoApproval", "existing.levels"].forEach(function (field) {
    assert.ok(serverRuntime.indexOf(field) >= 0, "Approval settings must persist: " + field);
});
assert.ok(serverRuntime.indexOf("userGroups: shared.getUserGroups(parent)") >= 0,
    "Approval settings must receive MeshCentral groups for levels 1-3.");
var saveAdminStart = serverRuntime.indexOf("function saveAdminSettings");
var saveAdminEnd = serverRuntime.indexOf("function moduleFolders", saveAdminStart);
assert.ok(serverRuntime.slice(saveAdminStart, saveAdminEnd).indexOf("integrations.save") < 0,
    "Module settings saves must not rewrite integrations or encrypted secrets.");

["Allow execution without approval", "Level 1 approver groups", "Level 2 approver groups", "Level 3 approver groups", "Show provider tab", "Show provider in Approval overview"].forEach(function (label) {
    assert.ok(adminJs.indexOf(label) >= 0, "Approval settings UI is missing: " + label);
});
assert.ok(adminJs.indexOf("AbortController") >= 0 && adminJs.indexOf("15000") >= 0,
    "Admin saves must have a bounded timeout.");
assert.ok(adminJs.indexOf('var theme = hostIsDark() ? "dark" : "light"') >= 0 &&
    adminJs.indexOf('typeof hostWindow.nightMode === "boolean"') >= 0 &&
    adminJs.indexOf('hostWindow = window.parent') >= 0,
    "Administration must derive its live state from the parent MeshCentral host theme.");
assert.ok(adminCss.indexOf("background:transparent!important") >= 0,
    "Administration must expose the host surface instead of painting a private theme.");
assert.strictEqual(adminCss.indexOf("--sirk-admin"), -1,
    "Administration CSS must not own a private color palette.");
assert.ok(adminRouter.indexOf("req.query.action") >= 0 && adminRouter.indexOf("req.body.action") >= 0,
    "Admin POST routing must accept the action from query or form body.");

["scripts:", "network:", "system:", "other:"].forEach(function (icon) {
    assert.ok(commandsUi.indexOf(icon) >= 0, "My Commands must provide a distinct SVG menu icon for " + icon);
});
assert.ok(commandsUi.indexOf("tonedIcon(ICONS[command.id] || ICONS.mmc, category.key)") >= 0,
    "My Commands entries must expose command-specific theme-aware SVG artwork.");
assert.ok(commandsUi.indexOf("mc-command-run-button") >= 0 &&
    commandsUi.indexOf("show(shell, item, true)") >= 0,
    "Selecting a command must show its details and allow immediate variable-free execution.");
assert.ok(commandsUi.indexOf("command.showWithoutDesktop === true || siteAdmin || tools.state.editMode") >= 0,
    "Site Admin must be able to edit Desktop-only built-in commands while normal users respect availability.");

assert.ok(desktop.indexOf('document.getElementById("deskarea3x")') >= 0 && desktop.indexOf('{ surface: "desktop" }') >= 0,
    "Quick commands must mount on the native Desktop stage and request Desktop-filtered data.");
assert.ok(desktop.indexOf('key: "scripts", label: text("scripts"), iconKind: "scripts", groups: scriptGroups') >= 0 &&
    desktop.indexOf("function scriptGroup") >= 0,
    "Quick commands must preserve the Scripts tree/nested folders while using the distinct Scripts artwork.");
assert.ok(desktop.indexOf("function desktopConnected()") >= 0 && desktop.indexOf("window.desktop.State") >= 0,
    "Quick commands must require an active MeshCentral Desktop session.");
assert.ok(desktop.indexOf("function protectInput(control)") >= 0 && desktop.indexOf("event.stopPropagation()") >= 0,
    "Quick command inputs must not leak keyboard events into the remote Desktop handler.");
assert.ok(desktop.indexOf("function confirmAndSubmit(item, values, trigger, panel)") >= 0 &&
    desktop.indexOf("confirmAndSubmit(value, {}, button, panel)") >= 0 &&
    desktop.indexOf("confirmAndSubmit(value, values, button, panel)") >= 0 &&
    desktop.indexOf("writeDetailsCollapsed(false);") >= 0,
    "Quick must reveal Output only when the confirmation-aware owner actually starts variable-free or parameterized execution.");
assert.ok(desktop.indexOf("waitForExecution(result.id") >= 0 && desktop.indexOf('"output"') >= 0,
    "Quick commands must wait for agent output instead of treating submission as success.");
assert.ok(desktop.indexOf('value.requiresApproval ? text("request")') < 0,
    "Desktop direct scripts must not show Approval UI.");
assert.ok(desktopCss.indexOf("grid-template-columns") >= 0 && desktopCss.indexOf("sirk-desktop-commands-panel") >= 0,
    "Quick CSS may own geometry for the Desktop overlay.");
assert.strictEqual(desktopCss.indexOf("--sdc-panel"), -1,
    "Quick CSS must not reintroduce a private panel palette.");
assert.ok(sharedCss.indexOf("height:calc(100vh - 155px)") >= 0 && sharedCss.indexOf("scrollbar-gutter:stable") >= 0,
    "Long editors must stay inside the viewport with stable scrolling.");
assert.ok(adminRouter.indexOf('"desktop-commands.js": ["public/native/desktop-commands.js"') >= 0,
    "Desktop Commands must be exposed by the asset router.");

assert.ok(commandsServer.indexOf("function executeDirect(user, value)") >= 0 &&
    commandsServer.indexOf("value.desktopDirect === true && value.scriptPath") >= 0,
    "Direct execution bypass must be limited to validated Desktop file-backed scripts.");
assert.strictEqual(commandsServer.indexOf("function interactiveDesktopCommand"), -1,
    "Commands must not duplicate the shared logged-on-user interactive launcher.");
assert.strictEqual(commandsServer.indexOf("function desktopLaunch"), -1,
    "Commands must not own a second desktop-launch parser/lifecycle.");
assert.ok(loggedOnUserPolicy.indexOf("SirkActiveWtsSession") >= 0 &&
    loggedOnUserPolicy.indexOf("Get-Process explorer -IncludeUserName") >= 0,
    "Shared logged-on-user launch must resolve the active WTS/Explorer user session.");
assert.ok(loggedOnUserPolicy.indexOf('New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel " + runLevel') >= 0 &&
    loggedOnUserPolicy.indexOf('var runLevel = command && command.elevatedUserSession === true ? "Highest" : "Limited";') >= 0 &&
    loggedOnUserPolicy.indexOf("wscript.exe") >= 0,
    "GUI runAsUser commands must reuse the canonical console-free interactive user-session owner with bounded trusted elevation.");
assert.ok(commandsServer.indexOf("showOnDesktop") >= 0 && commandsServer.indexOf("showWithoutDesktop") >= 0,
    "Built-in commands must persist separate Desktop and non-Desktop availability.");
assert.ok(commandsServer.indexOf("scriptAvailability") >= 0 && commandsServer.indexOf('surface === "desktop"') >= 0,
    "File-backed scripts must enforce surface-specific availability.");
assert.ok(commandsServer.indexOf("result.approvalLevels = []") >= 0,
    "Built-in commands must execute directly; Approval is reserved for file-backed scripts.");
assert.ok(commandsServer.indexOf("fallbackResultsPath") >= 0 && commandsServer.indexOf("memoryRows") >= 0,
    "Command execution must survive an inaccessible results.json.");

assert.ok(pluginMain.indexOf('String(existing.src || "") !== String(sourceUrl || "")') >= 0 &&
    pluginMain.indexOf('String(existing.href || "") === String(href)') >= 0,
    "Plugin updates must replace stale versioned browser assets.");
assert.ok(pluginMain.indexOf('["sirk-platform-desktop-commands", "desktop-commands.js"]') >= 0,
    "Desktop Commands must load during native MeshCentral startup.");

console.log("Native UI integration contracts: OK");

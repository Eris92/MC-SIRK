"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var shell = read("public/shared/module-shell.js");
var adminCss = read("web/admin/admin.css");
var sharedCore = read("public/shared/core.js");
assert.ok(sharedCore.indexOf("approvalcenter: svgData") >= 0 && sharedCore.indexOf('fill="#7b1fa2"') >= 0,
    "Approval Center must use its original purple clipboard menu icon.");
assert.ok(sharedCore.indexOf('url.searchParams.delete("viewmode")') >= 0,
    "Leaving a SIRK workspace must remove its custom viewmode from the URL.");
assert.ok(sharedCore.indexOf('if (url.hash === "#") url.hash = ""') >= 0,
    "Leaving a SIRK workspace must remove an empty trailing hash.");
assert.ok(sharedCore.indexOf('window.xxcurrentView = Number(viewMode)') >= 0,
    "A SIRK workspace hosted in p1 must use its logical view number so native go(1) redraws the device list on return.");
assert.ok(sharedCore.indexOf('if (!core.workspaceState && typeof window.go === "function"') >= 0,
    "Switching directly between SIRK workspaces must not briefly invoke native go(1) and discard the new custom URL.");
assert.ok(adminCss.indexOf("body.night #sirk-platform-admin") >= 0 && adminCss.indexOf("--sirk-admin-bg: #ffffff") >= 0 && adminCss.indexOf("--sirk-admin-bg: #17191d") >= 0,
    "The administration panel must react live to MeshCentral light and night theme classes.");
assert.ok(adminCss.lastIndexOf("html body #sirk-platform-admin") > adminCss.lastIndexOf("color-scheme: dark;"),
    "Final live-theme rules must follow and override the legacy forced-dark compatibility block.");
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
assert.ok(browserRuntime.indexOf('if (tools.state.editMode === true && hasCredentials && config.canEdit === true') >= 0,
    "The runtime credential-action decorator must never restore credential buttons outside Edit mode.");
var directoryTree = read("public/shared/ui/tree.js");
assert.ok(directoryTree.indexOf('function lineIcon(kind)') >= 0 && directoryTree.indexOf('icon: "▣"') < 0,
    "Script-tree fallback icons must be proper SVG artwork rather than solid text blocks.");
var editActions = read("public/shared/ui/script-edit-actions.js");
assert.ok(editActions.indexOf('if (config.canEdit === true && typeof config.onEdit === "function")') >= 0,
    "The edit action must only be rendered for editable file-backed scripts.");
assert.ok(editActions.indexOf("if (tools.state.editMode)") >= 0,
    "Enhanced script actions must keep credentials and editing controls inside Edit mode.");
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
var sharedUiCss = read("public/shared/ui/shared-ui.css");
var commandsModule = read("public/modules/commands/index.js");
['scripts:', 'network:', 'system:', 'other:'].forEach(function (icon) {
    assert.ok(commandsModule.indexOf(icon) >= 0,
        "My Commands must provide a distinct SVG menu icon for " + icon);
});
assert.ok(commandsModule.indexOf("iconMarkup: ICONS[command.id]") >= 0,
    "My Commands entries must expose their command-specific SVG artwork to the shared tree.");
assert.ok(desktopCommands.indexOf('document.getElementById("deskarea3x")') >= 0,
    "Desktop Commands must mount on the native desktop stage.");
assert.ok(desktopCommands.indexOf('{ surface: "desktop" }') >= 0,
    "Desktop Commands must request the Desktop-filtered command and script tree.");
assert.ok(desktopCommands.indexOf("sirk-quick-command-browser") >= 0 && desktopCommands.indexOf("variableForm") >= 0,
    "Desktop Commands must retain the category browser and render variables in the third column.");
assert.ok(desktopCommands.indexOf('key: "scripts", label: text("scripts"), groups: scriptGroups') >= 0,
    "Desktop Commands must group every file-backed script under the same Scripts entry used by My Commands.");
assert.ok(desktopCommands.indexOf('sirk-quick-command-tree') >= 0 && desktopCommands.indexOf('appendItem(item, depth + 1)') >= 0,
    "Desktop Commands must render folders and their scripts together in the second-column tree.");
assert.ok(desktopCommands.indexOf("function scriptGroup") >= 0 && desktopCommands.indexOf("state.expanded[group.key]") >= 0,
    "Desktop script folders must preserve nested directories and expand like the My Commands tree.");
assert.ok(desktopCommands.indexOf('data.directExecutionAllowed !== true') >= 0 && desktopCommands.indexOf('requiresApproval: false') >= 0,
    "Desktop Commands must expose file-backed scripts as direct actions without Approval UI.");
assert.ok(desktopCommands.indexOf('desktopDirect: true') >= 0 && desktopCommands.indexOf('addIcon(button') >= 0,
    "Desktop Commands must request direct execution and render folder/script icons.");
assert.ok(desktopCommands.indexOf('(data.catalog || []).forEach') >= 0,
    "Desktop Commands must include Network, System and Other alongside Scripts.");
assert.ok(desktopCommands.indexOf('iconKind: command.id') >= 0,
    "Desktop Commands must use command-specific icons matching My Commands.");
assert.ok(desktopCommands.indexOf("sirk-quick-command-run") < 0 && desktopCommands.indexOf('if ((value.variables || []).length)') >= 0 && desktopCommands.indexOf("sirk-quick-command-submit") >= 0,
    "Desktop Commands must execute variable-free items immediately and show Run only for variable input.");
assert.ok(desktopCommands.indexOf('state.detail = value;\n            render(panel);\n            submit(value') >= 0 && desktopCommands.indexOf('if (button) button.disabled = true') >= 0,
    "Selecting a variable-free Quick command must clear the previous details pane before automatic execution.");
assert.ok(desktopCommands.indexOf('sirk-quick-command-details') >= 0 && desktopCommandsCss.indexOf('.sirk-quick-command-details') >= 0,
    "Desktop Commands must reserve the third column for variable fields and their Run action.");
assert.ok(desktopCommands.indexOf('details.appendChild(element("div", "sirk-quick-command-status"))') >= 0 &&
    desktopCommands.indexOf('panel.appendChild(element("div", "sirk-quick-command-status"))') < 0 &&
    desktopCommandsCss.indexOf('.sirk-quick-command-details>.sirk-quick-command-status:not(:empty)') >= 0,
    "Desktop command output must render inside the scrollable third column instead of a full-width footer.");
assert.ok(desktopCommands.indexOf('"▶ " + text("run")') >= 0 && desktopCommandsCss.indexOf('.sirk-quick-command-details .sirk-quick-command-submit') >= 0,
    "The variable Run action must remain visually distinct from transparent tree buttons.");
assert.ok(desktopCommands.indexOf("function desktopConnected()") >= 0 && desktopCommands.indexOf("window.desktop.State") >= 0 && desktopCommands.indexOf("syncAvailability(wrapper)") >= 0,
    "Quick commands must be hidden and blocked unless MeshCentral reports an active Desktop session.");
assert.ok(desktopCommands.indexOf("function protectInput(control)") >= 0 && desktopCommands.indexOf('event.stopPropagation()') >= 0,
    "Quick command inputs must keep keyboard events away from the active remote Desktop handler.");
assert.ok(desktopCommandsCss.indexOf("min-width:84px;min-height:32px") >= 0,
    "The Quick commands Run action must use the compact control size.");
assert.ok(desktopCommands.indexOf('waitForExecution(result.id') >= 0 && desktopCommands.indexOf('"output"') >= 0,
    "Desktop Commands must wait for the agent result instead of reporting submission as execution success.");
assert.ok(desktopCommands.indexOf('value.requiresApproval ? text("request")') < 0,
    "Desktop direct scripts must always display Run and never a Request button.");
assert.ok(desktopCommands.indexOf('key: "script:" + root.path') < 0,
    "Desktop Commands must not duplicate script folders alongside built-in command categories.");
assert.ok(desktopCommandsCss.indexOf("body.night .sirk-desktop-commands") >= 0,
    "Desktop Commands must follow MeshCentral's native night-mode class.");
assert.ok(desktopCommandsCss.indexOf("var(--sdc-panel)") >= 0 && desktopCommandsCss.indexOf("var(--sdc-text)") >= 0,
    "Desktop Commands surfaces must use theme variables instead of fixed colors.");
assert.ok(sharedUiCss.indexOf("height:calc(100vh - 155px)") >= 0 && sharedUiCss.indexOf(".mc-shared-details{scrollbar-gutter:stable}") >= 0,
    "Long script editors must remain inside the viewport and expose a stable vertical scrollbar.");
assert.ok(admin.indexOf('"desktop-commands.js": ["public/native/desktop-commands.js"') >= 0,
    "Desktop Commands script must be exposed by the plugin asset router.");
var commandsServer = read("server/modules/commands/index.js");
assert.ok(commandsServer.indexOf("function executeDirect(user, value)") >= 0 && commandsServer.indexOf("value.desktopDirect === true && value.scriptPath") >= 0,
    "The server must bypass Approval storage only for validated no-approval file-backed scripts.");
assert.ok(commandsServer.indexOf("function interactiveDesktopCommand") >= 0 && commandsServer.indexOf("New-ScheduledTaskPrincipal") >= 0 && commandsServer.indexOf("-LogonType Interactive") >= 0,
    "GUI commands must launch in the logged-on Windows user's interactive desktop session.");
assert.ok(commandsServer.indexOf("Get-Process explorer -IncludeUserName") >= 0 && commandsServer.indexOf("Get-CimInstance Win32_ComputerSystem") >= 0,
    "Interactive command launch must resolve the Explorer session owner before using the WMI fallback.");
assert.ok(commandsServer.indexOf("function desktopLaunch") >= 0 && commandsServer.indexOf("-Execute $env:ComSpec") < 0,
    "Interactive Desktop tools must launch their executable directly without a flashing helper CMD window.");
assert.ok(commandsServer.indexOf('Buffer.from(vbs, "utf8")') >= 0 && commandsServer.indexOf("wscript.exe") >= 0 && commandsServer.indexOf("shell.AppActivate") >= 0,
    "Interactive Desktop tools must use a console-free WScript launcher that activates the requested window.");
assert.ok(commandsServer.indexOf("Get-ScheduledTaskInfo -TaskName $taskName") >= 0 && commandsServer.indexOf("LastRunTime.Year") >= 0,
    "The scheduled Desktop launcher must confirm that the task was started without racing its short-lived Running state.");
assert.ok(commandsServer.indexOf("DeleteFile WScript.ScriptFullName") >= 0,
    "The console-free launcher must clean up its own script only after it has been opened by WScript.");
assert.ok(commandsServer.indexOf("approvalLevels: []") >= 0 && commandsServer.indexOf("directExecutionAllowed: true") >= 0,
    "Desktop file-backed scripts must remain available even when the main Approval provider requires approval.");
assert.ok(commandsServer.indexOf('asset === "command-definition"') >= 0 && commandsServer.indexOf("commandOverrides") >= 0,
    "Built-in My Commands entries must expose a persistent command editor.");
assert.ok(commandsServer.indexOf("showOnDesktop") >= 0 && commandsServer.indexOf("showWithoutDesktop") >= 0 && commandsServer.indexOf('["system", "other"]') >= 0,
    "Built-in commands must persist separate Desktop and without-Desktop availability, with System and Other defaulting to Desktop only.");
assert.ok(commandsServer.indexOf("scriptAvailability") >= 0 && commandsServer.indexOf("decorateScriptTree") >= 0 && commandsServer.indexOf('surface === "desktop"') >= 0,
    "File-backed scripts must persist and enforce separate Desktop and My Commands card availability.");
var scriptDefinitionForm = read("public/shared/ui/script-definition-form.js");
var scriptTools = read("public/shared/ui/script-tools.js");
assert.ok(scriptDefinitionForm.indexOf("showOnDesktop.checked") >= 0 && scriptDefinitionForm.indexOf("showWithoutDesktop.checked") >= 0,
    "The script editor must save both script availability controls.");
assert.ok(scriptTools.indexOf('if (state.editMode) {\n                        actions.push({ key: "favorite"') >= 0 &&
    scriptTools.indexOf('if (config.canEdit === true && script.secretVariables && script.secretVariables.length) actions.push({ key: "credentials"') > scriptTools.indexOf('if (state.editMode) {\n                        actions.push({ key: "favorite"'),
    "Script credential actions must only be created inside script edit mode.");
assert.ok(desktopCommands.indexOf("command.showOnDesktop === true") >= 0,
    "Desktop Quick commands must include only commands enabled for an active Desktop connection.");
assert.ok(commandsModule.indexOf("command.showWithoutDesktop === true || siteAdmin || tools.state.editMode") >= 0 && commandsModule.indexOf("siteAdmin = isAdmin(shell)") >= 0,
    "My Commands must always expose every command to Site Admin while filtering Desktop-only commands for other users.");
assert.ok(commandsModule.indexOf("mc-command-run-button") >= 0 && commandsModule.indexOf('tools.saveTreeState(treeState);\n                show(shell, item, false);') >= 0,
    "Selecting an item in Commands must immediately render its details and Run action without a rejected nested module render.");
assert.ok(commandsServer.indexOf("if (!levels.length && !allowNoApproval())") < 0,
    "Built-in commands must not receive Approval level 1 implicitly.");
assert.ok(commandsServer.indexOf("result.approvalLevels = []") >= 0,
    "Every built-in command must execute directly; Approval is reserved for file-backed scripts.");
assert.ok(commandsServer.indexOf("fallbackResultsPath") >= 0 && commandsServer.indexOf("memoryRows") >= 0,
    "Command execution must survive an inaccessible results.json by using fallback and in-memory storage.");
assert.ok(commandsModule.indexOf('row("Approval", approvals)') < 0,
    "The built-in command editor must not offer Approval settings.");
assert.ok(commandsModule.indexOf("function openCommandEditor") >= 0 && commandsModule.indexOf('canEdit: isAdmin(shell)') >= 0,
    "The edit pencil must be available and functional for built-in commands.");

var pluginMain = read("plugin-main.js");
assert.ok(pluginMain.indexOf('String(existing.src || "") !== String(sourceUrl || "")') >= 0,
    "Plugin updates must replace stale versioned browser scripts already present in the page.");
assert.ok(pluginMain.indexOf('String(existing.href || "") === String(href)') >= 0,
    "Plugin updates must replace stale versioned stylesheets already present in the page.");
assert.ok(pluginMain.indexOf('["sirk-platform-desktop-commands", "desktop-commands.js"]') >= 0,
    "Desktop Commands must load during native MeshCentral startup.");

console.log("Native UI contracts: OK");

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var wizard = fs.readFileSync(path.join(root, "public/modules/automation/jira-protocol-wizard.js"), "utf8");
var dialog = fs.readFileSync(path.join(root, "public/shared/ui/parameter-dialog.js"), "utf8");
var automation = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
var client = fs.readFileSync(path.join(root, "public/modules/automation/index.js"), "utf8");
var css = fs.readFileSync(path.join(root, "public/shared/ui/shared-ui.css"), "utf8");
var seed = fs.readFileSync(path.join(root, "seed/MyScripts/Jira/Jira Asset Protocol.ps1"), "utf8");

assert.ok(wizard.indexOf('{ value: "none", label: "Bez zmian" }') >= 0);
assert.ok(wizard.indexOf('{ value: "receive", label: "Przyjęcie sprzętu" }') >= 0);
assert.ok(wizard.indexOf('{ value: "return", label: "Zdanie sprzętu" }') >= 0);
assert.ok(wizard.indexOf("assetValues.JiraAssetActionsJson = actionValues(controls);") >= 0,
    "Wizard must emit one bounded canonical action map after the shared checklist resolves.");
assert.ok(wizard.indexOf("disabledActions") >= 0,
    "Server-side ownership hints must disable obviously inconsistent actions without becoming the security boundary.");
assert.strictEqual(wizard.indexOf("addEventListener"), -1,
    "Per-row operation controls must not add a new event-handler lifecycle.");
assert.strictEqual(wizard.indexOf("MutationObserver"), -1);
assert.strictEqual(wizard.indexOf("setInterval"), -1);
assert.strictEqual(wizard.indexOf("setTimeout"), -1);
assert.strictEqual(wizard.indexOf("IsTransferProtocol"), -1,
    "Legacy global transfer/return mode must not remain protocol authority in the wizard.");

assert.ok(dialog.indexOf("assetUserDependency") >= 0 && dialog.indexOf("assetRecord.variable && assetRecord.variable.dependsOn") >= 0,
    "Shared parameter dialog must retain its generic explicit dependsOn contract.");
assert.strictEqual(dialog.indexOf("JiraAssetActionsJson"), -1,
    "Jira-specific operation collection must stay in the Jira wizard, not the shared dialog owner.");

assert.ok(css.indexOf(".mc-parameter-checklist-item-actions") >= 0 && css.indexOf(".mc-parameter-checklist-action-select") >= 0,
    "Per-asset operations must reuse the existing shared checklist geometry.");
assert.ok(automation.indexOf('require("../../core/jira-protocol-service.js")') >= 0,
    "Canonical Jira protocol service must remain the only workflow owner.");
assert.strictEqual(automation.indexOf("jira-protocol-v2-service.js"), -1,
    "A parallel Jira protocol workflow is forbidden.");
assert.ok(automation.indexOf("requiresRequesterConfirmation") >= 0 && automation.indexOf("confirmRequester") >= 0);
assert.ok(automation.indexOf("_jiraConfirmation") >= 0,
    "Private mutation state must be stripped by server presentation before browser delivery.");
assert.ok(client.indexOf('"awaiting_confirmation"') >= 0 && client.indexOf("PROTOKÓŁ ZMIAN SPRZĘTU") >= 0);
assert.strictEqual(seed.indexOf("VariableSwitchRequired: $IsTransferProtocol"), -1,
    "Seed metadata must no longer expose the global transfer/return control.");
assert.ok(seed.indexOf('SirkJiraAssetAql: objectType in objectTypeAndChildren("Sprzęt użytkownika")') >= 0,
    "Issue #355 must preserve the dev109 scoped Jira Assets source.");

console.log("Jira per-asset protocol action UI stays in the wizard and preserves shared parameter-dialog ownership: OK");

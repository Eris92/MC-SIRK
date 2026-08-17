"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var wizard = fs.readFileSync(path.join(root, "public/modules/automation/jira-protocol-wizard.js"), "utf8");
var dialog = fs.readFileSync(path.join(root, "public/shared/ui/parameter-dialog.js"), "utf8");
var automation = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
var client = fs.readFileSync(path.join(root, "public/modules/automation/index.js"), "utf8");
var seed = fs.readFileSync(path.join(root, "seed/MyScripts/Jira/Jira Asset Protocol.ps1"), "utf8");

assert.ok(wizard.indexOf('"Sprzęt z magazynu"') >= 0);
assert.ok(wizard.indexOf('"Wybierz sprzęt do przekazania użytkownikowi (opcjonalnie)."') >= 0);
assert.ok(wizard.indexOf('"Sprzęt użytkownika"') >= 0);
assert.ok(wizard.indexOf('"Wybierz sprzęt do zdania przez użytkownika (opcjonalnie)."') >= 0);
assert.ok(wizard.indexOf('label: "Szukaj"') >= 0,
    "Both split equipment steps must reuse the shared native Search input contract.");
assert.ok(wizard.indexOf("preparedAsset.required = false") >= 0 && wizard.indexOf('preparedAsset.control = "assetmulti"') >= 0,
    "Both equipment selectors must be optional multi-select lists.");
assert.ok(wizard.indexOf("splitInventory(optionsValue)") >= 0 && wizard.indexOf("localSearchProvider") >= 0,
    "One prefetched inventory must be split and searched locally without a second Jira option request.");
assert.ok(wizard.indexOf('actions[value] = action') >= 0 && wizard.indexOf('add(value, "receive")') >= 0 && wizard.indexOf('add(value, "return")') >= 0,
    "The split UI must still emit the existing stable-ID receive/return action-map contract.");
assert.ok(wizard.indexOf('add(value, "none")') >= 0,
    "Current user inventory may remain explicit no-change state for protocol reconciliation.");
assert.strictEqual(wizard.indexOf("actionControls"), -1,
    "Do not restore the dev.110 live-DOM per-row operation injection.");
assert.strictEqual(wizard.indexOf("Jira protocol equipment controls are unavailable."), -1,
    "Real-smoke dev.110 failure path must be absent.");
assert.strictEqual(wizard.indexOf("disabledActions"), -1,
    "Split receive/return lists no longer need per-row action disabling hints.");
assert.strictEqual(wizard.indexOf("addEventListener"), -1,
    "The Jira wizard must reuse shared parameter-dialog handlers.");
assert.strictEqual(wizard.indexOf("MutationObserver"), -1);
assert.strictEqual(wizard.indexOf("setInterval"), -1);
assert.strictEqual(wizard.indexOf("setTimeout"), -1);
assert.strictEqual(wizard.indexOf("IsTransferProtocol"), -1,
    "Legacy global transfer/return mode must not return as protocol authority.");

assert.ok(dialog.indexOf("assetUserDependency") >= 0 && dialog.indexOf("assetRecord.variable && assetRecord.variable.dependsOn") >= 0,
    "Shared parameter dialog must retain the generic dependency path reused by local equipment Search.");
assert.strictEqual(dialog.indexOf("JiraAssetActionsJson"), -1,
    "Jira-specific action-map ownership must stay in the Jira wizard, not the shared dialog.");

assert.ok(automation.indexOf('require("../../core/jira-protocol-service.js")') >= 0,
    "Canonical Jira protocol service must remain the only workflow owner.");
assert.strictEqual(automation.indexOf("jira-protocol-v2-service.js"), -1,
    "A parallel Jira protocol workflow is forbidden.");
assert.ok(automation.indexOf("requiresRequesterConfirmation") >= 0 && automation.indexOf("confirmRequester") >= 0);
assert.ok(automation.indexOf("_jiraConfirmation") >= 0,
    "Private mutation state must still be stripped from browser presentation.");
assert.ok(client.indexOf('"awaiting_confirmation"') >= 0 && client.indexOf("PROTOKÓŁ ZMIAN SPRZĘTU") >= 0);
assert.strictEqual(seed.indexOf("VariableSwitchRequired: $IsTransferProtocol"), -1,
    "Seed metadata must not expose a global transfer/return control.");
assert.ok(seed.indexOf('SirkJiraAssetAql: objectType in objectTypeAndChildren("Sprzęt użytkownika")') >= 0,
    "The dev109 scoped Jira Assets source must remain unchanged.");

console.log("Jira protocol uses searchable optional warehouse handover and current-user return steps without live-DOM injection: OK");

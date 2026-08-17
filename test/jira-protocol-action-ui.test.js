"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var dialog = fs.readFileSync(path.join(root, "public/shared/ui/parameter-dialog.js"), "utf8");
var automation = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
var client = fs.readFileSync(path.join(root, "public/modules/automation/index.js"), "utf8");
var css = fs.readFileSync(path.join(root, "public/shared/ui/shared-ui.css"), "utf8");

assert.ok(dialog.indexOf('return [{ value: "none", label: "Bez zmian" }, { value: "receive", label: "Przyjęcie sprzętu" }, { value: "return", label: "Zdanie sprzętu" }]') >= 0,
    "Protocol assetmulti rows must expose exactly the three per-asset operations with no global fallback mode.");
assert.ok(dialog.indexOf('values.JiraAssetActionsJson = JSON.stringify(map);') >= 0,
    "Checked equipment rows must serialize one stable server-bound action map.");
assert.ok(dialog.indexOf('text(variable && variable.name) === "IsTransferProtocol"') >= 0,
    "Legacy global transfer/return switch must be hidden from the Jira protocol wizard without changing generic dialogs.");
assert.ok(dialog.indexOf('record.optionHost.addEventListener("change", onChecklistChanged)') >= 0 &&
    dialog.indexOf('select.addEventListener(') < 0,
    "Per-asset actions must reuse the existing delegated checklist change owner instead of adding one handler per row.");
assert.ok(dialog.indexOf('disabledActions') >= 0,
    "Authoritative server eligibility must disable obviously inconsistent receive/return choices in the UI.");
assert.ok(css.indexOf(".mc-parameter-checklist-item-actions") >= 0 && css.indexOf(".mc-parameter-checklist-action-select") >= 0,
    "Shared checklist geometry must own the per-asset action column.");
assert.ok(automation.indexOf('jira-protocol-v2-service.js') >= 0 && automation.indexOf("requiresRequesterConfirmation") >= 0 && automation.indexOf("confirmRequester") >= 0,
    "My Scripts provider must route protocol preparation/finalization through the shared requester confirmation lifecycle.");
assert.ok(automation.indexOf("_jiraConfirmation") >= 0,
    "Private Jira mutation snapshot must be stripped by provider presentation before any browser response.");
assert.ok(client.indexOf('"awaiting_confirmation"') >= 0,
    "My Scripts protocol polling must recognize awaiting_confirmation as a prepared terminal UI state.");

console.log("Jira per-asset action UI uses one shared checklist owner and no legacy global mode: OK");

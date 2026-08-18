"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var libraryFactory = require("../server/core/script-confirmation-library.js");

var root = path.resolve(__dirname, "..");
var scriptsRoot = path.join(root, "seed", "MyScripts");
var library = libraryFactory.createScriptLibrary({
    fs: fs,
    path: path,
    root: scriptsRoot,
    readOnly: true,
    allowWrite: false
});
var automationSource = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
var approvalSource = fs.readFileSync(path.join(root, "public/modules/approvals/index.js"), "utf8");

[
    "SMS/Send SMS.ps1",
    "SMS/Send Voice SMS.ps1",
    "Mail/Send Relay Mail.ps1"
].forEach(function (scriptPath) {
    var script = library.getScript(scriptPath, false);
    assert.ok(script, "Built-in message workflow must exist: " + scriptPath);
    assert.deepStrictEqual(script.approvalLevels, [], "Built-in message workflow must default to no pre-approval: " + scriptPath);
    assert.strictEqual(script.requiresApproval, false, "Built-in message workflow must render with no default approval level: " + scriptPath);
});

var unrelated = library.getScript("Active Directory/Reset user password and SMS.ps1", false);
assert.ok(unrelated && unrelated.requiresApproval === true,
    "Removing message-workflow defaults must not disable approval on unrelated protected scripts.");

assert.ok(automationSource.indexOf("function defaultDirectWorkflow(script)") >= 0,
    "Automation must own the narrow direct-message workflow exception.");
assert.ok(automationSource.indexOf('workflow(script, "RelayMailSend")') >= 0 &&
    automationSource.indexOf('workflow(script, "SmsSend")') >= 0 &&
    automationSource.indexOf('workflow(script, "VmsSend")') >= 0,
    "Direct defaults must be keyed by stable trusted workflow identities.");
assert.ok(automationSource.indexOf("!levels.length && !defaultDirectWorkflow(requestedScript) && !allowNoApproval()") >= 0,
    "Ordinary empty-level My Scripts must retain the provider Level 1 fallback while message workflows bypass it.");

var optimisticIndex = approvalSource.indexOf("request.status = definition.optimisticStatus");
var localRenderIndex = approvalSource.indexOf("renderCurrentRequests(shell);", optimisticIndex);
var postIndex = approvalSource.indexOf("return shell.post(definition.asset", localRenderIndex);
assert.ok(optimisticIndex >= 0 && localRenderIndex > optimisticIndex && postIndex > localRenderIndex,
    "Requester confirmation must leave awaiting_confirmation locally before waiting for the finalization POST.");
assert.ok(approvalSource.indexOf('optimisticStatus: "confirming"') >= 0,
    "Confirm must use the existing confirming lifecycle state.");
assert.ok(approvalSource.indexOf('request.status === "pending" || request.status === "awaiting_confirmation"') >= 0,
    "Optimistic actionable rendering must exclude confirming requests without changing backend status ownership.");

assert.ok(approvalSource.indexOf("request.result && request.result.data") >= 0 &&
    approvalSource.indexOf("Array.isArray(data.assets)") >= 0 &&
    approvalSource.indexOf("Array.isArray(data.finalAssets)") >= 0,
    "Jira confirmation context must reuse the already prepared public protocol result instead of another Jira request.");
assert.ok(approvalSource.indexOf('"User: " + context.user') >= 0 &&
    approvalSource.indexOf('"Assets: " + context.assets.join') >= 0,
    "Approval cards must show Jira User and Assets context.");
assert.ok(approvalSource.indexOf("contextSummary ? contextSummary +") >= 0,
    "The native requester confirmation dialog must include the same Jira User and Assets context.");
assert.strictEqual((approvalSource.match(/shell\.api\(/g) || []).length, 2,
    "Approval context rendering must not add a Jira or per-card request loop.");

console.log("Direct message defaults, immediate confirmation transition and Jira approval context: OK");

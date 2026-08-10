"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
function source(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var approval = source("server/core/approval-service.js");
var executor = source("server/core/server-script-executor.js");
var automation = source("server/modules/automation/index.js");
var frontend = source("public/modules/automation/index.js");
var dialog = source("public/shared/ui/parameter-dialog.js");
var results = source("public/shared/ui/results.js");
var admin = source("admin.js");
var seed = source("seed/MyScripts/Jira/Jira Asset Protocol.ps1");

assert.ok(approval.indexOf("submitOptions && submitOptions.deferExecution === true") >= 0 && approval.indexOf("execute: execute") >= 0,
    "Approval must expose opt-in deferred execution while preserving the default synchronous path.");
assert.ok(executor.indexOf("executionOptions.environment || {}") >= 0,
    "The server script executor must accept caller-owned non-secret environment enrichment without changing variableValues.");
assert.ok(automation.indexOf("jiraAssetsFactory.createJiraAssetsService") >= 0 &&
    automation.indexOf('asset === "variable-options"') >= 0 && automation.indexOf('asset === "progress"') >= 0,
    "My Scripts backend must own Jira dynamic options and real progress endpoints.");
assert.ok(automation.indexOf("jiraAssets.executeProtocol") >= 0 && automation.indexOf("context.approval.execute(request.id)") >= 0,
    "Jira protocol must use the existing approval request identity and deferred execution state machine.");
assert.ok(automation.indexOf("requireScriptAccess(user, artifact.meta && artifact.meta.scriptPath)") >= 0,
    "Artifact download must re-check My Scripts folder access instead of trusting artifact ID possession.");
assert.ok(admin.indexOf('asset === "folder-icon" || asset === "artifact"') >= 0,
    "The canonical admin router must route typed My Scripts artifacts through the module owner.");
assert.ok(frontend.indexOf("setParameterOptionProvider") >= 0 && frontend.indexOf('asset === "progress"') < 0,
    "My Scripts must register one shared dynamic option provider and must not hardcode backend asset names incorrectly.");
assert.ok(frontend.indexOf('shell.api("progress", { id: request.id })') >= 0 &&
    frontend.indexOf("attempt >= 900") >= 0 && frontend.indexOf("setTimeout(function () { pollProtocol") >= 0,
    "Protocol progress polling must be real-state driven and explicitly bounded.");
assert.ok(frontend.indexOf("openedArtifacts = new Set()") >= 0 && frontend.indexOf("openedArtifacts.has(artifact.id)") >= 0,
    "Automatic protocol artifact opening must occur at most once per completed run.");
assert.ok(results.indexOf("SIRK_ARTIFACT:") >= 0 && results.indexOf("Open PDF") >= 0,
    "Shared Results must expose typed artifact Open/Download actions without filesystem paths.");
assert.ok(dialog.indexOf("SirkAllowCustom") >= 0 && dialog.indexOf("datalist") >= 0,
    "Shared user input must support explicit script-declared custom values without a Jira-only dialog fork.");
assert.ok(seed.indexOf("SirkWorkflow: JiraAssetProtocol") >= 0 && seed.indexOf("VariableUserRequired: JiraUser") >= 0 &&
    seed.indexOf("VariableAssetRequired: PcName") >= 0 && seed.indexOf("SirkAllowCustom: ItPerson") >= 0,
    "The seed workflow must declare user -> asset dependency, transfer switch and custom-capable IT person through existing script metadata.");
assert.strictEqual(seed.indexOf("$env:JIRA_TOKEN"), -1,
    "The protocol script must consume normalized server-side data and never receive the Jira API token.");
assert.strictEqual(frontend.indexOf("Write-Progress"), -1);
assert.strictEqual(frontend.indexOf("MutationObserver"), -1);

console.log("Jira Asset Protocol backend/provider/progress/artifact/shared-dialog contract: OK");

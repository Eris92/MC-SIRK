"use strict";

// Mixed mode (SirkServerStage): a My Commands script names an internal My Scripts
// script that runs on the MeshCentral server first; its single output file is
// injected into the agent script as $SirkStageFileName / $SirkStageFileBase64.

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.resolve(__dirname, "..");
var temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-stage-"));

// Source contracts: commands wiring, automation guard, injected names.
var commands = fs.readFileSync(path.join(root, "server/modules/commands/index.js"), "utf8");
assert.ok(commands.indexOf("/^SirkServerStage\\s*:\\s*(.+)$/i") >= 0, "commands read the SirkServerStage header");
assert.ok(commands.indexOf("SirkStageFileName: result.stageFile.fileName, SirkStageFileBase64: result.stageFile.base64") >= 0, "stage file is injected into the agent script");
assert.ok(commands.indexOf("command = buildCommand(payload, stageValues);") >= 0, "agent command is rebuilt with stage values after the node is authorized");
assert.ok(commands.indexOf("var stagePath = serverStagePath(payload);") < commands.indexOf("resolveNode(user, payload.nodeId, { requireCommandRights: true })"), "node rights are checked before the stage runs");
var automation = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
assert.ok(automation.indexOf("if (!internalScriptPath(script.path))") >= 0, "only internal (_) My Scripts can be a stage");
assert.ok(automation.indexOf("/^SirkStageFor\\s*:\\s*MyCommands\\s*$/i") >= 0, "stage script must opt in");
assert.ok(automation.indexOf("stageFile: true") >= 0 && automation.indexOf("skipSystemEnvironment: true") >= 0, "stage gets only the caller-provided environment");

if (process.platform === "win32") {
    fs.rmSync(temporary, { recursive: true, force: true });
    console.log("Server stage contracts: OK (executor double skipped on Windows)");
    return;
}

var libraryFactory = require(path.join(root, "server/core/script-confirmation-library.js"));
var artifactFactory = require(path.join(root, "server/core/artifact-service.js"));
var executorFactory = require(path.join(root, "server/core/server-script-executor.js"));
var library = libraryFactory.createScriptLibrary({ fs: fs, path: path, root: path.join(root, "seed", "MyScripts"), readOnly: true, allowWrite: false });
var store = artifactFactory.createArtifactService({ fs: fs, path: path, dataRoot: temporary });
var script = library.getScript("CA/_Sign RDP file.ps1", true);
assert.ok(script, "server stage script is loaded");
assert.ok((script.extraHeaders || []).indexOf("SirkStageFor: MyCommands") >= 0);

var trace = path.join(temporary, "trace.txt");
process.env.SIRK_PLATFORM_POWERSHELL = path.join(root, "test", "fixtures", "stage", "fake-powershell.sh");
process.env.SIRK_FAKE_TRACE = trace;
var context = {
    fs: fs, path: path, nativePath: path, dataRoot: temporary, pluginRoot: root,
    settings: { read: function () { return { modules: { myscripts: { runTimeoutSeconds: 30 } } }; } },
    integrations: { get: function () { return {}; }, configured: function () { return {}; } },
    secrets: { get: function () { return {}; } }
};
var executor = executorFactory.createServerScriptExecutor({ context: context, library: library, artifacts: store, admin: { systemProfiles: function () { return []; }, secretValues: function () { return {}; } } });
var environment = { SIRK_STAGE_VARIABLES_JSON: "{\"TargetHost\":\"pc01\"}", SIRK_STAGE_NODE_JSON: "{\"name\":\"PC01\"}", MYSCRIPTS_CA_TEMPLATE: "RDP Signing" };
function run(mode) {
    process.env.SIRK_FAKE_MODE = mode;
    return executor.execute({ scriptPath: script.path, scriptHash: script.hash, variableValues: {} }, { id: "", requester: {} }, { skipSystemEnvironment: true, stageFile: true, environment: environment });
}
function workspaces() { return fs.readdirSync(store.root).filter(function (name) { return /^work-/.test(name); }); }

run("one").then(function (result) {
    assert.strictEqual(result.stageFile.fileName, "pc01.rdp");
    assert.strictEqual(Buffer.from(result.stageFile.base64, "base64").toString("utf8"), "full address:s:pc01\r\nsignature:s:AAAA\r\n");
    assert.ok(!result.artifacts, "stage files are not offered as downloads");
    assert.strictEqual(fs.readFileSync(trace, "utf8"), environment.SIRK_STAGE_VARIABLES_JSON + "|" + environment.SIRK_STAGE_NODE_JSON + "|RDP Signing", "values arrive as environment data");
    assert.deepStrictEqual(workspaces(), [], "workspace removed");
    var errors = [];
    return ["none", "two", "big", "fail"].reduce(function (chain, mode) {
        return chain.then(function () {
            return run(mode).then(function () { assert.fail(mode + " must fail"); }, function (error) { errors.push(mode + ":" + error.message); });
        });
    }, Promise.resolve()).then(function () { return errors; });
}).then(function (errors) {
    assert.match(errors[0], /exactly one file \(found 0\)/);
    assert.match(errors[1], /exactly one file \(found 2\)/);
    assert.match(errors[2], /256 KB/);
    assert.match(errors[3], /No valid certificate/);
    assert.deepStrictEqual(workspaces(), [], "workspaces removed after failures");
    fs.rmSync(temporary, { recursive: true, force: true });
    console.log("Server stage (mixed mode): executor stage file and contracts: OK");
}).catch(function (error) {
    console.error(error);
    process.exit(1);
});

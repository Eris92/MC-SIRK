"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var protocolFactory = require(path.join(root, "server/core/jira-protocol-service.js"));
var artifactFactory = require(path.join(root, "server/core/artifact-service.js"));
var pdfRenderer = require(path.join(root, "server/core/pdf-text-renderer.js"));
var serverSource = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
var executorSource = fs.readFileSync(path.join(root, "server/core/server-script-executor.js"), "utf8");
var clientSource = fs.readFileSync(path.join(root, "public/modules/automation/index.js"), "utf8");
var dialogSource = fs.readFileSync(path.join(root, "public/shared/ui/parameter-dialog.js"), "utf8");
var seedSource = fs.readFileSync(path.join(root, "seed/MyScripts/Jira/Jira Asset Protocol.ps1"), "utf8");

function jiraUser(value, name, email) {
    return { value: value, accountId: value, displayName: name, emailAddress: email, label: name };
}

function jiraAsset(value, model, serial, inventory) {
    return {
        value: value,
        hostname: value,
        objectId: "100-" + value,
        objectKey: "IT-" + value,
        model: model,
        serialNumber: serial,
        inventoryNumber: inventory,
        label: value + " — " + model
    };
}

(async function () {
    var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-protocol-"));
    try {
        assert.deepStrictEqual(pdfRenderer.unsupportedCharacters("Zażółć gęślą jaźń"), [],
            "Dependency-free PDF renderer must explicitly support Polish diacritics used by the protocol.");
        var directPdf = pdfRenderer.renderTextPdf("PROTOKÓŁ\nZażółć gęślą jaźń");
        assert.ok(Buffer.isBuffer(directPdf) && directPdf.slice(0, 8).toString("ascii").indexOf("%PDF-1.") === 0,
            "Protocol renderer must emit actual PDF bytes, not HTML/print markup.");

        var executorCalls = [];
        var service = protocolFactory.createJiraProtocolService({
            context: { fs: fs, path: path, nativePath: path, dataRoot: temp },
            jiraAssets: {
                listUsers: function () {
                    return Promise.resolve({ items: [jiraUser("acc-1", "Łukasz Żółć", "lukasz@example.invalid")] });
                },
                listAssets: function (userValue) {
                    assert.strictEqual(userValue, "acc-1", "Execution must resolve assets for the authoritative selected Jira identity.");
                    return Promise.resolve({ items: [
                        jiraAsset("PC-01", "ThinkPad T14", "SN-01", "INV-01"),
                        jiraAsset("PC-02", "EliteBook 840", "SN-02", "INV-02")
                    ] });
                }
            },
            executor: {
                execute: function (payload, request, executionOptions) {
                    executorCalls.push({ payload: payload, request: request, options: executionOptions });
                    return Promise.resolve({
                        data: {
                            protocol: true,
                            message: "Gotowe",
                            text: "PROTOKÓŁ PRZEKAZANIA SPRZĘTU\nUżytkownik: Łukasz Żółć\nOsoba IT: Żaneta Ślusarz\nZażółć gęślą jaźń",
                            html: "<html><body>escaped</body></html>",
                            data: { mode: "transfer" }
                        },
                        exitCode: 0
                    });
                }
            }
        });

        var script = {
            path: "Jira/Jira Asset Protocol.ps1",
            label: "Jira Asset Protocol",
            extraHeaders: ["SirkWorkflow: JiraAssetProtocol", "SirkAllowCustom: ItPerson"]
        };
        var request = { id: "Req_123456", requester: { id: "user/1", name: "Operator" } };
        var payload = {
            scriptPath: script.path,
            variableValues: {
                JiraUser: "acc-1",
                PcName: "PC-01;PC-02",
                IsTransferProtocol: true,
                ItPerson: "Żaneta Ślusarz"
            }
        };
        var result = await service.execute(script, payload, request);
        assert.strictEqual(result.artifacts.length, 1);
        assert.strictEqual(result.artifacts[0].type, "pdf");
        assert.strictEqual(result.artifacts[0].autoOpen, true);
        assert.strictEqual(Object.prototype.hasOwnProperty.call(result.artifacts[0], "path"), false,
            "Public protocol result must never expose filesystem paths.");
        assert.strictEqual(service.progress(request.id, "completed").percent, 100);
        assert.strictEqual(service.progress(request.id, "completed").stage, "Ready");
        assert.strictEqual(executorCalls.length, 1);
        assert.strictEqual(executorCalls[0].options.skipSystemEnvironment, true,
            "Protocol renderer must not receive the assigned Jira token/system integration environment.");
        assert.strictEqual(executorCalls[0].options.environment.SIRK_PROTOCOL_MODE, "transfer");
        assert.strictEqual(executorCalls[0].options.environment.SIRK_PROTOCOL_IT_NAME, "Żaneta Ślusarz",
            "Custom IT person input must remain a bounded normalized text value.");
        assert.strictEqual(JSON.parse(executorCalls[0].options.environment.SIRK_PROTOCOL_ASSETS_JSON).length, 2,
            "Multiple selected hostnames must be normalized in one bounded authoritative asset lookup.");

        var artifacts = artifactFactory.createArtifactService({ fs: fs, path: path, dataRoot: temp });
        var resolved = artifacts.resolve(request.id, result.artifacts[0].id);
        assert.strictEqual(resolved.contentType, "application/pdf");
        assert.strictEqual(fs.readFileSync(resolved.path).slice(0, 8).toString("ascii").indexOf("%PDF-1."), 0);

        var badRequest = { id: "ReqBad_123", requester: { id: "user/1", name: "Operator" } };
        await assert.rejects(function () {
            return service.execute(script, {
                scriptPath: script.path,
                variableValues: { JiraUser: "acc-1", PcName: "PC-HIDDEN", IsTransferProtocol: false, ItPerson: "Custom IT" }
            }, badRequest);
        }, /no longer assigned/, "Execution must re-authorize the selected asset against the current Jira user mapping.");
        assert.strictEqual(service.progress(badRequest.id, "failed").state, "failed");
        assert.strictEqual(fs.existsSync(path.join(temp, "artifacts", badRequest.id)), false,
            "A failed/partial run must not leave a ready PDF artifact directory.");

        assert.ok(serverSource.indexOf('asset === "progress"') >= 0 && serverSource.indexOf("jiraProtocol.progress") >= 0,
            "My Scripts backend must expose request-authorized real protocol progress.");
        assert.ok(serverSource.indexOf("Promise.race([startPromise, submission])") >= 0,
            "No-approval protocol execution must return its request ID at the real provider execution boundary instead of waiting for completion.");
        assert.ok(serverSource.indexOf("context.approval.getRequest(user, id)") >= 0,
            "Protocol progress must reuse Approval visibility before returning state.");
        assert.strictEqual(serverSource.indexOf("setInterval"), -1,
            "Protocol backend must not introduce an independent polling/timer loop.");
        assert.ok(executorSource.indexOf("skipSystemEnvironment") >= 0 && executorSource.indexOf("callerEnvironment") >= 0,
            "Shared executor must own bounded caller environment injection.");

        assert.ok(clientSource.indexOf('shell.api("progress"') >= 0 && clientSource.indexOf("attempt >= 900") >= 0,
            "Client progress transport must be bounded and read real backend milestones.");
        assert.ok(clientSource.indexOf("progress.percent") >= 0 || clientSource.indexOf("currentProgress.percent") >= 0,
            "Progressbar value must come from backend state.");
        assert.strictEqual(clientSource.indexOf("setInterval"), -1,
            "Client must not add a permanent progress polling loop.");
        assert.ok(clientSource.indexOf("openedArtifacts = new Set()") >= 0 && clientSource.indexOf("openArtifactOnce") >= 0,
            "Successful protocol PDF must auto-open at most once per live run.");
        assert.ok(clientSource.indexOf("Download PDF") >= 0 && clientSource.indexOf("artifactId") >= 0,
            "Live and historical results must retain manual protected PDF actions.");

        assert.ok(dialogSource.indexOf("SirkAllowCustom") >= 0 && dialogSource.indexOf("datalist") >= 0,
            "Shared parameter dialog must support generic opt-in custom user values without a Jira-only form.");
        assert.ok(seedSource.indexOf("VariableUserRequired: $JiraUser") >= 0 &&
            seedSource.indexOf("VariableAssetRequired: $PcName") >= 0 &&
            seedSource.indexOf("VariableSwitchRequired: $IsTransferProtocol") >= 0 &&
            seedSource.indexOf("VariableUserRequired: $ItPerson") >= 0,
            "Canonical seed workflow must preserve the legacy four-input contract.");
        assert.ok(seedSource.indexOf("SirkWorkflow: JiraAssetProtocol") >= 0 && seedSource.indexOf("SirkAllowCustom: ItPerson") >= 0);
        assert.strictEqual(seedSource.indexOf("MYSCRIPTS_JIRA_TOKEN"), -1,
            "Canonical protocol renderer must not consume or print the Jira token.");
        assert.strictEqual(seedSource.indexOf("DirectoryTools"), -1,
            "Canonical protocol workflow must not depend on legacy DirectoryTools paths/settings.");

        console.log("Jira Asset Protocol lifecycle, authoritative asset recheck, real progress and protected PDF contract: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

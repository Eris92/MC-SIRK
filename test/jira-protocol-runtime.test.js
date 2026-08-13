"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var protocolFactory = require(path.join(root, "server/core/jira-protocol-service.js"));
var artifactFactory = require(path.join(root, "server/core/artifact-service.js"));
var documentRenderer = require(path.join(root, "server/core/document-template-renderer.js"));
var pdfRenderer = require(path.join(root, "server/core/pdf-text-renderer.js"));
var pdfRendererSource = fs.readFileSync(path.join(root, "server/core/pdf-text-renderer.js"), "utf8");
var serverSource = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
var executorSource = fs.readFileSync(path.join(root, "server/core/server-script-executor.js"), "utf8");
var clientSource = fs.readFileSync(path.join(root, "public/modules/automation/index.js"), "utf8");
var dialogSource = fs.readFileSync(path.join(root, "public/shared/ui/parameter-dialog.js"), "utf8");
var seedSource = fs.readFileSync(path.join(root, "seed/MyScripts/Jira/Jira Asset Protocol.ps1"), "utf8");
var sharedTemplateSource = fs.readFileSync(path.join(root, "server/templates/document-a4.html"), "utf8");

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
        assert.ok(pdfRendererSource.indexOf("var LINE_HEIGHT = 18;") >= 0,
            "Bitmap PDF line spacing must include Polish marks above and below the base glyph.");

        var executorCalls = [];
        var authoritativeVariable = null;
        var service = protocolFactory.createJiraProtocolService({
            context: { fs: fs, path: path, nativePath: path, dataRoot: temp },
            jiraAssets: {
                listUsers: function () {
                    return Promise.resolve({ items: [jiraUser("acc-1", "Łukasz Żółć", "lukasz@example.invalid")] });
                },
                listAssets: function (userValue, variable) {
                    assert.strictEqual(userValue, "acc-1", "Execution must resolve assets for the authoritative selected Jira identity.");
                    authoritativeVariable = variable;
                    return Promise.resolve({ items: [
                        jiraAsset("PC-01", "ThinkPad T14", "SN-01", "INV-01"),
                        jiraAsset("PC-02", "EliteBook 840", "SN-02", "INV-02")
                    ] });
                }
            },
            renderHtmlPdf: function (html, renderOptions) {
                assert.ok(html.indexOf("<html") >= 0, "Styled HTML must be the authoritative PDF input.");
                assert.strictEqual(renderOptions.logoPath, path.join(temp, "branding", "protocol-logo.png"),
                    "PDF rendering must use the persistent shared protocol logo.");
                assert.ok(html.indexOf("Łukasz Żółć") >= 0 && html.indexOf("ThinkPad T14") >= 0,
                    "Shared document template must render protocol data returned by PowerShell.");
                assert.ok(html.indexOf("Protokół zdawczo-odbiorczy") >= 0 && html.indexOf("odbiór sprzętu przez pracownika") >= 0,
                    "Protocol PDF must preserve the original document title and transfer wording.");
                return Promise.resolve(directPdf);
            },
            executor: {
                execute: function (payload, request, executionOptions) {
                    executorCalls.push({ payload: payload, request: request, options: executionOptions });
                    return Promise.resolve({
                        data: {
                            protocol: true,
                            message: "Gotowe",
                            text: "PROTOKÓŁ PRZEKAZANIA SPRZĘTU\nUżytkownik: Łukasz Żółć\nOsoba IT: Żaneta Ślusarz\nZażółć gęślą jaźń",
                            data: {
                                mode: "transfer",
                                generatedAt: "2026-08-11T10:20:30.000Z",
                                user: { name: "Łukasz Żółć", email: "lukasz@example.invalid" },
                                itPerson: { name: "Żaneta Ślusarz", email: "zaneta@example.invalid" },
                                assets: [
                                    { hostname: "PC-01", manufacturer: "Lenovo", model: "ThinkPad T14", serialNumber: "SN-01", inventoryNumber: "INV-01", assetIdentifier: "IT-PC-01" },
                                    { hostname: "PC-02", manufacturer: "HP", model: "EliteBook 840", serialNumber: "SN-02", inventoryNumber: "INV-02", assetIdentifier: "IT-PC-02" }
                                ]
                            }
                        },
                        exitCode: 0
                    });
                }
            }
        });

        var script = {
            path: "Jira/Jira Asset Protocol.ps1",
            label: "Jira Asset Protocol",
            extraHeaders: ["SirkWorkflow: JiraAssetProtocol", "SirkAllowCustom: ItPerson"],
            variables: [{
                name: "PcName",
                control: "asset",
                jiraAsset: {
                    aql: "objectType = Computer",
                    labelAttribute: "Hostname",
                    maxResults: 1000,
                    userVariable: "JiraUser"
                }
            }]
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
        var equipmentOutput = JSON.parse(result.output);
        assert.strictEqual(equipmentOutput.meshTable, true);
        assert.strictEqual(equipmentOutput.title, "Sprzęt");
        assert.deepStrictEqual(equipmentOutput.columns, ["Hostname", "Producent", "Model", "Numer seryjny", "Numer inwentarzowy", "Asset ID"]);
        assert.strictEqual(equipmentOutput.rows.length, 2);
        assert.strictEqual(equipmentOutput.rows[0].Hostname, "PC-01");
        assert.strictEqual(equipmentOutput.rows[0]["Numer seryjny"], "SN-01");
        assert.strictEqual(Object.prototype.hasOwnProperty.call(equipmentOutput.rows[0], "Użytkownik"), false,
            "Visible protocol output must contain equipment rows only, without protocol people metadata.");
        assert.ok(result.rawOutput.indexOf("PROTOKÓŁ PRZEKAZANIA SPRZĘTU") === 0,
            "Full protocol text must remain available only as raw diagnostic output and PDF fallback input.");
        assert.strictEqual(result.artifacts.length, 1);
        assert.strictEqual(result.artifacts[0].type, "pdf");
        assert.strictEqual(result.artifacts[0].autoOpen, false,
            "Completed protocol PDFs must remain user-opened through explicit Open/Download actions.");
        assert.strictEqual(Object.prototype.hasOwnProperty.call(result.artifacts[0], "path"), false,
            "Public protocol result must never expose filesystem paths.");
        assert.strictEqual(service.progress(request.id, "completed").percent, 100);
        assert.strictEqual(service.progress(request.id, "completed").stage, "Ready");
        assert.strictEqual(authoritativeVariable.jiraAsset.aql, "objectType = Computer",
            "Authoritative execution recheck must reuse the script-owned Jira asset policy.");
        assert.strictEqual(authoritativeVariable.jiraAsset.userVariable, "JiraUser",
            "Authoritative execution recheck must preserve the script-owned Jira user binding.");
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
        assert.strictEqual(clientSource.indexOf("openArtifactOnce"), -1,
            "Successful protocol PDF must never open automatically, including historical artifacts carrying the old autoOpen flag.");
        assert.ok(clientSource.indexOf("Download PDF") >= 0 && clientSource.indexOf("artifactId") >= 0,
            "Live and historical results must retain manual protected PDF actions.");
        assert.ok(clientSource.indexOf('host.querySelector(".mc-results-inline-actions")') >= 0,
            "Protocol PDF actions must reuse the Copy action row instead of rendering below the output.");
        assert.ok(clientSource.indexOf('"PROTOKÓŁ PRZEKAZANIA SPRZĘTU"') >= 0 &&
            clientSource.indexOf("debugValue: heading") >= 0,
            "Protocol results must show the operation heading above actions while preserving full text only in Debug/raw output.");
        assert.ok(clientSource.indexOf("function protocolEquipmentOutput(request)") >= 0 &&
            clientSource.indexOf("heading ? protocolEquipmentOutput(request) : originalOutput") >= 0,
            "Protocol UI must build the equipment table from result.data.assets even when a historical or stale backend output still contains printable protocol text.");
        assert.ok(clientSource.indexOf('meshTable: true') >= 0 &&
            clientSource.indexOf('title: "Sprzęt"') >= 0 &&
            clientSource.indexOf('"Numer seryjny": String(asset.serialNumber || "")') >= 0,
            "Client fallback must preserve the canonical equipment-only table schema.");

        assert.ok(dialogSource.indexOf("SirkAllowCustom") >= 0 && dialogSource.indexOf("datalist") >= 0,
            "Shared parameter dialog must support generic opt-in custom user values without a Jira-only form.");
        assert.ok(seedSource.indexOf("VariableUserRequired: $JiraUser") >= 0 &&
            seedSource.indexOf("VariableAssetRequired: $PcName") >= 0 &&
            seedSource.indexOf("VariableSwitchRequired: $IsTransferProtocol") >= 0 &&
            seedSource.indexOf("VariableUserRequired: $ItPerson") >= 0,
            "Canonical seed workflow must preserve the legacy four-input contract.");
        assert.ok(seedSource.indexOf("SirkWorkflow: JiraAssetProtocol") >= 0);
        assert.strictEqual(seedSource.indexOf("SirkAllowCustom: ItPerson"), -1,
            "IT person must be selected from authoritative MeshCentral users, not a custom Jira-style datalist.");
        assert.ok(seedSource.indexOf('SirkJiraAssetAql: objectType in objectTypeAndChildren("Sprzęt użytkownika")') >= 0 &&
            seedSource.indexOf("SirkJiraAssetLabelAttribute: Nazwa_sieciowa") >= 0 &&
            seedSource.indexOf("SirkJiraAssetUserVariable: JiraUser") >= 0,
            "Canonical Jira protocol must own its Assets query, display attribute and Jira user binding in script metadata.");
        ["USER_ID", "USER_NAME", "USER_EMAIL", "IT_ID", "IT_NAME", "IT_EMAIL"].forEach(function (name) {
            assert.ok(seedSource.indexOf("(Get-ProtocolValue $env:SIRK_PROTOCOL_" + name + ")") >= 0,
                "PowerShell hashtable values must parenthesize protocol helper calls: " + name);
        });
        assert.ok(seedSource.indexOf("$mode = if ($transfer)") >= 0 && seedSource.indexOf("mode = $mode") >= 0,
            "PowerShell result hashtable must reuse a precomputed protocol mode value.");
        assert.ok(seedSource.indexOf("assets = $assetRows.ToArray()") >= 0,
            "Windows PowerShell 5.1 must materialize the generic asset list before nesting it in the result object.");
        assert.strictEqual(seedSource.charCodeAt(0), 0xFEFF,
            "The canonical Polish PowerShell protocol must retain a UTF-8 BOM for Windows PowerShell 5.1.");
        assert.strictEqual(seedSource.indexOf("MYSCRIPTS_JIRA_TOKEN"), -1,
            "Canonical protocol renderer must not consume or print the Jira token.");
        assert.strictEqual(seedSource.indexOf("DirectoryTools"), -1,
            "Canonical protocol workflow must not depend on legacy DirectoryTools paths/settings.");
        assert.strictEqual(seedSource.indexOf("<style>"), -1,
            "Protocol PowerShell must not duplicate the shared document layout or CSS.");
        assert.ok(sharedTemplateSource.indexOf("{{DOCUMENT_BODY}}") >= 0 && sharedTemplateSource.indexOf("<style>") >= 0,
            "The A4 layout must be an external reusable template with a body slot.");
        assert.ok(sharedTemplateSource.indexOf("--accent: #19833e") >= 0 && sharedTemplateSource.indexOf(".people") >= 0 &&
            sharedTemplateSource.indexOf(".note") >= 0 && sharedTemplateSource.indexOf("{{LOGO_MARKUP}}") >= 0,
            "Shared template must preserve the original green INVESTA layout and external logo slot.");
        assert.strictEqual(documentRenderer.templatePath, path.join(root, "server/templates/document-a4.html"));
        var escapedDocument = documentRenderer.renderJiraAssetProtocol({
            mode: "return",
            generatedAt: "2026-08-11T10:20:30.000Z",
            user: { name: "<script>alert(1)</script>", email: "a&b@example.invalid" },
            itPerson: { name: "IT" },
            assets: [{ hostname: "PC<01", model: "A&B", serialNumber: "\"SN\"", inventoryNumber: "", assetIdentifier: "IT-1" }]
        });
        assert.strictEqual(escapedDocument.indexOf("<script>alert(1)</script>"), -1,
            "Shared template renderer must escape all script/Jira supplied values.");
        assert.ok(escapedDocument.indexOf("&lt;script&gt;alert(1)&lt;/script&gt;") >= 0 && escapedDocument.indexOf("A&amp;B") >= 0,
            "Shared template renderer must preserve user data as escaped text.");

        console.log("Jira Asset Protocol lifecycle, script-owned authoritative recheck, progress and protected PDF contract: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var protocolFactory = require(path.join(root, "server/core/jira-protocol-service.js"));
var pdfTextRenderer = require(path.join(root, "server/core/pdf-text-renderer.js"));

(async function () {
    var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-pdf-fallback-"));
    try {
        var rendererCalls = 0;
        var service = protocolFactory.createJiraProtocolService({
            context: { fs: fs, path: path, nativePath: path, dataRoot: temp },
            jiraAssets: {
                listUsers: function () {
                    return Promise.resolve({ items: [{ value: "acc-1", accountId: "acc-1", displayName: "Lukasz Zolc", emailAddress: "lukasz@example.invalid" }] });
                },
                listAssets: function () {
                    return Promise.resolve({ items: [{ value: "PC-01", hostname: "PC-01", objectId: "1001", objectKey: "IT-1001", model: "ThinkPad T14", serialNumber: "SN-01", inventoryNumber: "INV-01" }] });
                }
            },
            renderProtocolDocument: function () { return "<html><body>styled protocol</body></html>"; },
            renderHtmlPdf: function (html, options) {
                rendererCalls++;
                assert.ok(html.indexOf("styled protocol") >= 0);
                assert.ok(options && options.fallbackText.indexOf("PROTOKOL PRZEKAZANIA SPRZETU") >= 0,
                    "Protocol service must pass canonical protocol text to the single PDF renderer owner.");
                var pdf = pdfTextRenderer.renderTextPdf(options.fallbackText);
                pdf.sirkFallbackReason = "edge-headless: no usable browser executable found";
                return Promise.resolve(pdf);
            },
            executor: {
                execute: function () {
                    return Promise.resolve({
                        exitCode: 0,
                        data: {
                            protocol: true,
                            message: "Gotowe",
                            text: "PROTOKOL PRZEKAZANIA SPRZETU\nUzytkownik: Lukasz Zolc\nSprzet: PC-01",
                            data: {
                                mode: "transfer",
                                generatedAt: "2026-08-12T08:00:00.000Z",
                                user: { name: "Lukasz Zolc", email: "lukasz@example.invalid" },
                                itPerson: { name: "Operator" },
                                assets: [{ hostname: "PC-01", model: "ThinkPad T14", serialNumber: "SN-01", inventoryNumber: "INV-01" }]
                            }
                        }
                    });
                }
            }
        });

        var script = {
            path: "Jira/Jira Asset Protocol.ps1",
            label: "Jira Asset Protocol",
            extraHeaders: ["SirkWorkflow: JiraAssetProtocol"],
            variables: [{ name: "PcName", control: "asset", jiraAsset: { aql: "Key is not EMPTY", labelAttribute: "Nazwa_sieciowa", maxResults: 5000, userVariable: "JiraUser" } }]
        };
        var request = { id: "ReqFallback_123" };
        var result = await service.execute(script, {
            scriptPath: script.path,
            variableValues: { JiraUser: "acc-1", PcName: "PC-01", IsTransferProtocol: true, ItPerson: "Operator" }
        }, request);

        assert.strictEqual(rendererCalls, 1, "Protocol lifecycle must delegate PDF generation exactly once to the shared renderer owner.");
        assert.strictEqual(result.artifacts.length, 1);
        assert.strictEqual(result.artifacts[0].type, "pdf");
        assert.strictEqual(service.progress(request.id, "completed").percent, 100);

        var artifactPath = path.join(temp, "artifacts", request.id, result.artifacts[0].id + ".pdf");
        var pdf = fs.readFileSync(artifactPath);
        assert.ok(pdf.length >= 100 && pdf.slice(0, 8).toString("ascii").indexOf("%PDF-1.") === 0,
            "Renderer-owned fallback must persist valid PDF bytes.");
        assert.ok(result.message.indexOf("edge-headless: no usable browser executable found") >= 0,
            "A renderer-owned fallback reason must surface in the result message instead of being silently swallowed.");

        console.log("Jira protocol delegates one renderer-owned PDF fallback contract: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

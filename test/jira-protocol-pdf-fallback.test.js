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
                    return Promise.resolve({ items: [{ value: "acc-1", accountId: "acc-1", displayName: "Test User" }] });
                },
                listAssets: function () {
                    return Promise.resolve({ items: [{ value: "PC-01", hostname: "PC-01", objectId: "1001", objectKey: "IT-1001" }] });
                }
            },
            renderProtocolDocument: function () { return "<html><body>styled protocol</body></html>"; },
            renderHtmlPdf: function (html, options) {
                rendererCalls++;
                assert.ok(options && options.fallbackText.indexOf("PROTOKOL PRZEKAZANIA SPRZETU") >= 0);
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
                            text: "PROTOKOL PRZEKAZANIA SPRZETU\nUzytkownik: Test User\nSprzet: PC-01",
                            data: {
                                mode: "transfer",
                                generatedAt: "2026-08-13T08:00:00.000Z",
                                user: { name: "Test User" },
                                itPerson: { name: "Operator" },
                                assets: [{ hostname: "PC-01" }]
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
            variables: [{ name: "PcName", control: "asset" }]
        };
        var request = { id: "ReqFallback_123" };
        var result = await service.execute(script, {
            variableValues: { JiraUser: "acc-1", PcName: "PC-01", IsTransferProtocol: true, ItPerson: "Operator" }
        }, request);

        assert.strictEqual(rendererCalls, 1);
        assert.strictEqual(result.artifacts.length, 1);
        assert.ok(result.message.indexOf("edge-headless: no usable browser executable found") >= 0);
        var artifactPath = path.join(temp, "artifacts", request.id, result.artifacts[0].id + ".pdf");
        var pdf = fs.readFileSync(artifactPath);
        assert.ok(pdf.length >= 100 && pdf.slice(0, 8).toString("ascii").indexOf("%PDF-1.") === 0);

        console.log("Jira protocol delegates one renderer-owned PDF fallback contract: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

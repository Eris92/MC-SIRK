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
        var browserCalls = 0;
        var fallbackCalls = 0;
        var service = protocolFactory.createJiraProtocolService({
            context: { fs: fs, path: path, nativePath: path, dataRoot: temp },
            jiraAssets: {
                listUsers: function () {
                    return Promise.resolve({ items: [{
                        value: "acc-1",
                        accountId: "acc-1",
                        displayName: "Lukasz Zolc",
                        emailAddress: "lukasz@example.invalid"
                    }] });
                },
                listAssets: function () {
                    return Promise.resolve({ items: [{
                        value: "PC-01",
                        hostname: "PC-01",
                        objectId: "1001",
                        objectKey: "IT-1001",
                        model: "ThinkPad T14",
                        serialNumber: "SN-01",
                        inventoryNumber: "INV-01"
                    }] });
                }
            },
            renderProtocolDocument: function () {
                return "<html><body>styled protocol</body></html>";
            },
            renderHtmlPdf: function () {
                browserCalls++;
                return Promise.reject(new Error("edge-headless: Command failed"));
            },
            renderFallbackPdf: function (value) {
                fallbackCalls++;
                return pdfTextRenderer.renderTextPdf(value);
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
            variables: [{
                name: "PcName",
                control: "asset",
                jiraAsset: {
                    aql: "Key is not EMPTY",
                    labelAttribute: "Nazwa_sieciowa",
                    maxResults: 5000,
                    userVariable: "JiraUser"
                }
            }]
        };
        var request = { id: "ReqFallback_123" };
        var result = await service.execute(script, {
            scriptPath: script.path,
            variableValues: {
                JiraUser: "acc-1",
                PcName: "PC-01",
                IsTransferProtocol: true,
                ItPerson: "Operator"
            }
        }, request);

        assert.strictEqual(browserCalls, 1, "Styled browser renderer must remain the preferred first attempt.");
        assert.strictEqual(fallbackCalls, 1, "Browser failure must invoke exactly one existing direct PDF fallback.");
        assert.strictEqual(result.artifacts.length, 1);
        assert.strictEqual(result.artifacts[0].type, "pdf");
        assert.strictEqual(service.progress(request.id, "completed").percent, 100,
            "Successful fallback PDF must complete the existing protocol lifecycle.");

        var artifactPath = path.join(temp, "artifacts", request.id, result.artifacts[0].id + ".pdf");
        var pdf = fs.readFileSync(artifactPath);
        assert.ok(pdf.length >= 100 && pdf.slice(0, 8).toString("ascii").indexOf("%PDF-1.") === 0,
            "Fallback must persist valid PDF bytes instead of returning the Edge command failure.");

        var failedService = protocolFactory.createJiraProtocolService({
            context: { fs: fs, path: path, nativePath: path, dataRoot: temp },
            jiraAssets: {
                listUsers: function () { return Promise.resolve({ items: [{ value: "acc-1", accountId: "acc-1", displayName: "User" }] }); },
                listAssets: function () { return Promise.resolve({ items: [{ value: "PC-01", hostname: "PC-01" }] }); }
            },
            renderProtocolDocument: function () { return "<html><body>x</body></html>"; },
            renderHtmlPdf: function () { return Promise.reject(new Error("edge failed")); },
            renderFallbackPdf: function () { throw new Error("fallback failed"); },
            executor: {
                execute: function () {
                    return Promise.resolve({
                        exitCode: 0,
                        data: {
                            protocol: true,
                            text: "PROTOCOL",
                            data: { mode: "transfer", user: {}, itPerson: {}, assets: [] }
                        }
                    });
                }
            }
        });
        await assert.rejects(function () {
            return failedService.execute(script, {
                variableValues: { JiraUser: "acc-1", PcName: "PC-01", IsTransferProtocol: true, ItPerson: "Operator" }
            }, { id: "ReqFallbackFail_123" });
        }, /PDF renderers failed: browser=edge failed; fallback=fallback failed/,
        "If both bounded renderers fail, diagnostics must retain both causes.");

        console.log("Jira protocol browser PDF failure uses existing direct PDF fallback: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

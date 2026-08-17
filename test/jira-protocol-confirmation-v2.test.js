"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var factory = require("../server/core/jira-protocol-v2-service.js");
var pdf = require("../server/core/pdf-text-renderer.js");

function item(id, assigned) { return { value: id, assetId: id, objectId: id, objectKey: "IT-" + id, hostname: "PC-" + id, manufacturer: "Vendor", model: "Model " + id, serialNumber: "SN-" + id, inventoryNumber: "INV-" + id, assignedToUser: assigned }; }

(async function () {
    var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-protocol-v2-"));
    try {
        fs.mkdirSync(path.join(temp, "server", "templates"), { recursive: true });
        fs.writeFileSync(path.join(temp, "server", "templates", "document-a4.html"), "<!doctype html><html><body><h1>{{DOCUMENT_TITLE}}</h1>{{DOCUMENT_BODY}}</body></html>", "utf8");
        var applyCalls = 0, snapshotCalls = 0;
        var context = { fs: fs, path: path, nativePath: path, dataRoot: temp, pluginRoot: temp, integrations: { get: function () { return { url: "https://example.atlassian.net", email: "svc@example.invalid", token: "SECRET", cloudId: "cloud", workspaceId: "workspace", verifyTls: true }; } }, parent: null };
        var service = factory.createJiraProtocolService({
            context: context,
            jiraAssets: {
                listUsers: function () { return Promise.resolve({ items: [{ value: "acc-1", accountId: "acc-1", displayName: "User One", emailAddress: "one@example.invalid" }] }); },
                listAssets: function (userValue) {
                    if (userValue) return Promise.resolve({ items: [item("1001", true), item("1003", true)], stale: false });
                    return Promise.resolve({ items: [item("1001", true), item("1002", false), item("1003", true)], stale: false });
                }
            },
            renderHtmlPdf: function (html) {
                assert.ok(html.indexOf("Zmiany na stanie") >= 0);
                assert.ok(html.indexOf("Stan po zmianie") >= 0);
                return Promise.resolve(pdf.renderTextPdf("protocol"));
            }
        });
        // Replace the mutation owner's external methods through the public protocol contract is intentionally impossible;
        // use a second service with injectable HTTP below to exercise the full flow without Jira writes before confirm.
        var requests = [];
        var live = { "1001": "acc-1", "1002": "", "1003": "acc-1" };
        service = factory.createJiraProtocolService({
            context: context,
            jiraAssets: {
                listUsers: function () { return Promise.resolve({ items: [{ value: "acc-1", accountId: "acc-1", displayName: "User One", emailAddress: "one@example.invalid" }] }); },
                listAssets: function (userValue) {
                    if (userValue) return Promise.resolve({ items: [item("1001", true), item("1003", true)], stale: false });
                    return Promise.resolve({ items: [item("1001", true), item("1002", false), item("1003", true)], stale: false });
                }
            },
            requestJson: function (options) {
                requests.push(options);
                if (/\/objecttype\/10\/attributes$/.test(options.url)) return Promise.resolve([{ id: "55", name: "Owner", editable: true, maximumCardinality: 1, defaultType: { name: "User" } }]);
                var match = /\/object\/(100[123])$/.exec(options.url);
                if (match && options.method === "GET") return Promise.resolve({ id: match[1], objectType: { id: "10", name: "Laptop" }, attributes: [{ objectTypeAttributeId: "55", objectTypeAttribute: { id: "55", name: "Owner" }, objectAttributeValues: live[match[1]] ? [{ user: { accountId: live[match[1]] }, value: live[match[1]] }] : [] }] });
                if (match && options.method === "PUT") { applyCalls++; var vals = options.json.attributes[0].objectAttributeValues; live[match[1]] = vals.length ? String(vals[0].value) : ""; return Promise.resolve({}); }
                return Promise.reject(new Error("Unexpected request: " + options.method + " " + options.url));
            },
            renderHtmlPdf: function (html) { assert.ok(html.indexOf("Zmiany na stanie") >= 0 && html.indexOf("Stan po zmianie") >= 0); return Promise.resolve(pdf.renderTextPdf("protocol")); }
        });

        var script = { path: "Jira/Jira Asset Protocol.ps1", label: "Jira Asset Protocol", extraHeaders: ["SirkWorkflow: JiraAssetProtocol"], variables: [{ name: "PcName", control: "asset", jiraAsset: { aql: "objectType = Laptop", labelAttribute: "Hostname", maxResults: 1000, userVariable: "JiraUser" } }] };
        var request = { id: "ReqV2_123", requester: { id: "user/one", name: "Operator" } };
        var result = await service.execute(script, { variableValues: { JiraUser: "acc-1", PcName: "1001;1002;1003", JiraAssetActionsJson: JSON.stringify({ "1001": "return", "1002": "receive", "1003": "none" }), ItPerson: "Operator" } }, request);
        snapshotCalls = requests.filter(function (call) { return call.method === "GET" && /\/object\//.test(call.url); }).length;
        assert.strictEqual(result.data.hasChanges, true);
        assert.deepStrictEqual(result.data.assets.map(function (asset) { return asset.action; }), ["return", "receive", "none"]);
        assert.deepStrictEqual(result.data.finalAssets.map(function (asset) { return asset.assetId; }).sort(), ["1002", "1003"]);
        assert.strictEqual(service.requiresConfirmation(result), true);
        assert.strictEqual(applyCalls, 0, "Protocol/PDF preparation must not update Jira Assets.");
        assert.ok(snapshotCalls >= 2, "Changed assets must be snapshotted from live Jira before PDF preparation.");
        assert.strictEqual(result.artifacts.length, 1);
        assert.strictEqual(result.artifacts[0].type, "pdf");
        assert.strictEqual(result.artifacts[0].autoOpen, false);
        var output = JSON.parse(result.output);
        assert.strictEqual(output.columns[0], "Operacja");
        assert.strictEqual(output.rows[0].Operacja, "Zdanie sprzętu");

        var finalized = await service.confirm(result, request);
        assert.strictEqual(applyCalls, 2, "Only changed assets must receive Jira writes after confirmation.");
        assert.strictEqual(finalized.data.cmdb.updated, 2);
        assert.strictEqual(Object.prototype.hasOwnProperty.call(finalized, "_jiraConfirmation"), false);
        assert.strictEqual(live["1001"], "");
        assert.strictEqual(live["1002"], "acc-1");
        assert.strictEqual(live["1003"], "acc-1");

        requests.length = 0; applyCalls = 0;
        var noChange = await service.execute(script, { variableValues: { JiraUser: "acc-1", PcName: "1002;1003", JiraAssetActionsJson: JSON.stringify({ "1002": "none", "1003": "none" }), ItPerson: "Operator" } }, { id: "ReqV2_None" });
        assert.strictEqual(noChange.data.hasChanges, false);
        assert.strictEqual(service.requiresConfirmation(noChange), false);
        assert.strictEqual(applyCalls, 0);
        assert.strictEqual(requests.filter(function (call) { return /\/object\//.test(call.url); }).length, 0, "All no-change reconciliation must not perform mutation snapshot or Jira object writes.");

        console.log("Jira mixed per-asset protocol prepares PDF first, confirms later and skips writes for no-change: OK");
    } finally { fs.rmSync(temp, { recursive: true, force: true }); }
})().catch(function (error) { console.error(error && error.stack || error); process.exitCode = 1; });

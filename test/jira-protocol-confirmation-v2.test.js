"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var factory = require("../server/core/jira-protocol-service.js");
var pdf = require("../server/core/pdf-text-renderer.js");

function item(id, assigned) {
    return {
        value: id,
        assetId: id,
        objectId: id,
        objectKey: "IT-" + id,
        objectType: "Laptop",
        hostname: "PC-" + id,
        manufacturer: "Vendor",
        model: "Model " + id,
        serialNumber: "SN-" + id,
        inventoryNumber: "INV-" + id,
        assignedToUser: assigned
    };
}

(async function () {
    var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-protocol-confirmation-"));
    try {
        var live = { "1001": "acc-1", "1002": "", "1003": "acc-1" };
        var puts = [];
        var reads = [];
        var forcedRefresh = 0;
        var renderCount = 0;
        var context = {
            fs: fs,
            path: path,
            nativePath: path,
            dataRoot: temp,
            integrations: {
                get: function () {
                    return {
                        url: "https://example.atlassian.net",
                        email: "svc@example.invalid",
                        token: "SECRET",
                        cloudId: "cloud",
                        workspaceId: "workspace",
                        verifyTls: true
                    };
                }
            },
            parent: null
        };
        var service = factory.createJiraProtocolService({
            context: context,
            jiraAssets: {
                listUsers: function () {
                    return Promise.resolve({
                        items: [{ value: "acc-1", accountId: "acc-1", displayName: "User One", emailAddress: "one@example.invalid" }]
                    });
                },
                listAssets: function (userValue, variable, force) {
                    if (force) forcedRefresh++;
                    return Promise.resolve({
                        items: userValue ? [item("1001", true), item("1003", true)] :
                            [item("1001", true), item("1002", false), item("1003", true)],
                        stale: false
                    });
                }
            },
            requestJson: function (options) {
                if (/\/objecttype\/10\/attributes$/.test(options.url)) {
                    return Promise.resolve([{ id: "55", name: "Owner", editable: true, maximumCardinality: 1, defaultType: { name: "User" } }]);
                }
                var match = /\/object\/(100[123])$/.exec(options.url);
                if (match && options.method === "GET") {
                    reads.push(match[1]);
                    return Promise.resolve({
                        id: match[1],
                        objectType: { id: "10", name: "Laptop" },
                        attributes: [{
                            objectTypeAttributeId: "55",
                            objectTypeAttribute: { id: "55", name: "Owner" },
                            objectAttributeValues: live[match[1]] ? [{ user: { accountId: live[match[1]] }, value: live[match[1]] }] : []
                        }]
                    });
                }
                if (match && options.method === "PUT") {
                    puts.push(options);
                    var values = options.json.attributes[0].objectAttributeValues;
                    live[match[1]] = values.length ? String(values[0].value) : "";
                    return Promise.resolve({});
                }
                return Promise.reject(new Error("Unexpected request: " + options.method + " " + options.url));
            },
            renderHtmlPdf: function (html) {
                renderCount++;
                assert.ok(html.indexOf("PROTOKÓŁ PRZEKAZANIA/ZWROTU SPRZĘTU") >= 0,
                    "Prepared Jira protocol must use the requested document title.");
                assert.strictEqual(html.indexOf("Zmiany w Jira Assets zostaną wykonane dopiero po podpisaniu protokołu"), -1,
                    "Prepared Jira protocol must not expose the implementation-oriented confirmation wording.");
                if (renderCount === 1) {
                    assert.ok(html.indexOf("Oświadczam, że zapoznałem/am się ze stanem przekazywanego sprzętu") >= 0,
                        "Changed protocol must retain the equipment-state acknowledgement statement.");
                }
                assert.ok(html.indexOf("Zmiany na stanie") >= 0, "PDF must contain the planned changes table.");
                assert.ok(html.indexOf("Stan po zmianie") >= 0, "PDF must contain expected final inventory.");
                assert.ok(html.indexOf("Przyjęcie sprzętu") >= 0 && html.indexOf("Zdanie sprzętu") >= 0 && html.indexOf("Bez zmian") >= 0,
                    "Mixed protocol operations must be visible in the prepared PDF.");
                return Promise.resolve(pdf.renderTextPdf("protocol"));
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
                    aql: 'objectType in objectTypeAndChildren("Sprzęt użytkownika")',
                    labelAttribute: "Nazwa_sieciowa",
                    maxResults: 1000,
                    userVariable: "JiraUser"
                }
            }]
        };
        var request = { id: "ReqProtocol_123", requester: { id: "user/one", name: "Operator" } };
        var result = await service.execute(script, {
            variableValues: {
                JiraUser: "acc-1",
                PcName: "1001;1002;1003",
                JiraAssetActionsJson: JSON.stringify({ "1001": "return", "1002": "receive", "1003": "none" }),
                ItPerson: "Operator"
            }
        }, request);

        assert.strictEqual(result.data.hasChanges, true);
        assert.deepStrictEqual(result.data.assets.map(function (asset) { return asset.action; }), ["return", "receive", "none"]);
        assert.deepStrictEqual(result.data.finalAssets.map(function (asset) { return asset.assetId; }).sort(), ["1002", "1003"]);
        assert.strictEqual(service.requiresConfirmation(result), true);
        assert.strictEqual(puts.length, 0, "PDF preparation must not update Jira Assets.");
        assert.ok(reads.length >= 2, "Changed assets must be snapshotted from live Jira.");
        assert.strictEqual(result.artifacts[0].type, "pdf");
        assert.strictEqual(result.artifacts[0].autoOpen, false);
        assert.strictEqual(JSON.parse(result.output).columns[0], "Operacja");
        assert.ok(result._jiraConfirmation && result._jiraConfirmation.changes.length === 2,
            "Private mutation snapshot must remain server-side until confirmation.");

        var finalized = await service.confirm(result, request);
        assert.strictEqual(puts.length, 2, "Only changed assets must be written after confirmation.");
        assert.strictEqual(finalized.data.cmdb.updated, 2);
        assert.strictEqual(Object.prototype.hasOwnProperty.call(finalized, "_jiraConfirmation"), false);
        assert.strictEqual(forcedRefresh, 1, "Successful mutation must refresh the Jira Assets snapshot.");
        assert.strictEqual(live["1001"], "");
        assert.strictEqual(live["1002"], "acc-1");
        assert.strictEqual(live["1003"], "acc-1");

        reads.length = 0;
        puts.length = 0;
        var noChange = await service.execute(script, {
            variableValues: {
                JiraUser: "acc-1",
                PcName: "1002;1003",
                JiraAssetActionsJson: JSON.stringify({ "1002": "none", "1003": "none" }),
                ItPerson: "Operator"
            }
        }, { id: "ReqProtocol_None" });
        assert.strictEqual(noChange.data.hasChanges, false);
        assert.strictEqual(service.requiresConfirmation(noChange), false);
        assert.strictEqual(puts.length, 0);
        assert.strictEqual(reads.length, 0, "No-change protocol must not snapshot mutation state.");
        assert.strictEqual(Object.prototype.hasOwnProperty.call(noChange, "_jiraConfirmation"), false);

        await assert.rejects(function () {
            return service.execute(script, {
                variableValues: {
                    JiraUser: "acc-1",
                    PcName: "PC-1001",
                    JiraAssetActionsJson: JSON.stringify({ "PC-1001": "return" }),
                    ItPerson: "Operator"
                }
            }, { id: "ReqProtocol_Label" });
        }, /no longer available in the protocol scope/,
        "Browser labels/hostnames must never be accepted as authoritative Jira asset identity.");

        console.log("Jira mixed per-asset protocol prepares protected PDF first, confirms later and skips no-change writes: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

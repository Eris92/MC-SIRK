"use strict";
var assert = require("assert");
var factory = require("../server/core/jira-asset-confirmation-service.js");
function integration() { return { get: function () { return { url: "https://example.atlassian.net", email: "svc@example.invalid", token: "SECRET", cloudId: "cloud", workspaceId: "workspace", verifyTls: true }; } }; }
function refObject(id, ownerId) { return { id: id, objectType: { id: "10", name: "Laptop" }, attributes: [{ objectTypeAttributeId: "77", objectTypeAttribute: { id: "77", name: "Pracownik" }, objectAttributeValues: ownerId ? [{ referencedObject: { id: ownerId, objectKey: "USR-1", label: "User One" }, value: ownerId }] : [] }] }; }
(async function () {
    var owner = "", puts = [];
    var variable = { control: "asset", jiraAsset: { aql: "objectType = Laptop", labelAttribute: "Hostname", maxResults: 1000, userVariable: "JiraUser" } };
    var service = factory.createJiraAssetConfirmationService({ integrations: integration(), jiraAssets: { listAssets: function () { return Promise.resolve({ items: [] }); } }, requestJson: function (options) {
        if (/\/objecttype\/10\/attributes$/.test(options.url)) return Promise.resolve([{ id: "77", name: "Pracownik", editable: true, maximumCardinality: 1, referenceObjectTypeId: "99", defaultType: { name: "Reference" } }]);
        if (/\/object\/2001$/.test(options.url) && options.method === "GET") return Promise.resolve(refObject("2001", owner));
        if (/\/object\/2001$/.test(options.url) && options.method === "PUT") { puts.push(options); var vals = options.json.attributes[0].objectAttributeValues; owner = vals.length ? String(vals[0].value) : ""; return Promise.resolve({}); }
        if (/\/object\/aql/.test(options.url) && options.method === "POST") return Promise.resolve({ values: [{ id: "700", objectKey: "USR-1", label: "User One", objectType: { id: "99", name: "Pracownik" }, attributes: [{ objectTypeAttribute: { name: "Account" }, objectAttributeValues: [{ value: "acc-1", displayValue: "acc-1" }] }] }], isLast: true, total: 1 });
        return Promise.reject(new Error("Unexpected request: " + options.method + " " + options.url));
    } });
    var user = { value: "acc-1", accountId: "acc-1", displayName: "User One" };
    var snapshot = await service.snapshot(user, [{ assetId: "2001", action: "receive" }], variable);
    assert.strictEqual(snapshot.changes[0].kind, "reference");
    assert.strictEqual(snapshot.changes[0].attributeId, "77");
    assert.strictEqual(snapshot.changes[0].targetValue, "700");
    assert.strictEqual(puts.length, 0);
    var result = await service.apply(snapshot);
    assert.strictEqual(result.updated, 1);
    assert.strictEqual(owner, "700");
    assert.deepStrictEqual(puts[0].json.attributes[0].objectAttributeValues, [{ value: "700" }]);
    console.log("Jira reference-object owner schema is discovered dynamically and written by stable object ID: OK");
})().catch(function (error) { console.error(error && error.stack || error); process.exitCode = 1; });

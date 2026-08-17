"use strict";
var assert = require("assert");
var factory = require("../server/core/jira-asset-confirmation-service.js");
function integration() { return { get: function () { return { url: "https://example.atlassian.net", email: "service@example.invalid", token: "SECRET", cloudId: "cloud", workspaceId: "workspace", verifyTls: true }; } }; }
function user() { return { value: "acc-1", accountId: "acc-1", displayName: "User One", emailAddress: "one@example.invalid" }; }
function definition() { return [{ id: "55", name: "Osoba odpowiedzialna", editable: true, maximumCardinality: 1, defaultType: { name: "User" } }]; }
function objectRow(id, owner) { return { id: id, objectType: { id: "10", name: "Laptop" }, attributes: [{ objectTypeAttributeId: "55", objectTypeAttribute: { id: "55", name: "Osoba odpowiedzialna" }, objectAttributeValues: owner ? [{ user: { accountId: owner, displayName: "User One" }, value: owner }] : [] }] }; }
function asset(id) { return { value: "PC-" + id, objectId: id, objectKey: "IT-" + id, objectType: "Laptop", hostname: "PC-" + id }; }
function variable() { return { control: "asset", name: "PcName", jiraAsset: { aql: 'objectType in objectTypeAndChildren("Sprzęt użytkownika")', labelAttribute: "Nazwa_sieciowa", maxResults: 1000, userVariable: "JiraUser" } }; }
(async function () {
    var live = { "1001": "", "1002": "acc-1", "1003": "" }, puts = [], refreshes = 0;
    var service = factory.createJiraAssetConfirmationService({ integrations: integration(), jiraAssets: { listAssets: function (userValue, value, force) { if (force) refreshes++; return Promise.resolve({ items: userValue ? [asset("1002")] : [asset("1001"), asset("1002"), asset("1003")], stale: false }); } }, requestJson: function (options) { if (/\/objecttype\/10\/attributes$/.test(options.url)) return Promise.resolve(definition()); var match = /\/object\/(100[123])$/.exec(options.url); if (match && options.method === "GET") return Promise.resolve(objectRow(match[1], live[match[1]])); if (match && options.method === "PUT") { puts.push(options); var values = options.json.attributes[0].objectAttributeValues; live[match[1]] = values.length ? String(values[0].value) : ""; return Promise.resolve({}); } return Promise.reject(new Error("Unexpected request: " + options.method + " " + options.url)); } });
    var inventory = await service.protocolInventory("acc-1", variable(), false);
    assert.strictEqual(inventory.items.length, 3);
    assert.strictEqual(inventory.items.filter(function (item) { return item.assetId === "1002"; })[0].assignedToUser, true);
    assert.deepStrictEqual(inventory.items.filter(function (item) { return item.assetId === "1001"; })[0].disabledActions, ["return"]);
    assert.deepStrictEqual(inventory.items.filter(function (item) { return item.assetId === "1002"; })[0].disabledActions, ["receive"]);
    var snapshot = await service.snapshot(user(), [{ assetId: "1001", action: "receive" }, { assetId: "1002", action: "return" }], variable());
    assert.strictEqual(puts.length, 0, "Preparation must not mutate Jira.");
    assert.deepStrictEqual(snapshot.changes[0].beforeValues, []);
    assert.deepStrictEqual(snapshot.changes[1].beforeValues, ["acc-1"]);
    var applied = await service.apply(snapshot);
    assert.strictEqual(applied.updated, 2);
    assert.strictEqual(puts.length, 2);
    assert.deepStrictEqual(puts[0].json.attributes[0].objectAttributeValues, [{ value: "acc-1" }]);
    assert.deepStrictEqual(puts[1].json.attributes[0].objectAttributeValues, []);
    assert.strictEqual(refreshes, 1, "Successful CMDB writes must refresh the shared Jira Assets cache immediately.");
    var stale = await service.snapshot(user(), [{ assetId: "1003", action: "receive" }], variable());
    live["1003"] = "different-user";
    var before = puts.length;
    await assert.rejects(function () { return service.apply(stale); }, /changed after protocol generation/);
    assert.strictEqual(puts.length, before, "Stale state must block before write.");
    console.log("Jira per-asset confirmation snapshots, stale gate, cache refresh and verified writes: OK");
})().catch(function (error) { console.error(error && error.stack || error); process.exitCode = 1; });

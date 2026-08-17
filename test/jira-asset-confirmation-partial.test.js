"use strict";
var assert = require("assert");
var factory = require("../server/core/jira-asset-confirmation-service.js");
function integration() { return { get: function () { return { url: "https://example.atlassian.net", email: "svc@example.invalid", token: "SECRET", cloudId: "cloud", workspaceId: "workspace", verifyTls: true }; } }; }
function row(id, owner) { return { id: id, objectType: { id: "10", name: "Laptop" }, attributes: [{ objectTypeAttributeId: "55", objectTypeAttribute: { id: "55", name: "Owner" }, objectAttributeValues: owner ? [{ user: { accountId: owner }, value: owner }] : [] }] }; }
(async function () {
    var live = { "3001": "", "3002": "" }, puts = 0, refreshes = 0;
    var variable = { control: "asset", jiraAsset: { aql: "objectType = Laptop", labelAttribute: "Hostname", maxResults: 1000, userVariable: "JiraUser" } };
    var service = factory.createJiraAssetConfirmationService({ integrations: integration(), jiraAssets: { listAssets: function (userValue, value, force) { if (force) refreshes++; return Promise.resolve({ items: [] }); } }, requestJson: function (options) {
        if (/\/objecttype\/10\/attributes$/.test(options.url)) return Promise.resolve([{ id: "55", name: "Owner", editable: true, maximumCardinality: 1, defaultType: { name: "User" } }]);
        var m=/\/object\/(300[12])$/.exec(options.url);
        if (m && options.method === "GET") return Promise.resolve(row(m[1], live[m[1]]));
        if (m && options.method === "PUT") { puts++; live[m[1]] = String(options.json.attributes[0].objectAttributeValues[0].value); return Promise.resolve({}); }
        return Promise.reject(new Error("Unexpected request"));
    } });
    var user={value:"acc-1",accountId:"acc-1",displayName:"User One"};
    var snapshot=await service.snapshot(user,[{assetId:"3001",action:"receive"},{assetId:"3002",action:"receive"}],variable);
    live["3002"]="other-user";
    await assert.rejects(function(){return service.apply(snapshot);},/partial update: 1\/2/);
    assert.strictEqual(puts,1,"Second stale item must block before its write while preserving evidence of the first write.");
    assert.strictEqual(refreshes,1,"Partial mutation must refresh shared Jira Assets cache state.");
    console.log("Jira partial confirmation failure cannot look completed and refreshes stale cache state: OK");
})().catch(function(error){console.error(error&&error.stack||error);process.exitCode=1;});

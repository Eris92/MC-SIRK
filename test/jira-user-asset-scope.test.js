"use strict";

var assert = require("assert");
var path = require("path");

var root = path.join(__dirname, "..");
var scopeFactory = require(path.join(root, "server/core/jira-user-asset-scope.js"));
var BASE_AQL = 'objectType in objectTypeAndChildren("Sprzet uzytkownika")';

function factory(targetedFailure) {
    var calls = [];
    return {
        calls: calls,
        createJiraAssetService: function () {
            return {
                cachePath: "users.json",
                assetCachePath: "assets.json",
                listUsers: function () {
                    return Promise.resolve({ items: [{
                        value: "acc-1",
                        accountId: "acc-1",
                        emailAddress: "user1@example.invalid",
                        displayName: "User One"
                    }] });
                },
                listAssets: function (userValue, variable) {
                    var aql = variable && variable.jiraAsset && variable.jiraAsset.aql || "";
                    calls.push({ userValue: userValue, aql: aql });
                    if (aql === BASE_AQL) {
                        return Promise.resolve({ items: [{ value: "PC-01", objectKey: "PC-1", label: "PC-01 - Komputer" }] });
                    }
                    if (targetedFailure) return Promise.reject(new Error("targeted AQL rejected"));
                    return Promise.resolve({ items: [{ value: "PHONE-01", objectKey: "TEL-1", label: "PHONE-01 - Telefon" }] });
                },
                optionsFor: function () {
                    throw new Error("Base optionsFor must not own selected-user asset expansion.");
                }
            };
        }
    };
}

(async function () {
    var base = factory(false);
    var service = scopeFactory.createJiraAssetService({ baseFactory: base });
    var result = await service.optionsFor({
        control: "asset",
        jiraAsset: { aql: BASE_AQL, userVariable: "JiraUser", labelAttribute: "Nazwa_sieciowa" }
    }, { JiraUser: "acc-1" }, false);

    assert.strictEqual(base.calls.length, 2, "Selected-user lookup must reuse the working anchor and one targeted expansion.");
    assert.strictEqual(base.calls[0].aql, BASE_AQL, "The first lookup must keep the proven base AQL unchanged.");
    assert.ok(base.calls[1].aql.indexOf('anyAttribute = "acc-1"') >= 0, "Targeted AQL must include Jira accountId.");
    assert.ok(base.calls[1].aql.indexOf('anyAttribute = "user1@example.invalid"') >= 0, "Targeted AQL must include Jira email.");
    assert.ok(base.calls[1].aql.indexOf('Label = "User One"') >= 0, "Targeted AQL must include the display label.");
    assert.ok(base.calls[1].aql.indexOf("outboundReferences(") >= 0, "Targeted AQL must cover outbound object references.");
    assert.ok(base.calls[1].aql.indexOf("inboundReferences(") >= 0, "Targeted AQL must cover inbound object references.");
    assert.deepStrictEqual(result.items.map(function (item) { return item.objectKey; }), ["PC-1", "TEL-1"],
        "Working PC results and heterogeneous targeted results must be merged.");

    var failedBase = factory(true);
    var failedService = scopeFactory.createJiraAssetService({ baseFactory: failedBase });
    var fallback = await failedService.listAssets("acc-1", {
        control: "asset",
        jiraAsset: { aql: BASE_AQL, userVariable: "JiraUser" }
    }, false);
    assert.deepStrictEqual(fallback.items.map(function (item) { return item.objectKey; }), ["PC-1"],
        "A targeted expansion failure must never erase the last real-smoke-working PC anchor.");
    assert.ok(/expansion failed/i.test(fallback.warning), "Targeted expansion failure must remain visible as a bounded warning.");

    var cacheBase = factory(false);
    var cacheService = scopeFactory.createJiraAssetService({ baseFactory: cacheBase });
    await cacheService.listAssets("", { control: "asset", jiraAsset: { aql: BASE_AQL, userVariable: "" } }, true);
    assert.strictEqual(cacheBase.calls.length, 1, "Unbound Jira Assets cache refresh must keep a single base query.");
    assert.strictEqual(cacheBase.calls[0].aql, BASE_AQL, "Cache refresh must not become user-specific.");

    var escaped = scopeFactory._test.selectedUserAql(['A"B\\C']);
    assert.ok(escaped.indexOf('A\\"B\\\\C') >= 0, "Selected-user AQL values must escape quotes and backslashes.");

    console.log("Jira selected-user asset expansion preserves anchor and adds targeted heterogeneous scope: OK");
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

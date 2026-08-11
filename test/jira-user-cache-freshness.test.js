"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var factory = require("../server/core/jira-asset-service.js");

var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-cache-freshness-"));
var calls = [];
var token = "TOP-SECRET-TOKEN";
var cachePath = path.join(temp, "jira-users-cache.json");

fs.writeFileSync(cachePath, JSON.stringify({
    version: 1,
    fetchedAt: Date.now() - (24 * 60 * 60 * 1000) - 1000,
    users: [{ value: "old-user", accountId: "old-user", displayName: "Old User", emailAddress: "", active: true }]
}, null, 2), "utf8");

var service = factory.createJiraAssetService({
    fs: fs,
    path: path,
    dataRoot: temp,
    integrations: {
        get: function () {
            return {
                url: "https://example.atlassian.net",
                email: "service@example.invalid",
                token: token,
                cloudId: "cloud-1",
                workspaceId: "workspace-1",
                verifyTls: true
            };
        }
    },
    requestJson: function (options) {
        calls.push(options.url);
        if (options.url.indexOf("/rest/api/3/users/search") >= 0) {
            return Promise.resolve([{ accountId: "new-user", displayName: "New User", active: true }]);
        }
        if (options.url.indexOf("/object/aql") >= 0) {
            return Promise.resolve({
                values: [{
                    id: "1",
                    objectKey: "IT-1",
                    label: "PC-01",
                    attributes: [
                        { objectTypeAttribute: { name: "Owner" }, objectAttributeValues: [{ displayValue: "new-user" }] },
                        { objectTypeAttribute: { name: "Hostname" }, objectAttributeValues: [{ displayValue: "PC-01" }] }
                    ]
                }],
                total: 1,
                isLast: true
            });
        }
        return Promise.reject(new Error("Unexpected request: " + options.url));
    }
});

(async function () {
    try {
        var variable = {
            control: "asset",
            jiraAsset: {
                aql: "objectType = Computer",
                labelAttribute: "Hostname",
                maxResults: 100,
                userVariable: "JiraUser"
            }
        };
        var result = await service.optionsFor(variable, { JiraUser: "new-user" }, false);
        assert.deepStrictEqual(result.items.map(function (item) { return item.value; }), ["PC-01"],
            "User-bound Assets must use the refreshed Jira identity cache.");
        assert.ok(calls[0].indexOf("/rest/api/3/users/search") >= 0,
            "Expired 24h cache must refresh users before the Assets request.");
        assert.ok(calls[1].indexOf("/object/aql") >= 0,
            "Assets request must run only after the stale user cache refresh completes.");

        var cache = fs.readFileSync(cachePath, "utf8");
        assert.ok(cache.indexOf("new-user") >= 0 && cache.indexOf("old-user") < 0,
            "Successful refresh must atomically replace the expired user cache.");
        assert.strictEqual(cache.indexOf(token), -1, "Jira token must never be persisted in the user cache.");

        var before = calls.length;
        var fresh = await service.listUsers(false, true);
        assert.strictEqual(fresh.stale, false);
        assert.deepStrictEqual(fresh.items.map(function (item) { return item.value; }), ["new-user"]);
        assert.strictEqual(calls.length, before, "Fresh cache must be reused without another Jira request.");
        console.log("Jira user cache refreshes after 24h before user-bound Assets and then reuses the fresh cache: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

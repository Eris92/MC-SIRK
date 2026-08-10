"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var factory = require("../server/core/jira-asset-service.js");

var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-user-scope-"));
var calls = 0;
var service = factory.createJiraAssetService({
    fs: fs,
    path: path,
    dataRoot: temp,
    integrations: {
        get: function () {
            return {
                url: "https://example.atlassian.net",
                email: "service@example.invalid",
                token: "SECRET",
                cloudId: "cloud-1",
                workspaceId: "workspace-1",
                aql: "objectType = Computer",
                hostnameAttribute: "Hostname",
                maxResults: 100,
                verifyTls: true
            };
        }
    },
    requestJson: function (options) {
        calls += 1;
        if (options.url.indexOf("/rest/api/3/users/search") >= 0) {
            return Promise.resolve([
                { accountId: "active-1", displayName: "Active User", active: true },
                { accountId: "inactive-1", displayName: "Inactive User", active: false }
            ]);
        }
        return Promise.reject(new Error("Unexpected request: " + options.url));
    }
});

(async function () {
    try {
        var active = await service.optionsFor({ control: "user" }, { JiraUserFilter: "active" }, false);
        assert.deepStrictEqual(active.items.map(function (item) { return item.value; }), ["active-1"],
            "Active scope must hide inactive Jira users by default.");
        assert.strictEqual(active.items[0].active, true);

        var all = await service.optionsFor({ control: "user" }, { JiraUserFilter: "all" }, false);
        assert.deepStrictEqual(all.items.map(function (item) { return item.value; }), ["active-1", "inactive-1"],
            "All scope must expose cached inactive Jira users without a second Jira fetch.");
        assert.strictEqual(all.items[1].active, false);
        assert.strictEqual(calls, 1, "Changing Active/All scope must reuse the same bounded 24h user cache.");

        var cache = fs.readFileSync(service.cachePath, "utf8");
        assert.ok(cache.indexOf("inactive-1") >= 0, "Cache must retain inactive identities for the All view.");
        assert.strictEqual(cache.indexOf("SECRET"), -1, "User cache must never contain the Jira credential.");
        console.log("Jira Active/All user scope reuses one secure bounded cache: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var factory = require(path.join(root, "server/core/jira-asset-service.js"));

function integration() {
    return {
        get: function () {
            return {
                url: "https://example.atlassian.net",
                email: "service@example.invalid",
                token: "SECRET",
                cloudId: "cloud-1",
                workspaceId: "workspace-1",
                verifyTls: true
            };
        }
    };
}

function user() {
    return {
        accountId: "acc-1",
        displayName: "User One",
        emailAddress: "user.one@example.invalid",
        active: true
    };
}

function asset(id, label, value) {
    return {
        id: id,
        objectKey: "KEY-" + id,
        label: label,
        objectType: { id: "type-device", name: "Device" },
        attributes: [{
            objectTypeAttributeId: "contact",
            objectAttributeValues: [value]
        }]
    };
}

(async function () {
    var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-reference-cache-"));
    try {
        var service = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: temp,
            integrations: integration(),
            requestJson: function (options) {
                if (options.url.indexOf("/rest/api/3/users/search") >= 0) return Promise.resolve([user()]);
                if (options.url.indexOf("/object/aql") >= 0) {
                    return Promise.resolve({
                        values: [
                            asset("1", "Assigned-Device", {
                                user: { accountId: "acc-1", displayName: "User One" },
                                displayValue: "User One"
                            }),
                            asset("2", "Unrelated-Text", {
                                value: "acc-1",
                                displayValue: "acc-1"
                            })
                        ],
                        objectTypeAttributes: [{ id: "contact", name: "Kontakt" }],
                        hasMoreResults: false,
                        isLast: true
                    });
                }
                return Promise.reject(new Error("Unexpected request: " + options.url));
            }
        });

        var variable = {
            control: "asset",
            jiraAsset: {
                aql: "Key is not EMPTY",
                labelAttribute: "Hostname",
                maxResults: 5000,
                userVariable: "JiraUser"
            }
        };

        var result = await service.optionsFor(variable, { JiraUser: "acc-1" }, true);
        assert.deepStrictEqual(result.items.map(function (item) { return item.value; }), ["Assigned-Device"],
            "Explicit Jira user references must survive compact caching even when the attribute name is not assignment-semantic.");

        var persisted = JSON.parse(fs.readFileSync(service.assetCachePath, "utf8"));
        assert.strictEqual(persisted.version, 4,
            "Assets cache schema v4 must invalidate v3 snapshots that lost non-semantic explicit reference identities.");
        assert.ok(persisted.queries["Key is not EMPTY"].entries[0].attributes[0].matchValues.indexOf("acc-1") >= 0,
            "Compact cache must retain explicit Jira user reference identities.");
        assert.strictEqual(persisted.queries["Key is not EMPTY"].entries[1].attributes[0].matchValues.length, 0,
            "Plain unrelated text on a non-assignment attribute must not become a user-binding match value.");

        var cachedService = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: temp,
            integrations: integration(),
            requestJson: function () {
                return Promise.reject(new Error("Fresh v4 cache should avoid Jira calls."));
            }
        });
        var cached = await cachedService.optionsFor(variable, { JiraUser: "acc-1" }, false);
        assert.deepStrictEqual(cached.items.map(function (item) { return item.value; }), ["Assigned-Device"],
            "Persisted compact cache must reproduce explicit-reference user binding without Jira access.");

        console.log("Jira compact cache preserves explicit user references: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

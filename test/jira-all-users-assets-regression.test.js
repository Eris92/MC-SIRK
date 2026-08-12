"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var factory = require(path.join(root, "server/core/jira-asset-service.js"));
var protocolSeed = fs.readFileSync(path.join(root, "seed/MyScripts/Jira/Jira Asset Protocol.ps1"), "utf8");
var assetCacheSeed = fs.readFileSync(path.join(root, "seed/MyScripts/Jira/Jira Cache Assets.ps1"), "utf8");

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

function user(index) {
    return {
        accountId: "acc-" + index,
        displayName: "User " + index,
        emailAddress: "user" + index + "@example.invalid",
        active: true
    };
}

function asset(id, label, type, owner) {
    return {
        id: id,
        objectKey: "KEY-" + id,
        label: label,
        objectType: { id: "type-" + type.toLowerCase(), name: type },
        attributes: [{
            objectTypeAttribute: { name: "Owner" },
            objectAttributeValues: [{ value: owner, displayValue: owner }]
        }]
    };
}

(async function () {
    assert.ok(/^# SirkJiraAssetAql: Key is not EMPTY$/m.test(protocolSeed),
        "Jira Asset Protocol must query the whole Assets workspace before user binding.");
    assert.ok(/^# SirkJiraAssetMaxResults: 5000$/m.test(protocolSeed),
        "Jira Asset Protocol must use the existing bounded maximum selector limit.");
    assert.ok(/^# SirkJiraAssetAql: Key is not EMPTY$/m.test(assetCacheSeed),
        "Jira Assets cache must populate the same workspace-wide snapshot.");
    assert.strictEqual(protocolSeed.indexOf('objectTypeAndChildren("Sprzęt użytkownika")'), -1,
        "Jira Asset Protocol must not restrict assigned assets to one object-type hierarchy.");

    var userTemp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-users-v2-"));
    try {
        fs.writeFileSync(path.join(userTemp, "jira-users-cache.json"), JSON.stringify({
            version: 1,
            fetchedAt: Date.now(),
            users: Array.from({ length: 1000 }, function (_, index) { return user(index); })
        }), "utf8");

        var userCalls = 0;
        var userService = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: userTemp,
            integrations: integration(),
            requestJson: function (options) {
                if (options.url.indexOf("/rest/api/3/users/search") < 0) {
                    return Promise.reject(new Error("Unexpected request: " + options.url));
                }
                userCalls++;
                var startAt = Number(new URL(options.url).searchParams.get("startAt"));
                if (startAt < 1000) {
                    return Promise.resolve(Array.from({ length: 100 }, function (_, index) { return user(startAt + index); }));
                }
                return Promise.resolve([user(1000)]);
            }
        });

        var users = await userService.listUsers(false, true);
        assert.strictEqual(users.items.length, 1001,
            "A fresh legacy 1000-user cache must be invalidated and repopulated past 1000 accounts.");
        assert.strictEqual(userCalls, 11,
            "User refresh must remain bounded and paginate until Jira returns a short page.");
        var persisted = JSON.parse(fs.readFileSync(userService.cachePath, "utf8"));
        assert.strictEqual(persisted.version, 2,
            "The corrected user cache schema must prevent reuse of the old 1000-user snapshot.");
    } finally {
        fs.rmSync(userTemp, { recursive: true, force: true });
    }

    var assetTemp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-all-assets-"));
    try {
        var aql = "";
        var assetService = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: assetTemp,
            integrations: integration(),
            requestJson: function (options) {
                if (options.url.indexOf("/rest/api/3/users/search") >= 0) return Promise.resolve([user(1)]);
                if (options.url.indexOf("/object/aql") >= 0) {
                    aql = options.json && options.json.qlQuery || "";
                    return Promise.resolve({
                        values: [
                            asset("1", "Laptop-01", "Komputer", "acc-1"),
                            asset("2", "Phone-01", "Telefon", "acc-1"),
                            asset("3", "Monitor-Other", "Monitor", "acc-2")
                        ],
                        hasMoreResults: false,
                        isLast: true
                    });
                }
                return Promise.reject(new Error("Unexpected request: " + options.url));
            }
        });

        var result = await assetService.optionsFor({
            control: "asset",
            jiraAsset: {
                aql: "Key is not EMPTY",
                labelAttribute: "Nazwa_sieciowa",
                maxResults: 5000,
                userVariable: "JiraUser"
            }
        }, { JiraUser: "acc-1" }, true);

        assert.strictEqual(aql, "Key is not EMPTY",
            "The backend must execute the script-owned workspace-wide AQL unchanged.");
        assert.deepStrictEqual(result.items.map(function (item) { return item.objectType; }).sort(), ["Komputer", "Telefon"],
            "User-bound Assets must include different Jira object types and exclude another user's asset.");
        assert.deepStrictEqual(result.items.map(function (item) { return item.value; }).sort(), ["Laptop-01", "Phone-01"],
            "Assets without the preferred hostname attribute must retain the Jira object label fallback.");
    } finally {
        fs.rmSync(assetTemp, { recursive: true, force: true });
    }

    console.log("Jira legacy 1000-user cache invalidation and workspace-wide user-bound Assets: OK");
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

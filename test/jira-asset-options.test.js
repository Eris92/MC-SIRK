"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var factory = require(path.join(root, "server/core/jira-asset-service.js"));
var automationServer = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
var automationClient = fs.readFileSync(path.join(root, "public/modules/automation/index.js"), "utf8");

function integration(overrides) {
    return {
        get: function () {
            return Object.assign({
                url: "https://example.atlassian.net",
                email: "service@example.invalid",
                token: "TOP-SECRET-TOKEN",
                cloudId: "cloud-1",
                workspaceId: "workspace-1",
                aql: "objectType = Computer",
                hostnameAttribute: "Hostname",
                maxResults: 100,
                verifyTls: true
            }, overrides || {});
        }
    };
}

function user(accountId, displayName, email) {
    return { accountId: accountId, displayName: displayName, emailAddress: email, active: true };
}

function asset(id, hostname, owner, model) {
    return {
        id: id,
        objectKey: "IT-" + id,
        label: hostname,
        attributes: [
            {
                objectTypeAttribute: { name: "Owner" },
                objectAttributeValues: [{ value: owner, displayValue: owner }]
            },
            {
                objectTypeAttribute: { name: "Hostname" },
                objectAttributeValues: [{ value: hostname, displayValue: hostname }]
            },
            {
                objectTypeAttribute: { name: "Model" },
                objectAttributeValues: [{ value: model, displayValue: model }]
            },
            {
                objectTypeAttribute: { name: "Serial Number" },
                objectAttributeValues: [{ value: "SN-" + id, displayValue: "SN-" + id }]
            }
        ]
    };
}

(async function () {
    var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-options-"));
    try {
        var calls = [];
        var service = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: temp,
            integrations: integration(),
            requestJson: function (options) {
                calls.push(options);
                if (options.url.indexOf("/rest/api/3/users/search") >= 0) {
                    return Promise.resolve([
                        user("acc-2", "Beta User", "beta@example.invalid"),
                        user("acc-1", "Alpha User", "alpha@example.invalid"),
                        user("acc-1", "Duplicate Alpha", "alpha2@example.invalid"),
                        { accountId: "disabled", displayName: "Disabled", active: false }
                    ]);
                }
                return Promise.reject(new Error("Unexpected request: " + options.url));
            }
        });

        var first = await service.listUsers(false);
        assert.strictEqual(first.stale, false);
        assert.deepStrictEqual(first.items.map(function (item) { return item.value; }), ["acc-1", "acc-2"],
            "Jira users must be active, deduplicated and sorted by display label.");
        assert.strictEqual(calls.length, 1, "A short Jira user page must finish without an extra request.");

        var cache = fs.readFileSync(service.cachePath, "utf8");
        assert.strictEqual(cache.indexOf("TOP-SECRET-TOKEN"), -1, "The Jira user cache must never persist the Jira token.");
        assert.ok(cache.indexOf("acc-1") >= 0, "The bounded cache must contain normalized user identity data.");

        var second = await service.listUsers(false);
        assert.strictEqual(second.items.length, 2);
        assert.strictEqual(calls.length, 1, "Fresh 24h cache must suppress duplicate Jira calls.");

        var fallbackCalls = [];
        var fallbackTemp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-fallback-"));
        try {
            var fallbackService = factory.createJiraAssetService({
                fs: fs,
                path: path,
                dataRoot: fallbackTemp,
                integrations: integration(),
                requestJson: function (options) {
                    fallbackCalls.push(options.url);
                    if (options.url.indexOf("/rest/api/3/users/search") >= 0) return Promise.reject(new Error("v3 unavailable"));
                    if (options.url.indexOf("/rest/api/2/users/search") >= 0) return Promise.resolve([user("acc-v2", "V2 User", "")]);
                    return Promise.reject(new Error("unexpected fallback"));
                }
            });
            var fallback = await fallbackService.listUsers(true);
            assert.strictEqual(fallback.items[0].value, "acc-v2", "User lookup must fall back from Jira v3 to v2 search.");
            assert.strictEqual(fallbackCalls.length, 2, "Fallback must stop after the first successful endpoint.");
        } finally {
            fs.rmSync(fallbackTemp, { recursive: true, force: true });
        }

        var stalePayload = JSON.parse(cache);
        stalePayload.fetchedAt = 1;
        fs.writeFileSync(service.cachePath, JSON.stringify(stalePayload), "utf8");
        var staleService = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: temp,
            integrations: integration(),
            requestJson: function () { return Promise.reject(new Error("Jira offline")); }
        });
        var stale = await staleService.listUsers(false);
        assert.strictEqual(stale.stale, true, "Expired cache must be a stale fallback when Jira is temporarily unavailable.");
        assert.strictEqual(stale.items.length, 2, "Stale fallback must retain the last bounded successful user list.");

        var assetTemp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-assets-"));
        try {
            var assetCalls = [];
            var assetService = factory.createJiraAssetService({
                fs: fs,
                path: path,
                dataRoot: assetTemp,
                integrations: integration(),
                requestJson: function (options) {
                    assetCalls.push(options);
                    if (options.url.indexOf("/rest/api/3/users/search") >= 0) {
                        return Promise.resolve([user("acc-1", "Alpha User", "alpha@example.invalid")]);
                    }
                    if (options.url.indexOf("/object/aql") >= 0) {
                        return Promise.resolve({ values: [
                            asset("1", "PC-ALPHA", "acc-1", "ThinkPad"),
                            asset("2", "PC-BETA", "acc-2", "EliteBook")
                        ] });
                    }
                    return Promise.reject(new Error("Unexpected request: " + options.url));
                }
            });
            var assets = await assetService.listAssets("acc-1");
            assert.strictEqual(assets.items.length, 1, "Asset options must be filtered by the selected Jira user identity.");
            assert.strictEqual(assets.items[0].value, "PC-ALPHA");
            assert.ok(assets.items[0].label.indexOf("ThinkPad") >= 0, "Asset label should reuse normalized model data.");
            var aqlCall = assetCalls.filter(function (call) { return call.url.indexOf("/object/aql") >= 0; })[0];
            assert.ok(aqlCall, "Assets must use the current POST /object/aql endpoint.");
            assert.strictEqual(aqlCall.method, "POST");
            assert.strictEqual(aqlCall.json.qlQuery, "objectType = Computer", "Assets must reuse the configured AQL.");
            assert.ok(aqlCall.url.indexOf("cloud-1") >= 0 && aqlCall.url.indexOf("workspace-1") >= 0,
                "Configured cloudId/workspaceId must avoid unnecessary discovery requests.");
        } finally {
            fs.rmSync(assetTemp, { recursive: true, force: true });
        }

        assert.ok(automationServer.indexOf('asset === "variable-options"') >= 0,
            "My Scripts backend must expose one dynamic variable option endpoint.");
        assert.ok(automationServer.indexOf('admin.hasSystemCredential(optionScript.path, "jira")') >= 0,
            "Dynamic Jira options must require the script's Jira profile assignment.");
        assert.ok(automationClient.indexOf('module.api.post("variable-options"') >= 0,
            "My Scripts must connect the shared #253 dialog provider to the backend option owner.");
        assert.strictEqual(automationClient.indexOf("window.prompt"), -1,
            "Jira migration must not reintroduce a browser prompt or inline legacy form.");

        console.log("Jira cached user options, v2 fallback, stale cache, dependent Assets AQL and profile gate: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

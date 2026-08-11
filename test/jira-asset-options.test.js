"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var factory = require(path.join(root, "server/core/jira-asset-service.js"));
var integrationFactory = require(path.join(root, "server/core/integration-service.js"));
var scriptLibraryFactory = require(path.join(root, "server/core/script-confirmation-library.js"));
var automationServer = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
var automationClient = fs.readFileSync(path.join(root, "public/modules/automation/index.js"), "utf8");
var adminIntegrations = fs.readFileSync(path.join(root, "web/admin/integrations.js"), "utf8");

function integration(overrides) {
    return {
        get: function () {
            return Object.assign({
                url: "https://example.atlassian.net",
                email: "service@example.invalid",
                token: "TOP-SECRET-TOKEN",
                cloudId: "cloud-1",
                workspaceId: "workspace-1",
                projectKey: "LEGACY",
                aql: "objectType = LegacyGlobalScope",
                hostnameAttribute: "LegacyHostname",
                maxResults: 10,
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
        var readiness = integrationFactory.createIntegrationService({
            settings: {
                read: function () {
                    return { integrations: { jira: { url: "https://example.atlassian.net", email: "service@example.invalid" } } };
                }
            },
            secrets: {
                get: function () { return { jiraToken: "TOP-SECRET-TOKEN" }; }
            },
            parent: {}
        }).configured();
        assert.strictEqual(readiness.jira, true,
            "Jira readiness must require connection credentials only, not one global project key.");

        ["Project key", "Hostname attribute", "Asset field ID", "Assets AQL scope", "Max asset results", "Enable Jira Assets/CMDB"].forEach(function (label) {
            assert.strictEqual(adminIntegrations.indexOf(label), -1,
                "Admin Jira integration must not own script/query restriction: " + label);
        });
        assert.ok(adminIntegrations.indexOf("Assets workspace ID") >= 0 && adminIntegrations.indexOf("Cloud ID") >= 0,
            "Connection/discovery identifiers must remain available in the global Jira profile.");
        assert.ok(adminIntegrations.indexOf("Verify Jira TLS certificate") >= 0,
            "TLS verification remains connection security and must stay global.");

        var policyRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-script-policy-"));
        try {
            fs.writeFileSync(path.join(policyRoot, "Policy.ps1"), [
                "# Policy",
                "# VariableAssetRequired: $PcName, Asset",
                "# SirkWorkflow: JiraAssetProtocol",
                "# SirkJiraAssetAql: objectType = Computer",
                "# SirkJiraAssetLabelAttribute: Hostname",
                "# SirkJiraAssetMaxResults: 25",
                "",
                "Write-Output 'ok'"
            ].join("\n"), "utf8");
            var policyLibrary = scriptLibraryFactory.createScriptLibrary({
                fs: fs,
                path: path,
                root: policyRoot,
                readOnly: true
            });
            var policyScript = policyLibrary.getScript("Policy.ps1", false);
            var policyVariable = policyScript.variables.filter(function (item) { return item.control === "asset"; })[0];
            assert.ok(policyScript.extraHeaders.indexOf("SirkWorkflow: JiraAssetProtocol") >= 0,
                "Sirk workflow metadata must remain available to backend consumers.");
            assert.deepStrictEqual(policyVariable.jiraAsset, {
                aql: "objectType = Computer",
                labelAttribute: "Hostname",
                maxResults: 25
            }, "Jira asset policy must be owned by script metadata.");
        } finally {
            fs.rmSync(policyRoot, { recursive: true, force: true });
        }

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
            "Jira users must be instance-wide, active, deduplicated and sorted by display label.");
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
            var firstPage = [asset("1", "PC-ALPHA", "acc-1", "ThinkPad")];
            for (var assetIndex = 2; assetIndex <= 500; assetIndex++) {
                firstPage.push(asset(String(assetIndex), "PC-OTHER-" + assetIndex, "acc-2", "Other"));
            }
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
                        if (options.url.indexOf("startAt=0") >= 0) return Promise.resolve({ values: firstPage, total: 501 });
                        if (options.url.indexOf("startAt=500") >= 0) {
                            return Promise.resolve({ values: [asset("501", "PC-OMEGA", "acc-1", "Latitude")], total: 501 });
                        }
                    }
                    return Promise.reject(new Error("Unexpected request: " + options.url));
                }
            });
            var assetVariable = {
                control: "asset",
                jiraAsset: {
                    aql: "objectType = Computer",
                    labelAttribute: "Hostname",
                    maxResults: 10
                }
            };
            var assets = await assetService.listAssets("acc-1", assetVariable);
            assert.deepStrictEqual(assets.items.map(function (item) { return item.value; }), ["PC-ALPHA", "PC-OMEGA"],
                "Asset options must paginate the script AQL and filter every page by the selected Jira user identity.");
            var aqlCalls = assetCalls.filter(function (call) { return call.url.indexOf("/object/aql") >= 0; });
            assert.strictEqual(aqlCalls.length, 2, "Asset provider must paginate beyond the first Atlassian page when required.");
            assert.strictEqual(aqlCalls[0].method, "POST");
            assert.strictEqual(aqlCalls[0].json.qlQuery, "objectType = Computer",
                "Asset provider must use script-owned AQL instead of legacy global Jira AQL.");
            assert.ok(aqlCalls[0].url.indexOf("maxResults=500") >= 0 && aqlCalls[1].url.indexOf("startAt=500") >= 0,
                "Asset pagination must use a bounded provider page size and advance startAt.");
            assert.ok(aqlCalls[0].url.indexOf("cloud-1") >= 0 && aqlCalls[0].url.indexOf("workspace-1") >= 0,
                "Configured cloudId/workspaceId must avoid unnecessary discovery requests.");
            await assert.rejects(function () {
                return assetService.listAssets("acc-1", { control: "asset" });
            }, /query is not configured/, "Dynamic Assets must fail closed when the script does not declare its Jira query scope.");
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

        console.log("Jira connection-only readiness, script-owned Assets scope, pagination and cached users: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

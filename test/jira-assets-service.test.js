"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var factory = require("../server/core/jira-assets-service.js");

async function main() {
    var temp = fs.mkdtempSync(path.join(os.tmpdir(), "mc-sirk-jira-assets-"));
    var calls = [];
    var config = {
        url: "https://example.atlassian.net",
        email: "admin@example.com",
        token: "super-secret-token",
        aql: "objectType = Computer",
        hostnameAttribute: "Hostname",
        maxResults: 100,
        verifyTls: true
    };
    var assetsResponse = {
        values: [
            {
                id: "101",
                objectKey: "PC-101",
                label: "Laptop Alpha",
                attributes: [
                    { objectTypeAttribute: { name: "Hostname" }, objectAttributeValues: [{ value: "alpha-pc" }] },
                    { objectTypeAttribute: { name: "Model" }, objectAttributeValues: [{ value: "ThinkPad T14" }] },
                    { objectTypeAttribute: { name: "Serial Number" }, objectAttributeValues: [{ value: "SER-101" }] },
                    { objectTypeAttribute: { name: "Inventory Number" }, objectAttributeValues: [{ value: "INV-101" }] },
                    { objectTypeAttribute: { name: "Assigned User" }, objectAttributeValues: [{ user: { accountId: "u1", displayName: "Jan Kowalski", emailAddress: "jan@example.com" } }] }
                ]
            },
            {
                id: "202",
                objectKey: "PC-202",
                label: "Laptop Beta",
                attributes: [
                    { objectTypeAttribute: { name: "Hostname" }, objectAttributeValues: [{ value: "beta-pc" }] },
                    { objectTypeAttribute: { name: "Assigned User" }, objectAttributeValues: [{ user: { accountId: "u2", displayName: "Anna Nowak" } }] }
                ]
            }
        ]
    };
    var fakeHttp = {
        requestJson: function (options) {
            calls.push({ url: options.url, method: options.method, json: options.json, headers: options.headers });
            if (options.url.indexOf("/rest/api/3/users/search") >= 0) {
                return Promise.resolve([
                    { accountId: "u1", displayName: "Jan Kowalski", emailAddress: "jan@example.com", active: true, accountType: "atlassian" },
                    { accountId: "u2", displayName: "Anna Nowak", active: true, accountType: "atlassian" },
                    { accountId: "app", displayName: "App", active: true, accountType: "app" }
                ]);
            }
            if (options.url.indexOf("/_edge/tenant_info") >= 0) return Promise.resolve({ cloudId: "cloud-1" });
            if (options.url.indexOf("/rest/servicedeskapi/assets/workspace") >= 0) return Promise.resolve({ values: [{ workspaceId: "workspace-1" }] });
            if (options.url.indexOf("/v1/object/aql") >= 0) return Promise.resolve(assetsResponse);
            return Promise.reject(new Error("Unexpected URL: " + options.url));
        }
    };
    var context = {
        fs: fs,
        path: path,
        dataRoot: temp,
        integrations: { get: function (name) { return name === "jira" ? config : {}; } }
    };
    var service = factory.createJiraAssetsService({ context: context, httpClient: fakeHttp });

    var users = await service.users(false);
    assert.deepStrictEqual(users.map(function (user) { return user.accountId; }), ["u2", "u1"],
        "User cache must keep active human Jira users and sort them deterministically by display name.");
    assert.strictEqual(calls.filter(function (call) { return call.url.indexOf("/users/search") >= 0; }).length, 1,
        "Initial Jira user discovery must use one bounded page for this fixture.");
    await service.users(false);
    assert.strictEqual(calls.filter(function (call) { return call.url.indexOf("/users/search") >= 0; }).length, 1,
        "Fresh 24h user cache must prevent a duplicate Jira users request.");
    var cacheFile = path.join(temp, "cache", "jira-users.json");
    assert.ok(fs.existsSync(cacheFile), "Jira users cache must persist under the plugin dataRoot.");
    assert.strictEqual(fs.readFileSync(cacheFile, "utf8").indexOf("super-secret-token"), -1,
        "User cache must never persist the Jira API token.");

    var userOptions = await service.variableOptions(
        { extraHeaders: ["SirkWorkflow: JiraAssetProtocol"] },
        { name: "JiraUser", control: "user" },
        {}
    );
    assert.ok(userOptions.some(function (item) { return item.value === "u1" && item.label.indexOf("Jan Kowalski") >= 0; }),
        "Jira user provider must expose stable accountId values and human labels.");

    var assetState = await service.assetsForUser("u1");
    assert.deepStrictEqual(assetState.assets.map(function (asset) { return asset.id; }), ["101"],
        "When configured AQL has no user placeholder, local ownership validation must drop assets assigned to another user.");
    assert.strictEqual(assetState.assets[0].hostname, "alpha-pc");
    assert.strictEqual(assetState.assets[0].model, "ThinkPad T14");
    assert.strictEqual(assetState.assets[0].serial, "SER-101");
    assert.strictEqual(assetState.assets[0].inventory, "INV-101");
    var aqlCall = calls.filter(function (call) { return call.url.indexOf("/v1/object/aql") >= 0; })[0];
    assert.ok(aqlCall && aqlCall.method === "POST" && aqlCall.json.qlQuery === "objectType = Computer",
        "Assets lookup must use the current Cloud POST /v1/object/aql contract with the admin-configured AQL scope.");
    assert.ok(aqlCall.url.indexOf("/ex/jira/cloud-1/jsm/assets/workspace/workspace-1/v1/object/aql") >= 0,
        "Assets lookup must use discovered cloudId/workspaceId in the Atlassian Cloud gateway path.");

    var assetOptions = await service.variableOptions(
        { extraHeaders: ["SirkWorkflow: JiraAssetProtocol"] },
        { name: "PcName", control: "asset" },
        { JiraUser: "u1" }
    );
    assert.deepStrictEqual(assetOptions.map(function (item) { return item.value; }), ["101"],
        "Dependent asset options must be bounded to the selected Jira user.");

    var request = {
        id: "request_252_demo",
        requester: { id: "user/domain/admin", name: "Admin" },
        payload: { scriptPath: "Jira/Jira Asset Protocol.ps1" }
    };
    var executedEnvironment = null;
    var result = await service.executeProtocol({
        variableValues: {
            JiraUser: "u1",
            PcName: "101",
            IsTransferProtocol: true,
            ItPerson: "u2"
        }
    }, request, function (environment) {
        executedEnvironment = environment;
        return Promise.resolve({ output: "PowerShell protocol renderer completed.", message: "OK" });
    });
    assert.ok(executedEnvironment && executedEnvironment.MYSCRIPTS_JIRA_PROTOCOL_DATA_B64,
        "Protocol execution must pass normalized data to the server-side script through a dedicated non-secret environment value.");
    var protocol = JSON.parse(Buffer.from(executedEnvironment.MYSCRIPTS_JIRA_PROTOCOL_DATA_B64, "base64").toString("utf8"));
    assert.strictEqual(protocol.user, "Jan Kowalski");
    assert.strictEqual(protocol.itPerson, "Anna Nowak");
    assert.strictEqual(protocol.asset.hostname, "alpha-pc");
    assert.strictEqual(protocol.mode, "transfer");
    assert.ok(result.output.indexOf("SIRK_ARTIFACT:") >= 0,
        "Completed Jira protocol output must expose a typed artifact marker instead of a filesystem path.");
    var progress = service.progress(request.id);
    assert.strictEqual(progress.percent, 100);
    assert.strictEqual(progress.status, "completed");
    var artifact = service.resolveArtifact(request.id, "pdf");
    var pdf = fs.readFileSync(artifact.path);
    assert.strictEqual(pdf.slice(0, 8).toString("binary"), "%PDF-1.4",
        "Jira protocol must produce an actual PDF document.");
    ["protocol.json", "protocol.txt", "protocol.html", "protocol.pdf", "meta.json"].forEach(function (name) {
        assert.ok(fs.existsSync(path.join(temp, "artifacts", "jira-protocol", request.id, name)),
            "Protocol artifact set must contain " + name + ".");
    });
    var artifactText = fs.readFileSync(path.join(temp, "artifacts", "jira-protocol", request.id, "protocol.json"), "utf8");
    assert.strictEqual(artifactText.indexOf("super-secret-token"), -1,
        "Protocol artifacts must never contain the Jira API token.");

    var scoped = service._test.scopedAql({ aql: 'objectType = Computer AND Owner = "{user}"' }, { accountId: 'abc" OR objectType IS NOT EMPTY' });
    assert.strictEqual(scoped.userScoped, true);
    assert.ok(scoped.query.indexOf('abc\\" OR objectType IS NOT EMPTY') >= 0,
        "AQL placeholders must escape attacker-controlled Jira account identifiers instead of accepting raw query fragments.");

    fs.rmSync(temp, { recursive: true, force: true });
    console.log("Jira Assets users/cache/AQL ownership/progress/PDF artifact contract: OK");
}

main().catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

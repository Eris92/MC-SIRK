"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var root = path.resolve(__dirname, "..");
var runnerPath = path.join(root, "seed", "MyScripts", "_Scheduler", "jira-cache-refresh.js");
var installerPath = path.join(root, "seed", "MyScripts", "_Scheduler", "Install Jira Cache Scheduler.bat");
var runner = require(runnerPath);
var secretFactory = require(path.join(root, "server", "core", "secret-store.js"));
var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-scheduler-"));

fs.writeFileSync(path.join(temp, "settings.json"), JSON.stringify({
    integrations: { jira: {
        url: "https://example.atlassian.net",
        email: "scheduler@example.invalid",
        cloudId: "cloud-1",
        workspaceId: "workspace-1",
        verifyTls: true
    } }
}), "utf8");
secretFactory.createSecretStore({
    fs: fs,
    path: path,
    dataPath: path.join(temp, "secrets.json"),
    keyPath: path.join(temp, ".secret.key")
}).set("integration-secrets", { jiraToken: "TEST-SCHEDULER-TOKEN" });

var installer = fs.readFileSync(installerPath, "utf8");
assert.ok(installer.indexOf("New-ScheduledTaskTrigger") >= 0 && installer.indexOf("New-TimeSpan -Hours 1") >= 0,
    "The BAT installer must create an hourly Task Scheduler trigger.");
assert.ok(installer.indexOf("-UserId 'SYSTEM'") >= 0 && installer.indexOf("Start-ScheduledTask") >= 0,
    "The scheduled refresh must run as SYSTEM and start once immediately after registration.");
assert.strictEqual(installer.indexOf("TEST-SCHEDULER-TOKEN"), -1,
    "The scheduler installer must never contain Jira credentials.");

var calls = [];
runner.refresh({
    dataRoot: temp,
    pluginRoot: root,
    fallbackSettings: "",
    requestJson: function (options) {
        calls.push(options.url);
        if (options.url.indexOf("/rest/api/3/users/search") >= 0) {
            return Promise.resolve([{ accountId: "acc-1", displayName: "Scheduler User", active: true }]);
        }
        if (options.url.indexOf("/object/aql") >= 0) {
            return Promise.resolve({
                values: [{
                    id: "1",
                    objectKey: "IT-1",
                    attributes: [{
                        objectTypeAttribute: { name: "Nazwa_sieciowa" },
                        objectAttributeValues: [{ displayValue: "PC-SCHEDULER" }]
                    }]
                }],
                total: 1,
                isLast: true
            });
        }
        return Promise.reject(new Error("Unexpected scheduler request: " + options.url));
    }
}).then(function (result) {
    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.users, 1);
    assert.strictEqual(result.assets, 1);
    assert.strictEqual(fs.existsSync(path.join(temp, "jira-users-cache.json")), true,
        "The scheduler must refresh the existing user JSON cache location.");
    assert.strictEqual(fs.existsSync(path.join(temp, "jira-assets-cache.json")), true,
        "The scheduler must refresh the existing asset JSON cache location.");
    assert.strictEqual(fs.existsSync(path.join(temp, "settings", "Jira", "jira-users-cache.json")), false,
        "The scheduler must not relocate JSON cache files under settings/Jira.");
    assert.ok(calls.some(function (url) { return url.indexOf("/rest/api/3/users/search") >= 0; }));
    assert.ok(calls.some(function (url) { return url.indexOf("/object/aql") >= 0; }));
    console.log("Hourly Jira cache scheduler runner and credential-safe BAT registration contract: OK");
}).finally(function () {
    fs.rmSync(temp, { recursive: true, force: true });
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var createService = require(path.join(root, "server/core/script-admin-service.js")).createScriptAdminService;
var executorSource = fs.readFileSync(path.join(root, "server/core/server-script-executor.js"), "utf8");

var stored = Object.create(null);
var settings = {
    ad: { domain: "", login: "" },
    entra: { tenantId: "", clientId: "" },
    jira: { url: "" },
    defender: { tenantId: "", clientId: "" },
    zabbix: { url: "" }
};
var readiness = { ad: false, entra: false, jira: false, defender: false, zabbix: false };
var context = {
    secrets: {
        get: function (name) { return stored[name]; },
        set: function (name, value) { stored[name] = JSON.parse(JSON.stringify(value)); }
    },
    integrations: {
        configured: function () { return Object.assign({}, readiness); },
        readSettings: function () { return JSON.parse(JSON.stringify(settings)); }
    }
};
var library = {
    getScript: function (relativePath) {
        if (String(relativePath) !== "folder/test.ps1") return null;
        return { path: "folder/test.ps1", secretVariables: [] };
    }
};
var service = createService({ context: context, library: library, namespace: "script-secrets.myscripts" });
var admin = { siteadmin: 0xFFFFFFFF };

var before = service.getSystemCredentialState(admin, "folder/test.ps1");
assert.strictEqual(before.profiles.length, 5, "All canonical system credential profiles must be listed regardless of readiness.");
assert.ok(before.profiles.every(function (profile) { return profile.configured === false && profile.selected === false; }),
    "Unconfigured profiles must remain visible and initially unselected.");

var saved = service.saveSystemCredentials(admin, "folder/test.ps1", ["jira", "ad", "unknown", "jira"]);
var selected = saved.profiles.filter(function (profile) { return profile.selected; }).map(function (profile) { return profile.name; }).sort();
assert.deepStrictEqual(selected, ["ad", "jira"],
    "Canonical unconfigured profiles must be assignable while unknown names are rejected and duplicates removed.");
assert.deepStrictEqual(stored["script-secrets.myscripts.system-credentials"]["folder/test.ps1"].slice().sort(), ["ad", "jira"],
    "Assignments must persist independently from global credential readiness.");
assert.strictEqual(service.hasSystemCredential("folder/test.ps1", "jira"), true,
    "Assigned unconfigured profile must remain discoverable to runtime policy.");

readiness.jira = true;
settings.jira.url = "https://example.atlassian.net";
var after = service.getSystemCredentialState(admin, "folder/test.ps1");
var jira = after.profiles.filter(function (profile) { return profile.name === "jira"; })[0];
assert.strictEqual(jira.selected, true, "Assignment must survive later global configuration.");
assert.strictEqual(jira.configured, true, "Readiness is a separate state from assignment.");

assert.ok(executorSource.indexOf('var readiness = context.integrations.configured();') >= 0,
    "Runtime must evaluate global readiness before system credential injection.");
assert.ok(executorSource.indexOf("is assigned but not configured globally") >= 0,
    "Assigned but unconfigured profiles must fail closed with a controlled runtime error.");
assert.ok(executorSource.indexOf('selected.forEach(function (name)') >= 0,
    "Every persisted assignment, including legacy unknown values, must pass the fail-closed readiness guard.");

console.log("System credential assignment is independent from readiness and runtime fails closed: OK");
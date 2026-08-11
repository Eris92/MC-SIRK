"use strict";

var assert = require("assert");
var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var createService = require(path.join(root, "server/core/script-admin-service.js")).createScriptAdminService;
var createExecutor = require(path.join(root, "server/core/server-script-executor.js")).createServerScriptExecutor;

var assignmentNamespace = "script-secrets.myscripts.system-credentials";
var stored = Object.create(null);
var settings = {
    ad: { domain: "", login: "" },
    entra: { tenantId: "", clientId: "" },
    jira: { url: "" },
    defender: { tenantId: "", clientId: "" },
    zabbix: { url: "" }
};
var integrationValues = {
    jira: {
        url: "https://example.atlassian.net",
        email: "jira@example.test",
        token: "jira-token",
        projectKey: "IT",
        workspaceId: "workspace-1",
        cloudId: "cloud-1"
    }
};
var readiness = { ad: false, entra: false, jira: false, defender: false, zabbix: false };
var context = {
    fs: fs,
    nativePath: path,
    pluginRoot: root,
    settings: {
        read: function () { return { modules: { myscripts: { runTimeoutSeconds: 60 } } }; }
    },
    secrets: {
        get: function (name) { return stored[name]; },
        set: function (name, value) { stored[name] = JSON.parse(JSON.stringify(value)); }
    },
    integrations: {
        configured: function () { return Object.assign({}, readiness); },
        readSettings: function () { return JSON.parse(JSON.stringify(settings)); },
        get: function (name) { return JSON.parse(JSON.stringify(integrationValues[name] || {})); }
    }
};
var library = {
    getScript: function (relativePath) {
        if (String(relativePath) !== "folder/test.ps1") return null;
        return {
            path: "folder/test.ps1",
            label: "Test",
            shell: "powershell",
            hash: "test-hash",
            variables: [],
            secretVariables: []
        };
    }
};
var admin = {
    siteadmin: 0xFFFFFFFF,
    secretValues: function () { return {}; }
};
var service = createService({ context: context, library: library, namespace: "script-secrets.myscripts" });
var executor = createExecutor({
    context: context,
    library: library,
    admin: admin,
    assignmentNamespace: assignmentNamespace
});

var before = service.getSystemCredentialState(admin, "folder/test.ps1");
assert.strictEqual(before.profiles.length, 5, "All canonical system credential profiles must be listed regardless of readiness.");
assert.ok(before.profiles.every(function (profile) { return profile.configured === false && profile.selected === false; }),
    "Unconfigured profiles must remain visible and initially unselected.");

var saved = service.saveSystemCredentials(admin, "folder/test.ps1", ["jira", "ad", "unknown", "jira"]);
var selected = saved.profiles.filter(function (profile) { return profile.selected; }).map(function (profile) { return profile.name; }).sort();
assert.deepStrictEqual(selected, ["ad", "jira"],
    "Canonical unconfigured profiles must be assignable while unknown names are rejected and duplicates removed.");
assert.deepStrictEqual(stored[assignmentNamespace]["folder/test.ps1"].slice().sort(), ["ad", "jira"],
    "Assignments must persist independently from global credential readiness.");
assert.strictEqual(service.hasSystemCredential("folder/test.ps1", "jira"), true,
    "Assigned unconfigured profile must remain discoverable to runtime policy.");

var workflowPath = "Jira/Jira Asset Protocol.ps1";
var workflowLibrary = {
    getScript: function (relativePath) {
        if (String(relativePath) !== workflowPath) return null;
        return { path: workflowPath, extraHeaders: ["SirkWorkflow: JiraAssetProtocol"], variables: [], secretVariables: [] };
    }
};
var workflowService = createService({ context: context, library: workflowLibrary, namespace: "script-secrets.myscripts" });
stored[assignmentNamespace]["jira/jira asset protocol.ps1"] = ["jira"];
workflowPath = "Jira/Protokoły/Jira Asset Protocol.ps1";
assert.strictEqual(workflowService.hasSystemCredential(workflowPath, "jira"), true,
    "A workflow script moved into a subfolder must retain its uniquely matching legacy system credential assignment.");
assert.deepStrictEqual(stored[assignmentNamespace]["@workflow:jiraassetprotocol"], ["jira"],
    "A moved workflow must migrate its legacy path assignment to a stable workflow identity.");

service.saveSystemCredentials(admin, "folder/test.ps1", ["jira"]);
var originalExecFile = childProcess.execFile;
var execCalls = [];
childProcess.execFile = function (file, args, options, callback) {
    execCalls.push({ file: file, args: args, options: options });
    callback(null, "ok", "");
};

executor.execute({
    scriptPath: "folder/test.ps1",
    scriptHash: "test-hash",
    variableValues: {}
}, { id: "request-unconfigured", requester: { name: "Admin" } }).then(function () {
    throw new Error("Assigned but unconfigured system credentials must not execute.");
}, function (error) {
    assert.ok(/System credential profile 'jira' is assigned but not configured globally\./.test(String(error && error.message || error)),
        "Assigned but unconfigured profile must fail with a controlled readiness error.");
    assert.strictEqual(execCalls.length, 0,
        "Runtime must fail before spawning the script when an assigned profile is not configured globally.");

    readiness.jira = true;
    settings.jira.url = integrationValues.jira.url;
    return executor.execute({
        scriptPath: "folder/test.ps1",
        scriptHash: "test-hash",
        variableValues: {}
    }, { id: "request-configured", requester: { name: "Admin" } });
}).then(function (result) {
    assert.strictEqual(result.exitCode, 0, "Configured assigned profile must allow execution.");
    assert.strictEqual(execCalls.length, 1, "Configured execution must spawn exactly once.");
    var environment = execCalls[0].options.env;
    assert.strictEqual(environment.MYSCRIPTS_JIRA_URL, integrationValues.jira.url,
        "Configured Jira URL must be injected only at execution time.");
    assert.strictEqual(environment.MYSCRIPTS_JIRA_EMAIL, integrationValues.jira.email,
        "Configured Jira identity must be injected into the script environment.");
    assert.strictEqual(environment.MYSCRIPTS_JIRA_TOKEN, integrationValues.jira.token,
        "Configured Jira token must stay server-side and be injected only into the child process environment.");
    assert.strictEqual(environment.MYSCRIPTS_AD_PASSWORD, undefined,
        "Unassigned system credential profiles must not leak into the child process environment.");

    var after = service.getSystemCredentialState(admin, "folder/test.ps1");
    var jira = after.profiles.filter(function (profile) { return profile.name === "jira"; })[0];
    assert.strictEqual(jira.selected, true, "Assignment must survive later global configuration.");
    assert.strictEqual(jira.configured, true, "Readiness is a separate state from assignment.");

    stored[assignmentNamespace]["folder/test.ps1"] = ["legacy-unknown"];
    return executor.execute({
        scriptPath: "folder/test.ps1",
        scriptHash: "test-hash",
        variableValues: {}
    }, { id: "request-unknown", requester: { name: "Admin" } }).then(function () {
        throw new Error("Unknown persisted system credential assignment must fail closed.");
    }, function (error) {
        assert.ok(/legacy-unknown/.test(String(error && error.message || error)),
            "Unknown persisted assignment must fail closed without attempting execution.");
        assert.strictEqual(execCalls.length, 1,
            "Unknown persisted assignment must fail before spawning another process.");
    });
}).then(function () {
    console.log("System credential assignment is independent from readiness and runtime fails closed: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
}).then(function () {
    childProcess.execFile = originalExecFile;
});

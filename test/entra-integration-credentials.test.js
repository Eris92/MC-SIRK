"use strict";

var assert = require("assert");
var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var createAdmin = require(path.join(root, "server/core/script-admin-service.js")).createScriptAdminService;
var createExecutor = require(path.join(root, "server/core/server-script-executor.js")).createServerScriptExecutor;

var entraPath = "Entra ID/druk/Sprawdzanie_licencji.ps1";
var otherPath = "Other/report.ps1";
var scripts = {};
scripts[entraPath] = {
    path: entraPath,
    label: "Raport z licencji",
    shell: "powershell",
    hash: "entra-report-hash",
    extraHeaders: [],
    variables: [
        { name: "TenantID", label: "Tenant ID", required: true, control: "text", defaultValue: "" }
    ],
    secretVariables: [
        { name: "ClientID", label: "Client ID", required: true },
        { name: "ClientSecret", label: "Client Secret", required: true }
    ]
};
scripts[otherPath] = {
    path: otherPath,
    label: "Other report",
    shell: "powershell",
    hash: "other-report-hash",
    extraHeaders: [],
    variables: [],
    secretVariables: [
        { name: "ClientSecret", label: "Client Secret", required: true }
    ]
};

var stored = Object.create(null);
var readiness = {
    ad: false,
    entra: true,
    entraClientSecret: true,
    jira: false,
    sms: false,
    smtp: false,
    defender: false,
    zabbix: false
};
var entra = {
    tenantId: "tenant-global",
    clientId: "client-global",
    clientSecret: "secret-global"
};
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
        readSettings: function () {
            return {
                ad: {}, entra: { tenantId: entra.tenantId, clientId: entra.clientId }, jira: {}, sms: {}, smtp: {}, defender: {}, zabbix: {}
            };
        },
        get: function (name) {
            return name === "entra" ? Object.assign({}, entra) : {};
        }
    }
};
var library = {
    getScript: function (relativePath) { return scripts[String(relativePath)] || null; }
};
var user = { siteadmin: 0xFFFFFFFF };
var admin = createAdmin({ context: context, library: library, namespace: "script-secrets.myscripts" });
var executor = createExecutor({
    context: context,
    library: library,
    admin: admin,
    assignmentNamespace: "script-secrets.myscripts.system-credentials"
});

var state = admin.getSystemCredentialState(user, entraPath);
var entraProfile = state.profiles.filter(function (profile) { return profile.name === "entra"; })[0];
assert.ok(entraProfile && entraProfile.selected === true,
    "Scripts under the Entra ID namespace must automatically use the global Entra profile.");
assert.strictEqual(entraProfile.required, true,
    "The Entra namespace credential dependency must be reported as required rather than a per-script choice.");
assert.deepStrictEqual(admin.getSecretState(user, entraPath).variables, [],
    "Entra-backed tenant/client credentials must not be presented as per-script secret inputs.");
assert.strictEqual(stored["script-secrets.myscripts"], undefined,
    "Reading Entra integration-backed credentials must not create a per-script secret store entry.");

var originalExecFile = childProcess.execFile;
var execCalls = [];
childProcess.execFile = function (file, args, options, callback) {
    execCalls.push({ file: file, args: args, options: options });
    callback(null, "ok", "");
};

executor.execute({
    scriptPath: entraPath,
    scriptHash: "entra-report-hash",
    variableValues: {}
}, { id: "entra-request", requester: { id: "user/admin", name: "admin" } }).then(function (result) {
    assert.strictEqual(result.exitCode, 0, "Configured global Entra credentials must allow execution.");
    assert.strictEqual(execCalls.length, 1, "The Entra report must spawn exactly one child process.");

    var call = execCalls[0];
    assert.strictEqual(call.options.env.MYSCRIPTS_ENTRA_TENANT_ID, entra.tenantId);
    assert.strictEqual(call.options.env.MYSCRIPTS_ENTRA_CLIENT_ID, entra.clientId);
    assert.strictEqual(call.options.env.MYSCRIPTS_ENTRA_CLIENT_SECRET, entra.clientSecret);

    var encoded = call.args[call.args.length - 1];
    var wrapper = Buffer.from(encoded, "base64").toString("utf16le");
    assert.ok(wrapper.indexOf("$TenantID='tenant-global'") >= 0,
        "The existing TenantID script variable must receive the global Entra tenant ID.");
    assert.ok(wrapper.indexOf("$ClientID='client-global'") >= 0,
        "The existing ClientID script secret variable must receive the global Entra client ID.");
    assert.ok(wrapper.indexOf("$ClientSecret='secret-global'") >= 0,
        "The existing ClientSecret script variable must receive the global Entra client secret.");
    assert.strictEqual(stored["script-secrets.myscripts"], undefined,
        "Execution must not persist a duplicate per-script copy of Entra credentials.");

    readiness.entra = false;
    readiness.entraClientSecret = false;
    return executor.execute({
        scriptPath: entraPath,
        scriptHash: "entra-report-hash",
        variableValues: {}
    }, { id: "entra-request-unconfigured", requester: { id: "user/other", name: "other" } }).then(function () {
        throw new Error("An incomplete Entra integration must fail closed.");
    }, function (error) {
        assert.ok(/System credential profile 'entra' is assigned but not configured globally\./.test(String(error && error.message || error)),
            "Missing global Entra configuration must return the controlled system-credential readiness error.");
        assert.strictEqual(execCalls.length, 1,
            "An incomplete Entra integration must fail before another process is spawned.");
    });
}).then(function () {
    readiness.entra = true;
    readiness.entraClientSecret = true;
    return executor.execute({
        scriptPath: otherPath,
        scriptHash: "other-report-hash",
        variableValues: {}
    }, { id: "other-request", requester: { id: "user/admin", name: "admin" } }).then(function () {
        throw new Error("Non-Entra scripts must not inherit global Entra credentials implicitly.");
    }, function (error) {
        assert.ok(/Configure credential Client Secret for this script first\./.test(String(error && error.message || error)),
            "Non-Entra namespaces must retain their existing per-script credential contract.");
        assert.strictEqual(execCalls.length, 1,
            "A missing local credential outside Entra must fail before process spawn.");
    });
}).then(function () {
    console.log("Entra namespace scripts use the global integration without per-script credential copies: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
}).then(function () {
    childProcess.execFile = originalExecFile;
});

"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.resolve(__dirname, "..");
var temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-ca-"));
var admin = { _id: "user/domain/admin", name: "admin", siteadmin: 0xFFFFFFFF };
var web = { users: {}, userGroups: {} };
web.users[admin._id] = admin;
var parent = { fs: fs, path: path, pluginPath: root, parent: { datapath: temporary, webserver: web } };
var runtime = require(path.join(root, "server/core/runtime.js")).createRuntime({ parent: parent, pluginRoot: root, source: {} });
var integrations = runtime.integrations;
var libraryFactory = require(path.join(root, "server/core/script-confirmation-library.js"));
var adminFactory = require(path.join(root, "server/core/script-admin-service.js"));
var executorFactory = require(path.join(root, "server/core/server-script-executor.js"));

var rdpPath = "CA/Generate signed RDP file.ps1";
var rdpAgentSource = fs.readFileSync(path.join(root, "seed", "MyCommands", rdpPath), "utf8");
var rdpSource = fs.readFileSync(path.join(root, "seed", "MyScripts", "CA", "_Sign RDP file.ps1"), "utf8");
var commandsSource = fs.readFileSync(path.join(root, "server", "modules", "commands", "index.js"), "utf8");

// Bundled CA folders are part of the canonical seed roots.
assert.ok(fs.existsSync(path.join(root, "seed", "MyCommands", "CA")), "seed/MyCommands/CA exists");
assert.ok(fs.existsSync(path.join(root, "seed", "MyScripts", "CA", "CA.menu")), "seed/MyScripts/CA has menu metadata");
assert.strictEqual(runtime.context.scriptRoots.myscripts, path.join(root, "seed", "MyScripts"), "no new source root");

function save(ca) {
    var values = integrations.readSettings();
    values.ca = ca;
    return Promise.resolve().then(function () { return integrations.save(admin, { integrations: values, secrets: {} }); });
}

save({ config: "bad value without backslash" }).then(function () {
    assert.fail("invalid CA config must be rejected");
}, function (error) {
    assert.match(error.message, /host\\CA name/);
    assert.strictEqual(integrations.configured().ca, false, "missing CA config is not configured");
    return save({ config: "CA-SRV01.example.local\\Example Issuing CA", template: "WebServer", rdpSigningThumbprint: "ab cd ef 01 23 45 67 89 ab cd ef 01 23 45 67 89 ab cd ef 01" });
}).then(function (snapshot) {
    assert.strictEqual(snapshot.configured.ca, true);
    assert.strictEqual(snapshot.values.ca.rdpSigningThumbprint, "ABCDEF0123456789ABCDEF0123456789ABCDEF01", "thumbprint normalized");
    return save({ config: "CA-SRV01\\Name\r\nInjected" }).then(function () { assert.fail("control characters rejected"); }, function () {});
}).then(function () {
    return save({ config: "CA-SRV01.example.local\\Example Issuing CA", template: "WebServer", rdpSigningThumbprint: "ABCDEF0123456789ABCDEF0123456789ABCDEF01", rdpSignPath: "C:\\Tools\\notepad.exe" }).then(function () { assert.fail("rdpsign path must end with rdpsign.exe"); }, function (error) {
        assert.match(error.message, /rdpsign\.exe path/);
        return save({ config: "CA-SRV01.example.local\\Example Issuing CA", template: "WebServer", rdpSigningThumbprint: "ABCDEF0123456789ABCDEF0123456789ABCDEF01", rdpSignPath: "\\\\srv\\share\\rdpsign.exe" }).then(function () { assert.fail("UNC rdpsign path rejected"); }, function () {});
    }).then(function () {
        return save({ config: "CA-SRV01.example.local\\Example Issuing CA", template: "WebServer", rdpSigningThumbprint: "ab cd ef 01 23 45 67 89 ab cd ef 01 23 45 67 89 ab cd ef 01", rdpSignPath: "C:\\Tools\\rdpsign.exe" });
    }).then(function (saved) {
        assert.strictEqual(saved.values.ca.rdpSignPath, "C:\\Tools\\rdpsign.exe", "rdpsign path stored");
        var stage = fs.readFileSync(path.join(root, "seed", "MyScripts", "CA", "_Sign RDP file.ps1"), "utf8");
        assert.ok(stage.indexOf("Get-RdpSignPath ([string]$env:MYSCRIPTS_RDPSIGN_PATH)") >= 0 && stage.indexOf("Get-AuthenticodeSignature") >= 0, "server stage uses the configured path and requires a Microsoft signature");
        assert.ok(commandsSource.indexOf("MYSCRIPTS_RDPSIGN_PATH") >= 0, "commands pass the path to the server stage");
    });
}).then(function () {
    // My Commands: CA values are injected as non-secret variables; AD password never is.
    var commandsLibrary = libraryFactory.createScriptLibrary({ fs: fs, path: path, root: path.join(root, "seed", "MyCommands"), readOnly: true, allowWrite: false });
    var commandsAdmin = adminFactory.createScriptAdminService({ context: runtime.context, library: commandsLibrary, namespace: "script-secrets.mycommands" });
    var script = commandsLibrary.getScript(rdpPath, true);
    assert.ok(script, "RDP command is discovered by the existing loader");
    var state = commandsAdmin.getSystemCredentialState(admin, rdpPath);
    var ca = state.profiles.filter(function (profile) { return profile.name === "ca"; })[0];
    assert.ok(ca && ca.required && ca.configured, "CA profile is required by the script header and configured globally");
    var values = commandsAdmin.caVariables(rdpPath);
    assert.deepStrictEqual(Object.keys(values).sort(), ["SirkCaConfig", "SirkCaTemplate", "SirkRdpSigningThumbprint"]);
    assert.strictEqual(values.SirkCaConfig, "CA-SRV01.example.local\\Example Issuing CA");
    assert.ok(commandsSource.indexOf("admin.caVariables(script.path)") >= 0, "Commands inject CA variables into agent scripts");
    assert.strictEqual(JSON.stringify(values).indexOf("password"), -1);
    assert.strictEqual(values.SirkRdpSigningThumbprint, "ABCDEF0123456789ABCDEF0123456789ABCDEF01", "empty header falls back to the global default");
    assert.strictEqual(values.SirkCaTemplate, "WebServer");

    // Per-script overrides: header values replace the global template/thumbprint.
    var integrationModule = require(path.join(root, "server/core/integration-service.js"));
    var globalCa = { config: "CA\\Name", template: "WebServer", rdpSigningThumbprint: "ABCDEF0123456789ABCDEF0123456789ABCDEF01", rdpSignPath: "" };
    var merged = integrationModule.caForScript(globalCa, ["SirkCaTemplate: User Cert", "SirkRdpSigningThumbprint: 01 23 45 67 89 ab cd ef 01 23 45 67 89 ab cd ef 01 23 45 67"]);
    assert.deepStrictEqual(merged, { config: "CA\\Name", template: "User Cert", rdpSigningThumbprint: "0123456789ABCDEF0123456789ABCDEF01234567", rdpSignPath: "" });
    assert.deepStrictEqual(integrationModule.caForScript(globalCa, ["SirkCaTemplate:", "SirkSystemCredential: CA"]), globalCa, "empty header keeps the default");
    assert.deepStrictEqual(integrationModule.caForScript({ config: "CA\\Name" }, ["SirkCaTemplate: Only"]).template, "Only", "template works without a global default");
    assert.throws(function () { integrationModule.caForScript(globalCa, ["SirkCaTemplate: bad;name"]); }, /SirkCaTemplate/);
    assert.throws(function () { integrationModule.caForScript(globalCa, ["SirkRdpSigningThumbprint: 1234"]); }, /SirkRdpSigningThumbprint/);
    var executorSource = fs.readFileSync(path.join(root, "server/core/server-script-executor.js"), "utf8");
    assert.ok(executorSource.indexOf("admin.caSettings(script.path)") >= 0, "My Scripts executor uses per-script CA settings");
    assert.ok(typeof commandsAdmin.caSettings === "function");
    assert.strictEqual(commandsAdmin.caSettings(rdpPath).template, "WebServer");

    // My Scripts executor: CA profile -> MYSCRIPTS_CA_* (fail closed when not configured).
    var executor = executorFactory.createServerScriptExecutor({
        context: runtime.context,
        library: { getScript: function () { return null; } },
        admin: { systemProfiles: function () { return ["ca"]; }, secretValues: function () { return {}; } }
    });
    assert.ok(executor, "executor created");
    var source = fs.readFileSync(path.join(root, "server/core/server-script-executor.js"), "utf8");
    assert.ok(source.indexOf("MYSCRIPTS_CA_CONFIG") >= 0 && source.indexOf("MYSCRIPTS_RDP_SIGNING_THUMBPRINT") >= 0);
    return save({ config: "" });
}).then(function () {
    var commandsLibrary = libraryFactory.createScriptLibrary({ fs: fs, path: path, root: path.join(root, "seed", "MyCommands"), readOnly: true, allowWrite: false });
    var commandsAdmin = adminFactory.createScriptAdminService({ context: runtime.context, library: commandsLibrary, namespace: "script-secrets.mycommands" });
    assert.throws(function () { commandsAdmin.caVariables(rdpPath); }, /not configured/, "missing CA config blocks execution before signing");

    // RDP command contract (#406).
    assert.ok(/^# SirkSystemCredential: CA$/m.test(rdpAgentSource));
    assert.ok(/^# SirkServerStage: CA\/_Sign RDP file\.ps1$/m.test(rdpAgentSource), "agent script runs the signing stage on the server");
    assert.ok(/^# SirkStageFor: MyCommands$/m.test(rdpSource), "server stage opts in");
    assert.ok(rdpAgentSource.indexOf("rdpsign") < 0 && rdpAgentSource.indexOf("Cert:\\") < 0, "agent never signs or touches certificate stores");
    assert.ok(rdpAgentSource.indexOf("Test-SignedRdpFile $fileName $bytes") < rdpAgentSource.indexOf("WriteAllBytes"), "file checked before delivery");
    assert.ok(rdpSource.indexOf("System32\\rdpsign.exe") >= 0, "system rdpsign.exe is used");
    assert.ok(!/ExecutionPolicy\s+Bypass|C:\\Investa|Read-Host|explorer\.exe/i.test(rdpSource), "reference script anti-patterns removed");
    assert.ok(!/Export-PfxCertificate|Export\(/.test(rdpSource), "private key is never exported");
    assert.ok(rdpSource.indexOf("HasPrivateKey") >= 0 && rdpSource.indexOf("EnhancedKeyUsageList") >= 0, "certificate private key and EKU are checked");
    assert.ok(rdpSource.indexOf("$LASTEXITCODE -ne 0") >= 0 && rdpSource.indexOf("signature:s:") >= 0, "signer exit code and signature are verified before delivery");
    assert.ok(/finally \{\s*if \(Test-Path -LiteralPath \$work\)/.test(rdpSource), "temporary directory is removed on success and failure");
    assert.ok(rdpSource.indexOf("Copy-Item -LiteralPath $temporaryFile") > rdpSource.indexOf("signature:s:"), "file leaves the server stage only after verification");
    assert.ok(rdpSource.indexOf("[\\x00-\\x1F\\x7F]") >= 0, "control characters in host names are rejected");
    assert.ok(!/^\s*param\s*\(/m.test(rdpSource), "no param block (variables are injected before the body)");

    fs.rmSync(temporary, { recursive: true, force: true });
    console.log("Shared CA integration, CA profile binding and signed RDP command contract: OK");
}).catch(function (error) {
    console.error(error);
    process.exit(1);
});

"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var libraryFactory = require("../server/core/script-confirmation-library.js");

var root = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-run-as-"));
var scriptPath = path.join(root, "whoami.ps1");

try {
    fs.writeFileSync(scriptPath, [
        "#PL Test konta",
        "#EN Account test",
        "# SirkWorkflow: JiraAssetProtocol",
        "# SirkJiraAssetAql: objectType = Computer",
        "# runAsUser: 1",
        "",
        "[Security.Principal.WindowsIdentity]::GetCurrent().Name"
    ].join("\r\n"), "utf8");

    var library = libraryFactory.createScriptLibrary({
        fs: fs,
        path: path,
        root: root,
        readOnly: true,
        allowWrite: true
    });

    var legacy = library.getScript("whoami.ps1", true);
    assert.strictEqual(legacy.runAsUser, 2,
        "Legacy runAsUser:1 must be exposed as strict logged-on-user mode.");
    assert.deepStrictEqual(legacy.extraHeaders, [
        "SirkWorkflow: JiraAssetProtocol",
        "SirkJiraAssetAql: objectType = Computer"
    ], "Runtime scripts must expose bounded authoritative Sirk metadata from their stored header.");

    var systemSaved = library.saveDefinition("whoami.ps1", {
        runAsUser: 0,
        locales: legacy.locales,
        approvalLevels: legacy.approvalLevels,
        variables: legacy.variableDefinitions || [],
        secretVariables: legacy.secretDefinitions || [],
        multiHost: legacy.multiHost,
        confirmExecution: legacy.confirmExecution
    });
    assert.strictEqual(systemSaved.script.runAsUser, 0,
        "SYSTEM mode must remain MeshAgent mode 0.");
    assert.ok(/^# runAsUser: 0$/mi.test(fs.readFileSync(scriptPath, "utf8")),
        "Saving SYSTEM mode must persist an explicit runAsUser:0 directive.");
    assert.ok(systemSaved.script.extraHeaders.indexOf("SirkJiraAssetAql: objectType = Computer") >= 0,
        "Definition save must preserve script-owned Jira scope metadata.");

    var userSaved = library.saveDefinition("whoami.ps1", {
        runAsUser: 2,
        locales: systemSaved.definition.locales,
        approvalLevels: systemSaved.definition.approvalLevels,
        variables: systemSaved.definition.variables,
        secretVariables: systemSaved.definition.secretVariables,
        multiHost: systemSaved.definition.multiHost,
        confirmExecution: systemSaved.definition.confirmExecution
    });
    assert.strictEqual(userSaved.script.runAsUser, 2,
        "Logged-on-user mode must remain MeshAgent UserOnly mode 2.");
    assert.ok(/^# runAsUser: 2$/mi.test(fs.readFileSync(scriptPath, "utf8")),
        "Saving logged-on-user mode must persist runAsUser:2.");
    assert.ok(userSaved.script.extraHeaders.indexOf("SirkWorkflow: JiraAssetProtocol") >= 0,
        "Sirk workflow metadata must survive repeated definition saves.");

    var browser = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "script-tools.js"), "utf8");
    assert.ok(browser.indexOf('var runAs = createSelect(["0", "2"], String(value.runAsUser || 0))') >= 0,
        "The canonical script editor must expose only SYSTEM and strict logged-on-user modes.");
    assert.ok(browser.indexOf('option.textContent = option.value === "2" ? "Logged-on user" : "SYSTEM"') >= 0,
        "The script editor must label values 0 and 2 explicitly.");
    assert.ok(browser.indexOf('runAsUser: Number(runAs.value) || 0') >= 0,
        "Saving from the editor must persist the selected canonical MeshAgent run-as value.");
    assert.strictEqual(browser.indexOf('createSelect(["0", "1", "2"]'), -1,
        "Legacy runAsUser:1 must not return as an editor choice.");

    console.log("Script run-as mode and authoritative Sirk metadata contract: OK");
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}

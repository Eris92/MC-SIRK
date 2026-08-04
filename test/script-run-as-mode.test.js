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

    var browser = fs.readFileSync(path.join(__dirname, "..", "public", "shared", "ui", "download-results.js"), "utf8");
    assert.ok(browser.indexOf('addRunAsOption(select, "0", "SYSTEM")') >= 0,
        "The script editor must expose SYSTEM as value 0.");
    assert.ok(browser.indexOf('addRunAsOption(select, "2"') >= 0,
        "The script editor must expose logged-on user as strict value 2.");
    assert.ok(browser.indexOf('String(select.value) === "0" ? "0" : "2"') >= 0,
        "Legacy user modes must be normalized to strict UserOnly in the editor.");

    console.log("Script run-as mode contract: OK");
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}

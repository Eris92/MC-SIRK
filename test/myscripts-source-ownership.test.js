"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var rootResolver = require("../server/core/automation-root.js");
var libraryFactory = require("../server/core/script-confirmation-library.js");

var repositoryRoot = path.resolve(__dirname, "..");
var temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-myscripts-source-"));
var dataRoot = path.join(temporary, "sirk-platform-data");
var legacyRoots = [
    path.join(dataRoot, "myscripts", "scripts"),
    path.join(dataRoot, "scripts", "MyScripts")
];
var relativeReset = path.join("Active Directory", "Reset user password and SMS.ps1");

try {
    legacyRoots.forEach(function (legacyRoot, index) {
        var stalePath = path.join(legacyRoot, relativeReset);
        fs.mkdirSync(path.dirname(stalePath), { recursive: true });
        fs.writeFileSync(stalePath,
            "#EN Stale reset " + index + "\n# VariableUserRequiredEN: $AdUser, User\nWrite-Output 'legacy'\n",
            "utf8");
    });
    var legacyBefore = legacyRoots.map(function (legacyRoot) {
        return fs.readFileSync(path.join(legacyRoot, relativeReset), "utf8");
    });

    var resolvedRoot = rootResolver.resolve({
        fs: fs,
        nativePath: path,
        dataRoot: dataRoot,
        pluginRoot: repositoryRoot
    });
    var bundledRoot = path.join(repositoryRoot, "seed", "MyScripts");
    assert.strictEqual(path.resolve(resolvedRoot), path.resolve(bundledRoot),
        "My Scripts metadata must use the same bundled seed root as execution even when legacy persistent roots exist.");

    legacyRoots.forEach(function (legacyRoot, index) {
        assert.strictEqual(fs.readFileSync(path.join(legacyRoot, relativeReset), "utf8"), legacyBefore[index],
            "Legacy persistent My Scripts directories must not be modified while they are prevented from shadowing bundled definitions.");
    });

    var library = libraryFactory.createScriptLibrary({
        fs: fs,
        path: path,
        root: resolvedRoot,
        readOnly: true,
        allowWrite: false
    });
    var reset = library.getScript("Active Directory/Reset user password and SMS.ps1", true);
    var adUser = reset && (reset.variables || []).filter(function (variable) {
        return variable.name === "AdUser";
    })[0];
    assert.ok(adUser, "Bundled AD reset definition must expose the AdUser variable.");
    assert.strictEqual(adUser.optionSource, "ad-users",
        "Stale persistent metadata must not hide the current bundled ad-users option source.");
    assert.strictEqual(adUser.searchVariable, "AdUserSearch",
        "Stale persistent metadata must not hide the current bundled local Search contract.");
    assert.strictEqual(adUser.listMode, true,
        "Resolved bundled AD reset metadata must retain shared local list filtering.");

    var resolverSource = fs.readFileSync(path.join(repositoryRoot, "server", "core", "automation-root.js"), "utf8");
    assert.strictEqual(resolverSource.indexOf("context.dataRoot"), -1,
        "Bundled My Scripts source ownership must not fall back to a persistent data-root shadow tree.");

    var executorSource = fs.readFileSync(path.join(repositoryRoot, "server", "core", "server-script-executor.js"), "utf8");
    assert.ok(executorSource.indexOf('context.pluginRoot, "seed", "MyScripts"') >= 0,
        "My Scripts executor must remain aligned to the canonical bundled seed root.");
    assert.ok(executorSource.indexOf('MYSCRIPTS_SCRIPTS_ROOT: context.nativePath.join(context.pluginRoot, "seed", "MyScripts")') >= 0,
        "PowerShell shared-script resolution must remain aligned to the canonical bundled seed root.");

    console.log("My Scripts bundled metadata/execution source ownership and legacy-shadow regression: OK");
} finally {
    fs.rmSync(temporary, { recursive: true, force: true });
}

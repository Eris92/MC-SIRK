"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var packageJson = require("../package.json");
var config = require("../config.json");

function meshVersionToNumber(version) {
    var parts = String(version || "").split("-");
    return parts.length === 2 ? parts[0] : String(version || "");
}

function meshVersionGreater(a, b) {
    var partsA = meshVersionToNumber(String(a).replace(/^v/, "")).split(".").map(Number);
    var partsB = meshVersionToNumber(String(b).replace(/^v/, "")).split(".").map(Number);
    for (var index = 0; index < Math.max(partsA.length, partsB.length); index++) {
        var left = partsA[index] || 0;
        var right = partsB[index] || 0;
        if (left > right) return true;
        if (left < right) return false;
    }
    return false;
}

function incrementRevision(version) {
    var parts = String(version || "").split(".").map(Number);
    assert.strictEqual(parts.length, 3, "Current development version must use three numeric segments.");
    parts[2] += 1;
    return parts.join(".");
}

function implementationSource(marker) {
    return "var config=require('./config.json');module.exports={createPlugin:function(){return {implementation:'" + marker + "',exports:[],runtime:{version:config.version}};}};\n";
}

function policySource(marker) {
    return "module.exports={apply:function(plugin){plugin.policy='" + marker + "';}};\n";
}

var root = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-plugin-update-"));
var repositoryRoot = path.resolve(__dirname, "..");
var entrySource = fs.readFileSync(path.join(repositoryRoot, "SIRKPortal.js"), "utf8");
var installerSource = fs.readFileSync(path.join(repositoryRoot, "tools/install/Install-SIRK-Portal-FromGit.ps1"), "utf8");
var policyPaths = [
    "server/core/elevated-quick-command-policy.js",
    "server/core/logged-on-user-command-policy.js",
    "server/core/agent-command-guard.js",
    "server/core/multi-device-catalog-policy.js",
    "server/core/multi-device-catalog-browser-policy.js"
];

try {
    assert.strictEqual(config.version, packageJson.version, "Plugin and npm versions must remain identical.");
    assert.strictEqual(meshVersionGreater(config.version, "0.1.125"), true,
        "Current development version must be visible as newer than the ineffective 0.1.125 smoke candidate.");

    assert.ok(installerSource.indexOf("[string]$ServiceName = ''") >= 0,
        "Maintained installer must auto-detect the MeshCentral service unless an explicit name is supplied.");
    assert.ok(installerSource.indexOf("[string]$ServiceName = 'meshcentral.exe'") < 0,
        "Maintained installer must not assume the executable filename is the Windows service name.");
    [
        "Resolve-MeshCentralService",
        "Name -ieq 'MeshCentral'",
        "Get-RuntimeManifest",
        "Get-FileHash -Path $_.FullName -Algorithm SHA256",
        "Assert-RuntimeManifest",
        "runtime-state.json",
        "Wait-RuntimeState",
        "runtimeVersion",
        "Installed and verified SIRK Management Platform"
    ].forEach(function (fragment) {
        assert.ok(installerSource.indexOf(fragment) >= 0, "Installer activation proof is missing: " + fragment);
    });
    assert.ok(installerSource.indexOf("$runtimeState = Wait-RuntimeState") < installerSource.indexOf("Installed and verified SIRK Management Platform"),
        "Installer must prove the loaded runtime before reporting success.");

    fs.writeFileSync(path.join(root, "SIRKPortal.js"), entrySource, "utf8");
    fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ version: config.version }), "utf8");
    fs.writeFileSync(path.join(root, "plugin-main.js"), implementationSource("v1"), "utf8");
    policyPaths.forEach(function (relative) {
        var target = path.join(root, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, policySource("v1"), "utf8");
    });

    var meshData = path.join(root, "mesh-data");
    fs.mkdirSync(meshData, { recursive: true });
    var parent = { parent: { datapath: meshData }, pluginPath: root };
    var statePath = path.join(meshData, "sirk-platform-data", "runtime-state.json");
    var entryPath = path.join(root, "SIRKPortal.js");
    var bootstrap = require(entryPath);
    var entryCache = require.cache[require.resolve(entryPath)];
    var outsideId = path.join(os.tmpdir(), "sirk-plugin-update-outside.js");
    require.cache[outsideId] = { id: outsideId, filename: outsideId, loaded: true, exports: { keep: true }, children: [], paths: [] };

    var first = bootstrap.SIRKPortal(parent);
    assert.strictEqual(first.implementation, "v1");
    assert.strictEqual(first.policy, "v1");
    var firstState = JSON.parse(fs.readFileSync(statePath, "utf8"));
    assert.strictEqual(firstState.version, config.version, "Runtime state must identify the on-disk plugin version.");
    assert.strictEqual(firstState.runtimeVersion, config.version, "Runtime state must identify the implementation runtime version.");
    assert.strictEqual(path.resolve(firstState.pluginRoot), path.resolve(root), "Runtime state must identify the plugin root that actually loaded.");
    assert.ok(Number(firstState.pid) > 0, "Runtime state must identify the active Node process.");

    fs.writeFileSync(path.join(root, "plugin-main.js"), implementationSource("v2"), "utf8");
    policyPaths.forEach(function (relative) {
        fs.writeFileSync(path.join(root, relative), policySource("v2"), "utf8");
    });

    var sameVersion = bootstrap.SIRKPortal(parent);
    assert.strictEqual(sameVersion.implementation, "v1", "Same-version reinstantiation must reuse the loaded runtime.");
    assert.strictEqual(require.cache[require.resolve(entryPath)], entryCache, "Stable cached entrypoint must not replace itself.");

    var nextVersion = incrementRevision(config.version);
    fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ version: nextVersion }), "utf8");
    var updated = bootstrap.SIRKPortal(parent);
    assert.strictEqual(updated.implementation, "v2", "A changed on-disk version must reload plugin implementation modules.");
    assert.strictEqual(updated.policy, "v2", "A changed on-disk version must reload policy modules.");
    assert.strictEqual(require.cache[require.resolve(entryPath)], entryCache, "Version refresh must retain the stable entrypoint cache owner.");
    assert.ok(require.cache[outsideId] && require.cache[outsideId].exports.keep, "Version refresh must not purge modules outside MC-SIRK.");
    var updatedState = JSON.parse(fs.readFileSync(statePath, "utf8"));
    assert.strictEqual(updatedState.version, nextVersion, "Runtime state must advance after the on-disk plugin version changes.");
    assert.strictEqual(updatedState.runtimeVersion, nextVersion, "Runtime proof must reject a stale implementation behind new disk metadata.");
    delete require.cache[outsideId];

    console.log("MeshCentral-visible version, cache refresh and fail-closed runtime activation proof: OK");
} finally {
    Object.keys(require.cache).forEach(function (id) {
        if (id.indexOf(root + path.sep) === 0) delete require.cache[id];
    });
    fs.rmSync(root, { recursive: true, force: true });
}

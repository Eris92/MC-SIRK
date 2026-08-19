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

function implementationSource(marker) {
    return "module.exports={createPlugin:function(){return {implementation:'" + marker + "',exports:[]};}};\n";
}

function policySource(marker) {
    return "module.exports={apply:function(plugin){plugin.policy='" + marker + "';}};\n";
}

var root = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-plugin-update-"));
var entrySource = fs.readFileSync(path.join(__dirname, "..", "SIRKPortal.js"), "utf8");
var policyPaths = [
    "server/core/elevated-quick-command-policy.js",
    "server/core/logged-on-user-command-policy.js",
    "server/core/agent-command-guard.js",
    "server/core/multi-device-catalog-policy.js",
    "server/core/multi-device-catalog-browser-policy.js"
];

try {
    assert.strictEqual(config.version, packageJson.version, "Plugin and npm versions must remain identical.");
    assert.strictEqual(meshVersionGreater(config.version, "0.1.1-dev.124"), true,
        "Current development version must be visible as newer to MeshCentral's plugin version comparator.");

    fs.writeFileSync(path.join(root, "SIRKPortal.js"), entrySource, "utf8");
    fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ version: config.version }), "utf8");
    fs.writeFileSync(path.join(root, "plugin-main.js"), implementationSource("v1"), "utf8");
    policyPaths.forEach(function (relative) {
        var target = path.join(root, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, policySource("v1"), "utf8");
    });

    var entryPath = path.join(root, "SIRKPortal.js");
    var bootstrap = require(entryPath);
    var entryCache = require.cache[require.resolve(entryPath)];
    var outsideId = path.join(os.tmpdir(), "sirk-plugin-update-outside.js");
    require.cache[outsideId] = { id: outsideId, filename: outsideId, loaded: true, exports: { keep: true }, children: [], paths: [] };

    var first = bootstrap.SIRKPortal({});
    assert.strictEqual(first.implementation, "v1");
    assert.strictEqual(first.policy, "v1");

    fs.writeFileSync(path.join(root, "plugin-main.js"), implementationSource("v2"), "utf8");
    policyPaths.forEach(function (relative) {
        fs.writeFileSync(path.join(root, relative), policySource("v2"), "utf8");
    });

    var sameVersion = bootstrap.SIRKPortal({});
    assert.strictEqual(sameVersion.implementation, "v1", "Same-version reinstantiation must reuse the loaded runtime.");
    assert.strictEqual(require.cache[require.resolve(entryPath)], entryCache, "Stable cached entrypoint must not replace itself.");

    fs.writeFileSync(path.join(root, "config.json"), JSON.stringify({ version: "0.1.126" }), "utf8");
    var updated = bootstrap.SIRKPortal({});
    assert.strictEqual(updated.implementation, "v2", "A changed on-disk version must reload plugin implementation modules.");
    assert.strictEqual(updated.policy, "v2", "A changed on-disk version must reload policy modules.");
    assert.strictEqual(require.cache[require.resolve(entryPath)], entryCache, "Version refresh must retain the stable entrypoint cache owner.");
    assert.ok(require.cache[outsideId] && require.cache[outsideId].exports.keep, "Version refresh must not purge modules outside MC-SIRK.");
    delete require.cache[outsideId];

    console.log("MeshCentral-visible development version and version-aware backend module reload: OK");
} finally {
    Object.keys(require.cache).forEach(function (id) {
        if (id.indexOf(root + path.sep) === 0) delete require.cache[id];
    });
    fs.rmSync(root, { recursive: true, force: true });
}

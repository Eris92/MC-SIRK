"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var admin = fs.readFileSync(path.join(root, "admin.js"), "utf8");
var startup = fs.readFileSync(path.join(root, "plugin-main.js"), "utf8");
var results = fs.readFileSync(path.join(root, "public", "shared", "ui", "results.js"), "utf8");

assert.ok(admin.indexOf('"shared-ui/results.js": ["public/shared/ui/results.js"') >= 0,
    "The canonical results renderer must be exposed as a plugin asset.");
assert.ok(admin.indexOf('if (asset === "download")') >= 0,
    "The admin request handler must expose the authenticated download endpoint.");
assert.ok(admin.indexOf('if (!user)') >= 0 && admin.indexOf('"Forbidden"') >= 0,
    "Generated downloads must require an authenticated MeshCentral user.");
assert.ok(admin.indexOf('path.join(root, "seed", "MyScripts")') >= 0 &&
    admin.indexOf('path.join(root, "seed", "MyCommands")') >= 0,
    "Generated downloads must be restricted to canonical script roots.");
assert.ok(admin.indexOf('path.extname(target).toLowerCase() !== ".csv"') >= 0,
    "The generated-file endpoint must allow only CSV reports.");
assert.ok(admin.indexOf('Content-Disposition') >= 0 && admin.indexOf('X-Content-Type-Options') >= 0,
    "CSV responses must be emitted as attachments with nosniff protection.");

assert.ok(startup.indexOf('window.__SIRK_PLATFORM_PIN__ = browserPin') >= 0,
    "The native browser startup must expose the active plugin identifier.");
assert.ok(startup.indexOf('["sirk-platform-results", "shared-ui/results.js"]') >= 0,
    "The native MeshCentral UI must load the canonical results renderer.");
assert.strictEqual(startup.indexOf("download-results.js"), -1,
    "Startup must not reload the removed generated-download compatibility helper.");

assert.ok(results.indexOf('/^CSV_DOWNLOAD:(.+)$/i') >= 0,
    "The canonical result renderer must recognize CSV_DOWNLOAD markers.");
assert.ok(results.indexOf('mc-results-download-button') >= 0 && results.indexOf('"Download CSV"') >= 0,
    "The canonical result renderer must expose a CSV download action.");
assert.ok(results.indexOf('SirkPlatformCore.assetUrl("", "download", { path: parsedOutput.downloadPath })') >= 0,
    "The download action must use the authenticated plugin download endpoint.");
assert.ok(results.indexOf("function startDownload(url)") >= 0 &&
    results.indexOf('document.createElement("a")') >= 0 &&
    results.indexOf("link.click()") >= 0,
    "CSV download must use a dedicated transient attachment link without replacing the MeshCentral page location.");
assert.strictEqual(results.indexOf("window.location.href = url"), -1,
    "CSV download must not navigate the MeshCentral SPA to the generated-file endpoint.");
assert.ok(results.indexOf('COMMANDTABS)_PROGRESS__') >= 0,
    "The result renderer must remove progress protocol lines from visible output.");
assert.ok(results.indexOf('appendResult(host, raw, options)') >= 0 &&
    results.indexOf('var host = document.getElementById(hostId)') >= 0,
    "History dialogs must mount the same canonical result/download renderer into the native MeshCentral dialog body instead of a MutationObserver enhancer.");
assert.strictEqual(results.indexOf("new MutationObserver"), -1,
    "Generated-download handling must not depend on DOM polling or MutationObserver compatibility logic.");

var sandbox = {
    window: {},
    document: {},
    navigator: {},
    Uint8Array: Uint8Array,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout
};
vm.runInNewContext(results, sandbox, { filename: "results.js" });
var parsed = sandbox.window.SharedResultsView.parseDownloadResult([
    "Wygenerowano raport CSV: C:\\reports\\first.csv",
    "CSV_DOWNLOAD:C:\\reports\\first.csv",
    "Liczba rekordow: 1613",
    "Wygenerowano raport CSV: C:\\reports\\latest.csv",
    "CSV_DOWNLOAD:C:\\reports\\latest.csv",
    "Liczba rekordow: 1613"
].join("\n"));
assert.strictEqual(parsed.downloadPath, "C:\\reports\\latest.csv",
    "Accumulated output must download the newest generated CSV marker, not the first stale path.");
assert.strictEqual(parsed.visible.indexOf("CSV_DOWNLOAD:"), -1,
    "CSV marker lines must remain hidden from the visible result body.");

console.log("Generated CSV download contract: OK");

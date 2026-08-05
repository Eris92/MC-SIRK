"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var factory = require("../server/core/settings-store.js");

var root = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-settings-cache-"));
var filePath = path.join(root, "settings.json");
fs.writeFileSync(filePath, JSON.stringify({ modules: { myscripts: { enabled: true } } }), "utf8");

var reads = 0;
var countingFs = Object.create(fs);
countingFs.readFileSync = function () {
    if (path.resolve(String(arguments[0])) === path.resolve(filePath)) reads += 1;
    return fs.readFileSync.apply(fs, arguments);
};

var store = factory.createSettingsStore({
    fs: countingFs,
    path: path,
    filePath: filePath,
    defaults: { modules: { myscripts: { enabled: false, accessGroupIds: [] } } }
});

try {
    var first = store.read();
    var readsAfterFirst = reads;
    assert.strictEqual(first.modules.myscripts.enabled, true);
    assert.ok(readsAfterFirst >= 1);

    first.modules.myscripts.enabled = false;
    var second = store.read();
    assert.strictEqual(reads, readsAfterFirst,
        "Repeated settings reads in one render must use the hot cache.");
    assert.strictEqual(second.modules.myscripts.enabled, true,
        "Callers must receive a defensive copy of cached settings.");

    store.updateSync(function (current) {
        current.modules.myscripts.enabled = false;
        return current;
    });
    assert.strictEqual(store.read().modules.myscripts.enabled, false,
        "Synchronous settings writes must refresh the read cache.");

    console.log("Settings hot-path read cache and defensive copies: OK");
} finally {
    fs.rmSync(root, { recursive: true, force: true });
}

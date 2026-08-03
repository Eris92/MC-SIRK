"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var factory = require("../server/core/settings-store.js");

var temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-settings-fallback-"));
var blockedPath = path.join(temporary, "blocked", "settings.json");
var fallbackPath = path.join(temporary, "program-data", "settings.json");
fs.mkdirSync(blockedPath, { recursive: true });

var options = { fs: fs, path: path, filePath: blockedPath, fallbackPath: fallbackPath, defaults: { modules: { mycommands: { enabled: true } } } };
var store = factory.createSettingsStore(options);
store.updateSync(function (settings) {
    settings.modules.mycommands.commandOverrides = { cmd: { showOnDesktop: true, showWithoutDesktop: false } };
    return settings;
});

assert.strictEqual(fs.existsSync(fallbackPath), true);
var restarted = factory.createSettingsStore(options).read();
assert.strictEqual(restarted.modules.mycommands.commandOverrides.cmd.showOnDesktop, true);
assert.strictEqual(restarted.modules.mycommands.commandOverrides.cmd.showWithoutDesktop, false);
fs.rmSync(temporary, { recursive: true, force: true });
console.log("Settings fallback: OK");

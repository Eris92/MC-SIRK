"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.resolve(__dirname, "..");
var temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-admin-icon-mode-"));
var parent = {
    fs: fs,
    path: path,
    pluginPath: root,
    parent: { datapath: temporary, webserver: { users: {}, userGroups: {} } }
};
var runtimeFactory = require(path.join(root, "server/core/runtime.js"));
var runtime = runtimeFactory.createRuntime({ parent: parent, pluginRoot: root, source: {}, fallbackDataRoot: "" });
var admin = { _id: "user/domain/admin", name: "admin", siteadmin: 0xFFFFFFFF };
var user = { _id: "user/domain/user", name: "user", siteadmin: 0 };

runtime.saveAdminSettings(admin, {
    modules: {},
    moduleOptions: { general: { iconMode: "not-a-mode" } }
}).then(function (snapshot) {
    assert.strictEqual(snapshot.uiSettings.iconMode, "auto",
        "Unknown icon mode must normalize to auto.");
    var saved = JSON.parse(fs.readFileSync(path.join(temporary, "sirk-platform-data", "settings.json"), "utf8"));
    assert.strictEqual(saved.ui.iconMode, "auto",
        "Normalized auto mode must be persisted, never the untrusted client value.");

    return runtime.saveAdminSettings(user, {
        modules: {},
        moduleOptions: { general: { iconMode: "modern" } }
    }).then(function () {
        throw new Error("Non-siteAdmin icon mode save unexpectedly succeeded.");
    }, function (error) {
        assert.ok(error, "Non-siteAdmin save must be rejected.");
        var afterDenied = JSON.parse(fs.readFileSync(path.join(temporary, "sirk-platform-data", "settings.json"), "utf8"));
        assert.strictEqual(afterDenied.ui.iconMode, "auto",
            "Rejected non-siteAdmin save must not mutate persisted icon mode.");
    });
}).then(function () {
    fs.rmSync(temporary, { recursive: true, force: true });
    console.log("Admin icon mode normalization and siteAdmin authorization: OK");
}).catch(function (error) {
    fs.rmSync(temporary, { recursive: true, force: true });
    console.error(error);
    process.exitCode = 1;
});

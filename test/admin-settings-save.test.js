"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.resolve(__dirname, "..");
var temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-admin-save-"));
var groupId = "ugrp/domain/level1";
var web = { users: {}, userGroups: {} };
web.userGroups[groupId] = { _id: groupId, name: "Level 1" };
var parent = { fs: fs, path: path, pluginPath: root, parent: { datapath: temporary, webserver: web } };
var runtime = require(path.join(root, "server/core/runtime.js")).createRuntime({ parent: parent, pluginRoot: root, source: {} });
var admin = { _id: "user/domain/admin", name: "admin", siteadmin: 0xFFFFFFFF };
var adminHandler = require(path.join(root, "admin.js")).admin({ shortName: "SIRKPortal", runtime: runtime });

runtime.saveAdminSettings(admin, {
    modules: { approvalcenter: true },
    moduleOptions: {
        approvals: {
            retentionDays: 100,
            providers: {
                mycommands: {
                    enabled: true,
                    showTab: false,
                    showOverview: false,
                    allowNoApproval: true,
                    levels: { 1: [groupId], 2: [], 3: [] }
                }
            }
        }
    }
}).then(function (snapshot) {
    var saved = JSON.parse(fs.readFileSync(path.join(temporary, "sirk-platform-data", "settings.json"), "utf8"));
    var provider = saved.modules.approvals.providers.mycommands;
    assert.strictEqual(snapshot.plugin.version, require(path.join(root, "config.json")).version);
    assert.strictEqual(provider.allowNoApproval, true);
    assert.strictEqual(provider.showTab, false);
    assert.strictEqual(provider.showOverview, false);
    assert.deepStrictEqual(provider.levels["1"], [groupId]);
    return new Promise(function (resolve, reject) {
        var response = {
            headers: {},
            setHeader: function (name, value) { this.headers[name] = value; },
            end: function (body) {
                try {
                    var result = JSON.parse(body);
                    assert.strictEqual(this.statusCode, 200);
                    assert.strictEqual(result.ok, true);
                    assert.strictEqual(result.snapshot.moduleSettings.mycommands.showOnDevice, false);
                    resolve();
                } catch (error) { reject(error); }
            }
        };
        adminHandler.post({ query: { pin: "SIRKPortal" }, body: {
            action: "save-settings",
            modules: JSON.stringify({ mycommands: true }),
            moduleOptions: JSON.stringify({ mycommands: { showOnDevice: false } })
        } }, response, admin);
    });
}).then(function () {
    fs.rmSync(temporary, { recursive: true, force: true });
    console.log("Admin settings save: OK");
}).catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});

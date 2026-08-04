"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.resolve(__dirname, "..");
var temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-admin-permissions-"));
var allowedGroup = "ugrp/domain/script-operators";
var deniedGroup = "ugrp/domain/other-users";
var web = { users: {}, userGroups: {} };
web.userGroups[allowedGroup] = { _id: allowedGroup, name: "Script Operators" };
web.userGroups[deniedGroup] = { _id: deniedGroup, name: "Other Users" };

var admin = { _id: "user/domain/admin", name: "admin", siteadmin: 0xFFFFFFFF };
var operator = { _id: "user/domain/operator", name: "operator", links: {} };
var other = { _id: "user/domain/other", name: "other", links: {} };
operator.links[allowedGroup] = { rights: 1 };
other.links[deniedGroup] = { rights: 1 };
web.users[admin._id] = admin;
web.users[operator._id] = operator;
web.users[other._id] = other;

var parent = { fs: fs, path: path, pluginPath: root, parent: { datapath: temporary, webserver: web } };
var runtime = require(path.join(root, "server/core/runtime.js")).createRuntime({ parent: parent, pluginRoot: root, source: {} });
var initial = runtime.adminSnapshot(admin);

function rules(items) {
    var result = {};
    (items || []).forEach(function (item) {
        result[item.key] = { enabled: true, allowAll: false, groupIds: [allowedGroup] };
    });
    return result;
}

runtime.saveAdminSettings(admin, {
    modules: {},
    moduleOptions: {
        permissions: {
            mycommands: {
                accessGroupIds: [allowedGroup, "ugrp/domain/missing"],
                folderPermissions: rules(initial.folderPermissions.mycommands)
            },
            myscripts: {
                accessGroupIds: [allowedGroup],
                folderPermissions: rules(initial.folderPermissions.myscripts)
            }
        }
    }
}).then(function (snapshot) {
    var saved = JSON.parse(fs.readFileSync(path.join(temporary, "sirk-platform-data", "settings.json"), "utf8"));
    assert.deepStrictEqual(saved.modules.mycommands.accessGroupIds, [allowedGroup]);
    assert.deepStrictEqual(saved.modules.myscripts.accessGroupIds, [allowedGroup]);
    assert.ok(Object.keys(saved.modules.mycommands.folderPermissions).length >= 4,
        "My Commands categories must be persisted.");
    Object.keys(saved.modules.mycommands.folderPermissions).forEach(function (key) {
        assert.deepStrictEqual(saved.modules.mycommands.folderPermissions[key].groupIds, [allowedGroup]);
    });
    assert.strictEqual(runtime.modules.mycommands.getAccess(operator).allowed, true);
    assert.strictEqual(runtime.modules.mycommands.getAccess(other).allowed, false);
    assert.strictEqual(runtime.modules.myscripts.getAccess(operator).allowed, true);
    assert.strictEqual(runtime.modules.myscripts.getAccess(other).allowed, false);
    assert.ok(snapshot.userGroups.some(function (group) { return group.id === allowedGroup; }));
    assert.ok(Array.isArray(snapshot.folderPermissions.mycommands));
    assert.ok(Array.isArray(snapshot.folderPermissions.myscripts));
    fs.rmSync(temporary, { recursive: true, force: true });
    console.log("Admin permissions settings: OK");
}).catch(function (error) {
    console.error(error);
    process.exitCode = 1;
});

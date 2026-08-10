"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/shared/ui/parameter-dialog.js"), "utf8");
var context = {
    Promise: Promise,
    String: String,
    Array: Array,
    Object: Object,
    console: console,
    document: { documentElement: { lang: "en" } },
    window: {
        SharedScriptTools: {},
        localStorage: { getItem: function () { return "en"; } }
    }
};
context.window.window = context.window;
vm.runInNewContext(source, context, { filename: "parameter-dialog.js" });

var contract = context.window.SharedScriptTools.parameterDialogContract;
var jiraUser = { kind: "user", variable: { name: "JiraUser" } };
var asset = { kind: "asset", variable: { name: "PcName" } };
var transfer = { kind: "switch", variable: { name: "IsTransferProtocol" } };
var itPerson = { kind: "user", variable: { name: "ItPerson" } };
var records = [jiraUser, asset, transfer, itPerson];

assert.strictEqual(contract.assetUserDependency(records, asset), jiraUser,
    "An asset must default to the nearest preceding user variable.");
assert.strictEqual(contract.assetDependsOnUser(records, asset, jiraUser), true,
    "Changing JiraUser must refresh PcName.");
assert.strictEqual(contract.assetDependsOnUser(records, asset, itPerson), false,
    "Changing a later IT-person field must not reload and clear the selected asset.");

var explicitOwner = { kind: "user", variable: { name: "AssetOwner" } };
var explicitAsset = { kind: "asset", variable: { name: "Device", dependsOn: "AssetOwner" } };
var explicit = [jiraUser, explicitOwner, explicitAsset, itPerson];
assert.strictEqual(contract.assetUserDependency(explicit, explicitAsset), explicitOwner,
    "Explicit dependsOn must override positional dependency when supplied.");

console.log("Shared parameter dialog user-to-asset dependency refresh contract: OK");

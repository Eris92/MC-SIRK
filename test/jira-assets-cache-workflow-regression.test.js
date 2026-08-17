"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var protocolSeed = fs.readFileSync(path.join(root, "seed/MyScripts/Jira/Jira Asset Protocol.ps1"), "utf8");
var cacheSeed = fs.readFileSync(path.join(root, "seed/MyScripts/settings/Jira/Cache Assets.ps1"), "utf8");
var automationServer = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");

[protocolSeed, cacheSeed].forEach(function (source) {
    assert.ok(/^# SirkJiraAssetAql: objectType in objectTypeAndChildren\("Sprzęt użytkownika"\)$/m.test(source),
        "Canonical Jira protocol/cache must use the previously proven Sprzęt użytkownika scope.");
    assert.strictEqual(/^# SirkJiraAssetAql: Key is not EMPTY$/m.test(source), false,
        "Canonical Jira protocol/cache must not scan the entire Jira Assets workspace.");
});

assert.ok(automationServer.indexOf("result.sourceCount") >= 0,
    "Jira cache completion must report the fetched snapshot count, not the 5000 interactive option ceiling.");
assert.ok(automationServer.indexOf('count >= 50000') >= 0,
    "A safety-bounded 50k snapshot must be reported as bounded rather than as an exact false count.");

console.log("Jira Assets scoped cache and truthful completion count contract: OK");

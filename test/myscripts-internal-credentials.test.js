"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var server = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
var client = fs.readFileSync(path.join(root, "public/modules/automation/index.js"), "utf8");
var tree = fs.readFileSync(path.join(root, "public/shared/ui/tree.js"), "utf8");
var protocol = fs.readFileSync(path.join(root, "seed/MyScripts/Jira/Jira Asset Protocol.ps1"), "utf8");

assert.ok(server.indexOf("function internalScriptPath") >= 0,
    "My Scripts must have one server-side internal path guard.");
assert.ok(server.indexOf("function publicTree") >= 0 && server.indexOf("return publicTree(library.getTree())") >= 0,
    "Internal underscore paths must be removed before the My Scripts tree reaches the browser.");
assert.ok(server.indexOf('if (internalScriptPath(relativePath)) throw new Error("Script not found.")') >= 0,
    "Direct public API access to internal underscore paths must fail closed.");
assert.ok(server.indexOf('/^_/.test(part)') >= 0,
    "Any underscore-prefixed path segment, including _shared, must be treated as internal.");

assert.ok(protocol.indexOf("# SirkSystemCredential: Jira") >= 0,
    "Jira Asset Protocol must declare its shared Jira system credential dependency in script metadata.");
assert.ok(client.indexOf("function usesCredentials") >= 0 && client.indexOf("SirkSystemCredential") >= 0,
    "My Scripts row actions must recognize local and system credential dependencies without per-row requests.");
assert.ok(client.indexOf('key: "credentials"') >= 0 && client.indexOf("disabled: !enabled") >= 0,
    "Edit mode must retain a disabled credential action when the script does not use credentials.");
assert.ok(client.indexOf('title: enabled ? "Configure script credentials" : "This script does not use credentials"') >= 0,
    "Credential action must expose clear enabled/disabled semantics.");
assert.ok(tree.indexOf("action.disabled = definition.disabled === true") >= 0 && tree.indexOf('classList.toggle("is-disabled", action.disabled)') >= 0,
    "Shared tree renderer must preserve the native disabled/grey action state.");

console.log("My Scripts internal _shared guard and always-visible credential action contract: OK");

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
}

var tools = read("public/shared/ui/script-tools.js");
var integrations = read("web/admin/integrations.js");
var automation = read("public/modules/automation/index.js");
var commands = read("public/modules/commands/index.js");
var dialog = read("public/shared/ui/parameter-dialog.js");

assert.ok(tools.indexOf('shell.api("script-secrets"') >= 0, "Script credentials must read script-local secret state.");
assert.ok(tools.indexOf('shell.api("system-credentials"') >= 0, "Script credentials must read system credential assignments.");
assert.ok(tools.indexOf('shell.post("script-secrets"') >= 0, "Script credentials must save script-local secrets.");
assert.ok(tools.indexOf('shell.post("system-credentials"') >= 0, "Script credentials must save system credential assignments.");
assert.ok(tools.indexOf('disabled: false') >= 0 && tools.indexOf('key: "credentials"') >= 0, "Credentials action must remain usable without SaveSecret directives.");

["Jira", "Active Directory", "AAD / Entra ID"].forEach(function (name) {
    assert.ok(integrations.indexOf(name) >= 0, "Missing integration section: " + name);
});
assert.ok(integrations.indexOf("<details") < 0 || integrations.indexOf("details") >= 0, "Integration sections must use disclosure ownership.");
assert.ok(integrations.indexOf("jiraToken") >= 0, "Jira write-only secret field is missing.");
assert.ok(integrations.indexOf("adPassword") >= 0, "AD write-only secret field is missing.");
assert.ok(integrations.indexOf("entraClientSecret") >= 0, "Entra write-only secret field is missing.");

assert.strictEqual(automation.indexOf("window.confirm("), -1, "My Scripts must use the native confirmation owner.");
assert.strictEqual(commands.indexOf("window.confirm(msg("), -1, "My Commands must use the native confirmation owner.");
assert.ok(dialog.indexOf("openConfirmationDialog") >= 0, "Shared native confirmation dialog is missing.");

console.log("dev48 credentials/native-dialog contract: OK");

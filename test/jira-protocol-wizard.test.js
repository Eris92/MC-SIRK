"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/modules/automation/jira-protocol-wizard.js"), "utf8");
var policySource = fs.readFileSync(path.join(root, "server/core/jira-protocol-wizard-policy.js"), "utf8");
var calls = [];
var providerCalls = [];
var provider = function (variable, values) {
    providerCalls.push({ name: variable.name, values: Object.assign({}, values) });
    return Promise.resolve([]);
};
var tools = {
    setParameterOptionProvider: function () {},
    openParameterDialog: function (options) {
        calls.push(options);
        var label = String(options.item && options.item.label || "");
        if (/ - User$/.test(label)) {
            return Promise.resolve({ JiraUserFilter: "all", JiraUser: "acc-1" });
        }
        if (/ - Asset$/.test(label)) {
            return Promise.resolve(options.resolveOptions({ name: "PcName", control: "asset" }, {}, options.item)).then(function () {
                return { PcName: "PC-01" };
            });
        }
        if (/ - Protocol$/.test(label)) {
            return Promise.resolve(options.resolveOptions({ name: "ItPerson", control: "user" }, {}, options.item)).then(function () {
                return { IsTransferProtocol: true, ItPerson: "it-1" };
            });
        }
        return Promise.resolve({ passthrough: true });
    }
};
var sandbox = {
    window: { SharedScriptTools: tools },
    document: { getElementById: function () { return null; } },
    Promise: Promise,
    JSON: JSON,
    Object: Object,
    Array: Array,
    String: String,
    RegExp: RegExp,
    console: console
};
vm.runInNewContext(source, sandbox, { filename: "jira-protocol-wizard.js" });
sandbox.window.SharedScriptTools.setParameterOptionProvider(provider);

var protocol = {
    path: "Jira/Jira Asset Protocol.ps1",
    label: "Jira Asset Protocol",
    requiresApproval: false,
    extraHeaders: ["SirkWorkflow: JiraAssetProtocol", "SirkAllowCustom: ItPerson"],
    variables: [
        { name: "JiraUser", label: "Jira user", required: true, control: "user" },
        { name: "PcName", label: "Asset", required: true, control: "asset" },
        { name: "IsTransferProtocol", label: "Transfer", required: true, control: "switch", defaultValue: "false" },
        { name: "ItPerson", label: "IT person", required: true, control: "user" }
    ]
};

sandbox.window.SharedScriptTools.openParameterDialog({ item: protocol, primaryLabel: "Run" }).then(function (values) {
    assert.strictEqual(calls.length, 3, "Jira protocol must use exactly three sequential native shared dialogs before execution.");
    assert.deepStrictEqual(Array.prototype.map.call(calls[0].item.variables, function (item) { return item.name; }), ["JiraUserFilter", "JiraUser"]);
    assert.strictEqual(calls[0].item.variables[0].options[0].label, "Active only");
    assert.strictEqual(calls[0].item.variables[0].options[1].label, "All");
    assert.deepStrictEqual(Array.prototype.map.call(calls[1].item.variables, function (item) { return item.name; }), ["PcName"]);
    assert.deepStrictEqual(Array.prototype.map.call(calls[2].item.variables, function (item) { return item.name; }), ["IsTransferProtocol", "ItPerson"]);
    assert.strictEqual(providerCalls[0].name, "PcName");
    assert.strictEqual(providerCalls[0].values.JiraUser, "acc-1", "Asset step must receive the user selected in the previous step.");
    assert.strictEqual(providerCalls[0].values.JiraUserFilter, "all", "User scope must be retained for bounded backend option resolution.");
    assert.strictEqual(providerCalls[1].values.PcName, "PC-01", "Protocol step provider must receive the selected asset context.");
    assert.strictEqual(values.JiraUser, "acc-1");
    assert.strictEqual(values.PcName, "PC-01");
    assert.strictEqual(values.ItPerson, "it-1");
    assert.strictEqual(values.IsTransferProtocol, true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(values, "JiraUserFilter"), false,
        "Synthetic wizard-only filter must never be sent as a script variable.");

    calls.length = 0;
    return sandbox.window.SharedScriptTools.openParameterDialog({
        item: { path: "Other.ps1", label: "Other", variables: [{ name: "X", control: "text" }], extraHeaders: [] }
    });
}).then(function (value) {
    assert.strictEqual(calls.length, 1, "Non-Jira scripts must keep the original shared parameter dialog path.");
    assert.strictEqual(value.passthrough, true);
    assert.ok(policySource.indexOf("sirk-platform-parameter-dialog") >= 0 && policySource.indexOf("jira-protocol-wizard.js") >= 0,
        "Wizard loader must bind to the existing shared parameter-dialog readiness event.");
    assert.strictEqual(policySource.indexOf("MutationObserver"), -1, "Wizard loader must not add a DOM polling/observer loop.");
    assert.strictEqual(source.indexOf("window.prompt"), -1, "Wizard must never fall back to free-text browser prompts.");
    console.log("Jira protocol sequential shared-native wizard, provider context and non-Jira isolation: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

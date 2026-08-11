"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/modules/automation/jira-protocol-wizard.js"), "utf8");
var pluginMain = fs.readFileSync(path.join(root, "plugin-main.js"), "utf8");
var adminSource = fs.readFileSync(path.join(root, "admin.js"), "utf8");
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
            return Promise.resolve(options.resolveOptions({ name: "JiraUser", control: "user" }, {}, options.item)).then(function () {
                return { JiraUserActiveOnly: true, JiraUserSearch: "admin", JiraUser: "acc-1" };
            });
        }
        if (label === "Sprzęt") {
            return Promise.resolve(options.resolveOptions({ name: "PcName", control: "assetmulti" }, {}, options.item)).then(function () {
                return { PcName: "PC-01;PHONE-02" };
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
    document: {
        getElementById: function (id) {
            if (id !== "xxAddAgentModal") return null;
            return {
                classList: { contains: function (name) { return name === "show"; } },
                addEventListener: function () {
                    throw new Error("Wizard must not wait for a second modal hidden event after the shared dialog has already resolved.");
                }
            };
        }
    },
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
    extraHeaders: ["SirkWorkflow: JiraAssetProtocol"],
    variables: [
        { name: "JiraUser", label: "Jira user", required: true, control: "user" },
        { name: "PcName", label: "Asset", required: true, control: "asset" },
        { name: "IsTransferProtocol", label: "Transfer", required: true, control: "switch", defaultValue: "false" },
        { name: "ItPerson", label: "IT person", required: true, control: "user" }
    ]
};

sandbox.window.SharedScriptTools.openParameterDialog({ item: protocol, primaryLabel: "Run" }).then(function (values) {
    assert.strictEqual(calls.length, 3, "Jira protocol must use three sequential native shared dialogs before execution.");
    assert.deepStrictEqual(Array.prototype.map.call(calls[0].item.variables, function (item) { return item.name; }), ["JiraUserActiveOnly", "JiraUserSearch", "JiraUser"]);
    assert.strictEqual(calls[0].item.variables[0].control, "switch");
    assert.strictEqual(calls[0].item.variables[0].defaultValue, "true");
    assert.strictEqual(calls[0].item.variables[2].searchVariable, "JiraUserSearch");
    assert.strictEqual(calls[0].item.variables[2].label, "Użytkownicy");
    assert.strictEqual(calls[0].item.variables[2].listMode, true);
    assert.strictEqual(calls[0].item.variables[2].submitOnDoubleClick, true);
    assert.strictEqual(calls[0].item.description, "");
    assert.deepStrictEqual(Array.prototype.map.call(calls[1].item.variables, function (item) { return item.name; }), ["PcName"]);
    assert.strictEqual(calls[1].item.variables[0].control, "assetmulti");
    assert.strictEqual(calls[1].item.variables[0].label, "Sprzęt");
    assert.deepStrictEqual(Array.prototype.map.call(calls[2].item.variables, function (item) { return item.name; }), ["IsTransferProtocol", "ItPerson"]);
    assert.strictEqual(calls[2].item.variables[0].control, "select");
    assert.strictEqual(calls[2].item.variables[0].listMode, true);
    assert.strictEqual(calls[2].item.variables[0].options[0].label, "Przekazanie sprzętu");
    assert.strictEqual(calls[2].item.variables[0].options[1].label, "Odbiór sprzętu");
    assert.strictEqual(calls[2].item.variables[1].optionSource, "mesh-users");
    assert.strictEqual(providerCalls[0].name, "JiraUser");
    assert.strictEqual(providerCalls[1].name, "PcName");
    assert.strictEqual(providerCalls[1].values.JiraUser, "acc-1", "Asset step must receive the selected Jira user.");
    assert.strictEqual(providerCalls[2].values.PcName, "PC-01;PHONE-02", "Protocol step provider must receive every selected asset.");
    assert.strictEqual(values.JiraUser, "acc-1");
    assert.strictEqual(values.PcName, "PC-01;PHONE-02");
    assert.strictEqual(values.ItPerson, "it-1");
    assert.strictEqual(values.IsTransferProtocol, true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(values, "JiraUserSearch"), false,
        "Synthetic wizard-only filter must never be sent as a script variable.");
    assert.strictEqual(source.indexOf("afterModernHidden"), -1,
        "Wizard must chain from the shared dialog promise and must not wait for an extra hidden.bs.modal event that MeshCentral may not emit.");

    calls.length = 0;
    return sandbox.window.SharedScriptTools.openParameterDialog({
        item: { path: "Other.ps1", label: "Other", variables: [{ name: "X", control: "text" }], extraHeaders: [] }
    });
}).then(function (value) {
    assert.strictEqual(calls.length, 1, "Non-Jira scripts must keep the original shared parameter dialog path.");
    assert.strictEqual(value.passthrough, true);
    assert.ok(pluginMain.indexOf('load("sirk-platform-jira-protocol-wizard", asset("myscripts/jira-protocol-wizard.js"))') >= 0,
        "Canonical startup owner must load the wizard after the shared parameter dialog.");
    assert.ok(pluginMain.indexOf("var jiraProtocolWizardReady = parameterDialogReady.then") >= 0,
        "Wizard readiness must depend directly on the existing parameter-dialog promise.");
    assert.ok(adminSource.indexOf('"myscripts/jira-protocol-wizard.js": ["public/modules/automation/jira-protocol-wizard.js"') >= 0,
        "Canonical admin asset map must serve the wizard without a parallel wrapper.");
    assert.strictEqual(pluginMain.indexOf("MutationObserver"), -1, "Wizard startup must not add a DOM polling/observer loop.");
    assert.strictEqual(source.indexOf("window.prompt"), -1, "Wizard must never fall back to free-text browser prompts.");
    console.log("Jira protocol searchable user, multi-asset and Mesh IT shared-native wizard contract: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

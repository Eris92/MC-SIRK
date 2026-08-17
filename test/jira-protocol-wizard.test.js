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
var tools = {
    setParameterOptionProvider: function () {},
    openParameterDialog: function (options) {
        calls.push(options);
        return Promise.resolve({ passthrough: true });
    }
};
var sandbox = {
    window: { SharedScriptTools: tools },
    document: {},
    Promise: Promise,
    JSON: JSON,
    Object: Object,
    Array: Array,
    String: String,
    RegExp: RegExp,
    console: console
};
vm.runInNewContext(source, sandbox, { filename: "jira-protocol-wizard.js" });

var contract = sandbox.window.SharedScriptTools.jiraProtocolWizardContract;
assert.ok(contract && typeof contract.actionValues === "function");
assert.strictEqual(contract.actionValues([
    { value: "1001", checkbox: { checked: true }, select: { value: "return" } },
    { value: "1002", checkbox: { checked: true }, select: { value: "receive" } },
    { value: "1003", checkbox: { checked: true }, select: { value: "invalid" } },
    { value: "1004", checkbox: { checked: false }, select: { value: "receive" } }
]), '{"1001":"return","1002":"receive","1003":"none"}',
"Only selected assets may enter the bounded per-asset action payload and unknown operations must fail closed to no-change.");

assert.ok(source.indexOf('stepItem(item, "Jira Asset Protocol - User"') >= 0);
assert.ok(source.indexOf('stepItem(item, "Sprzęt do protokołu"') >= 0);
assert.ok(source.indexOf('stepItem(item, "Jira Asset Protocol - Protocol", "", [itPerson])') >= 0,
    "Final wizard step must contain only the MeshCentral IT person after per-asset actions move to step 2.");
assert.ok(source.indexOf("function prefetchAssets(values)") >= 0 && source.indexOf("onValuesChanged") >= 0,
    "Asset prefetch must still begin from the selected user before the equipment modal is opened.");
assert.ok(source.indexOf('asset.control = "assetmulti"') >= 0 && source.indexOf("assetStep.fitOptionWidth = true") >= 0);
assert.strictEqual(source.indexOf("IsTransferProtocol"), -1,
    "Global protocol direction must be removed from the wizard authority.");
assert.strictEqual(source.indexOf("afterModernHidden"), -1);
assert.strictEqual(source.indexOf("MutationObserver"), -1);
assert.strictEqual(source.indexOf("window.prompt"), -1);

var cache = {
    path: "settings/Jira/Cache Assets.ps1",
    label: "Cache - sprzęt",
    extraHeaders: ["SirkWorkflow: JiraAssetsCache"],
    variables: [{ name: "Force", label: "Wymuś odświeżenie", control: "switch", defaultValue: "false" }]
};

Promise.resolve(sandbox.window.SharedScriptTools.openParameterDialog({ item: cache })).then(function () {
    assert.strictEqual(calls.length, 1, "Jira cache must remain one shared native dialog.");
    assert.strictEqual(calls[0].item.variables[0].inlineControl, true,
        "Jira cache checkbox must render before its label on the left.");
    assert.strictEqual(cache.variables[0].inlineControl, undefined,
        "Jira cache UI preparation must not mutate the canonical script definition.");

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
    console.log("Jira protocol keeps cached searchable user prefetch, one equipment step with per-asset actions and Mesh IT final step: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

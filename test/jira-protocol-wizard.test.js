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
assert.ok(contract && typeof contract.buildProtocolSelection === "function");
assert.ok(typeof contract.splitInventory === "function" && typeof contract.filterOptions === "function");

var split = contract.splitInventory([
    { value: "1001", label: "Warehouse A", assignedToUser: false },
    { value: "1002", label: "User B", assignedToUser: true },
    { value: "1003", label: "Warehouse C" }
]);
assert.strictEqual(JSON.stringify(split.warehouse.map(function (item) { return item.value; })), '["1001","1003"]');
assert.strictEqual(JSON.stringify(split.user.map(function (item) { return item.value; })), '["1002"]');
assert.strictEqual(JSON.stringify(contract.filterOptions(split.warehouse, "c").map(function (item) { return item.value; })), '["1003"]');

var selection = contract.buildProtocolSelection(
    "1001",
    "1002",
    [
        { value: "1002", assignedToUser: true },
        { value: "1004", assignedToUser: true }
    ]
);
assert.strictEqual(selection.PcName, "1001;1002;1004");
assert.strictEqual(selection.JiraAssetActionsJson, '{"1001":"receive","1002":"return","1004":"none"}',
    "Warehouse selections must map to receive, user-equipment selections to return and unchanged current equipment to none.");
assert.throws(function () {
    contract.buildProtocolSelection("1001", "1001", []);
}, /jednocześnie przyjęty i zdany/,
"The same stable asset cannot be received and returned in one protocol.");

assert.ok(source.indexOf('stepItem(item, "Jira Asset Protocol - User"') >= 0);
assert.ok(source.indexOf('"Sprzęt z magazynu"') >= 0,
    "The first equipment step must be the optional warehouse handover selector.");
assert.ok(source.indexOf('"Sprzęt użytkownika"') >= 0,
    "The second equipment step must be the optional current-user return selector.");
assert.ok(source.indexOf('"WarehouseSearch"') >= 0 && source.indexOf('"UserEquipmentSearch"') >= 0,
    "Both equipment steps must expose a Search control.");
assert.ok(source.indexOf("preparedAsset.required = false") >= 0,
    "Warehouse and user return selections must both be optional.");
assert.ok(source.indexOf("function prefetchAssets(values)") >= 0 && source.indexOf("splitInventory(optionsValue)") >= 0,
    "One prefetched protocol inventory must feed both equipment steps.");
assert.ok(source.indexOf("localSearchProvider") >= 0,
    "Equipment Search must filter the prefetched option arrays without another Jira request.");
assert.ok(source.indexOf('stepItem(item, "Jira Asset Protocol - Protocol", "", [itPerson])') >= 0,
    "Final wizard step must remain the MeshCentral IT person only.");
assert.strictEqual(source.indexOf("Jira protocol equipment controls are unavailable."), -1,
    "The dev.110 live-DOM post-processing failure path must be removed.");
assert.strictEqual(source.indexOf("actionControls"), -1,
    "The wizard must not inject operation controls into MeshCentral modal DOM after mounting.");
assert.strictEqual(source.indexOf("addEventListener"), -1,
    "The split wizard must reuse shared parameter-dialog handlers instead of adding a local event lifecycle.");
assert.strictEqual(source.indexOf("IsTransferProtocol"), -1,
    "Global protocol direction must remain removed from wizard authority.");
assert.strictEqual(source.indexOf("MutationObserver"), -1);
assert.strictEqual(source.indexOf("setInterval"), -1);
assert.strictEqual(source.indexOf("setTimeout"), -1);
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
    console.log("Jira protocol reuses one inventory prefetch for searchable optional warehouse and user-return steps: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

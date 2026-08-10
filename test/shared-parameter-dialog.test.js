"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
function source(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var dialog = source("public/shared/ui/parameter-dialog.js");
var commands = source("public/modules/commands/index.js");
var scripts = source("public/modules/automation/index.js");
var quick = source("public/native/desktop-commands.js");
var pluginMain = source("plugin-main.js");
var admin = source("admin.js");
var publicIndex = source("public/INDEX.md");

assert.ok(admin.indexOf('"shared-ui/parameter-dialog.js": ["public/shared/ui/parameter-dialog.js"') >= 0,
    "The parameter dialog must be served by the canonical asset router.");
assert.ok(pluginMain.indexOf('var scriptToolsReady = load("sirk-platform-script-tools", asset("shared-ui/script-tools.js"));') >= 0,
    "The loader must expose the real script-tools readiness dependency.");
assert.ok(pluginMain.indexOf('var parameterDialogReady = scriptToolsReady.then(function ()') >= 0,
    "The parameter dialog must load after SharedScriptTools.");
assert.ok(pluginMain.indexOf('deferredReady.push(parameterDialogReady.then(function ()') >= 0 &&
    pluginMain.indexOf('return load("sirk-platform-desktop-commands", asset("desktop-commands.js"));') >= 0,
    "Quick must load only after the shared parameter dialog is ready.");
assert.ok(publicIndex.indexOf("public/shared/ui/parameter-dialog.js") >= 0,
    "The frontend index must document the shared parameter dialog asset.");

assert.strictEqual(commands.indexOf("function valueControls"), -1,
    "Commands must not keep a module-local runtime-variable renderer.");
assert.strictEqual(scripts.indexOf("function variableEditor"), -1,
    "My Scripts must not keep a module-local runtime-variable renderer.");
assert.strictEqual(quick.indexOf("function variableForm"), -1,
    "Quick must not keep a module-local runtime-variable renderer.");
assert.strictEqual(quick.indexOf("sirk-quick-command-field"), -1,
    "Quick details must no longer render parameter fields inline.");
assert.strictEqual(scripts.indexOf("mc-script-run-variables"), -1,
    "My Scripts must no longer render parameter controls inline.");
assert.strictEqual(commands.indexOf("mc-script-runtime-variables"), -1,
    "Commands must no longer render parameter controls inline.");

[commands, scripts, quick].forEach(function (consumer, index) {
    assert.ok(consumer.indexOf("openParameterDialog") >= 0,
        "Execution consumer " + index + " must use the shared parameter dialog.");
});
assert.ok(commands.indexOf("mc-command-inline-result") >= 0,
    "Commands output must remain in the existing inline result host.");
assert.ok(scripts.indexOf('mc-script-live-result mc-script-result-only') >= 0,
    "My Scripts output must remain in the canonical live result host.");
assert.ok(quick.indexOf("sirk-quick-command-status") >= 0 && quick.indexOf("state.output") >= 0,
    "Quick output state and host must remain owned by Quick.");
assert.ok(commands.indexOf("variableValues: values || {}") >= 0,
    "Commands Multi must forward the values collected once by the shared dialog.");

["text", "select", "switch", "user", "asset"].forEach(function (kind) {
    assert.ok(dialog.indexOf('"' + kind + '"') >= 0, "Shared parameter dialog must support " + kind + " controls.");
});
assert.strictEqual(dialog.indexOf("window.prompt"), -1, "The shared dialog must not use browser prompt input.");
assert.strictEqual(dialog.indexOf("MutationObserver"), -1, "The shared dialog must not add a MutationObserver.");
assert.strictEqual(dialog.indexOf("setInterval("), -1, "The shared dialog must not add polling.");
assert.strictEqual(dialog.indexOf("setTimeout("), -1, "The shared dialog lifecycle must not be timer-driven.");
assert.ok(dialog.indexOf("submitting || settled") >= 0,
    "The primary action must guard against duplicate submit.");
assert.ok(dialog.indexOf("provider(record.variable, currentValues(records), item)") >= 0,
    "Dynamic controls must share one bounded provider hook.");
assert.ok(dialog.indexOf('record.kind === "asset"') >= 0 && dialog.indexOf("onUserChanged") >= 0,
    "Asset controls must be refreshable after a real parent user change.");

var focused = false;
var invalid = false;
function fakeControl(value) {
    return {
        value: value,
        checked: false,
        disabled: false,
        removeAttribute: function () { invalid = false; },
        setAttribute: function (name) { if (name === "aria-invalid") invalid = true; },
        focus: function () { focused = true; }
    };
}
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
vm.runInNewContext(dialog, context, { filename: "parameter-dialog.js" });
var contract = context.window.SharedScriptTools.parameterDialogContract;
assert.ok(contract, "The shared parameter dialog must expose a targeted pure contract for regression tests.");
assert.strictEqual(contract.controlKind({ control: "USER" }), "user");
assert.strictEqual(contract.controlKind({ control: "asset" }), "asset");
assert.strictEqual(contract.controlKind({ control: "unknown" }), "text");

var required = fakeControl("");
var flag = fakeControl("");
flag.checked = false;
var records = [
    { variable: { name: "RequiredText", label: "Required text", required: true }, kind: "text", control: required },
    { variable: { name: "Flag", required: true }, kind: "switch", control: flag }
];
var status = { className: "", textContent: "" };
assert.strictEqual(contract.validate(records, status), null, "Required empty text must block submission.");
assert.strictEqual(focused, true, "Required validation must focus the first invalid control.");
assert.strictEqual(invalid, true, "Required validation must expose aria-invalid.");
required.value = "value";
focused = false;
var values = contract.validate(records, status);
assert.strictEqual(values.RequiredText, "value");
assert.strictEqual(values.Flag, false, "Switch values must preserve boolean mapping.");

console.log("Shared native execution parameter dialog, consumers, loader order and validation: OK");

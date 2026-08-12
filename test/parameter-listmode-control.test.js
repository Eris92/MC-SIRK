"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/shared/ui/parameter-dialog.js"), "utf8");
var context = {
    Promise: Promise,
    String: String,
    Array: Array,
    Object: Object,
    console: console,
    document: { documentElement: { lang: "en" } },
    window: {
        SharedScriptTools: { create: function () { return {}; } },
        localStorage: { getItem: function () { return "en"; } }
    }
};
context.window.window = context.window;
vm.runInNewContext(source, context, { filename: "parameter-dialog.js" });

var contract = context.window.SharedScriptTools.parameterDialogContract;
assert.ok(contract && typeof contract.controlElementTag === "function",
    "Shared parameter dialog must expose the control-element ownership contract.");
assert.strictEqual(contract.controlElementTag("select", false, true), "input",
    "A select rendered in listMode must use an INPUT state owner so type=hidden is writable.");
assert.strictEqual(contract.controlElementTag("user", false, true), "input",
    "A user rendered in listMode must use the same hidden INPUT state owner.");
assert.strictEqual(contract.controlElementTag("assetmulti", false, false), "input",
    "assetmulti must keep its hidden INPUT state owner.");
assert.strictEqual(contract.controlElementTag("select", false, false), "select",
    "An ordinary select must remain a SELECT.");
assert.strictEqual(contract.controlElementTag("asset", false, false), "select",
    "An ordinary asset control must remain a SELECT.");
assert.strictEqual(contract.controlElementTag("user", false, false), "select",
    "An ordinary non-custom user control must remain a SELECT.");
assert.strictEqual(contract.controlElementTag("user", true, false), "input",
    "A custom user control must remain an INPUT.");
assert.ok(source.indexOf("document.createElement(controlElementTag(kind, customUser, listMode))") >= 0,
    "buildContent must choose the element before assigning checklist input.type.");

console.log("Parameter list-mode and assetmulti hidden INPUT ownership: OK");

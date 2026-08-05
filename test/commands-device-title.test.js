"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "module-shell.js"),
    "utf8"
);

var context = {
    window: {
        SirkPlatformCore: {}
    },
    console: console,
    Number: Number,
    String: String,
    Promise: Promise,
    URL: URL
};
context.window.window = context.window;

vm.runInNewContext(source, context, { filename: "module-shell.js" });

var shell = context.window.SirkPlatformModuleShell;
assert.strictEqual(typeof shell.findDeviceTitleTextNode, "function",
    "The module shell must expose the native device-title node resolver.");
assert.strictEqual(typeof shell.formatDeviceTitle, "function",
    "The module shell must expose the device-title formatter.");

function text(value) {
    return { nodeType: 3, nodeValue: value };
}

function element(tagName, children) {
    return {
        nodeType: 1,
        tagName: String(tagName || "span").toUpperCase(),
        childNodes: children || []
    };
}

var backText = text("◀");
var nestedTitle = text("Wtyczki - Dell_K");
var nestedHeader = element("h1", [
    element("button", [backText]),
    element("span", [nestedTitle]),
    element("svg", [text("ignored")])
]);

assert.strictEqual(shell.findDeviceTitleTextNode(nestedHeader), nestedTitle,
    "A nested MeshCentral title must be selected instead of back-button or SVG text.");
assert.strictEqual(shell.formatDeviceTitle(nestedTitle.nodeValue, "Commands"), "Commands - Dell_K",
    "The translated Plugins prefix must change to Commands while preserving the PC name.");

var directTitle = text("Plugins");
var deviceSuffix = text(" - TEST-PC");
var splitHeader = element("h1", [directTitle, element("span", [deviceSuffix])]);
assert.strictEqual(shell.findDeviceTitleTextNode(splitHeader), directTitle,
    "The native direct title node must remain supported.");
assert.strictEqual(shell.formatDeviceTitle(directTitle.nodeValue, "Commands"), "Commands",
    "A separately rendered device suffix must not be duplicated into the title node.");
assert.strictEqual(deviceSuffix.nodeValue, " - TEST-PC",
    "The native device suffix element must remain unchanged.");

assert.strictEqual(
    shell.formatDeviceTitle("  Wtyczki - PC-01  ", "Commands"),
    "  Commands - PC-01  ",
    "Leading and trailing spacing from the native heading must be preserved."
);
assert.ok(source.indexOf("host.__sirkNativeDeviceTitleText = current") >= 0,
    "The original native Plugins title must be stored before Commands is displayed.");
assert.ok(source.indexOf("delete host.__sirkNativeDeviceTitleText") >= 0,
    "The stored native title must be released after returning to Plugins.");

console.log("Nested Commands - <PC> device title and native restoration: OK");

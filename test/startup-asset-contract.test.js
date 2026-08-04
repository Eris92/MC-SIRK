"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
}

var pluginMain = read("plugin-main.js");
var admin = read("admin.js");
var controllerPath = path.join(root, "public", "native", "quick-output-state.js");

assert.ok(
    pluginMain.indexOf('["sirk-platform-quick-output-state", "quick-output-state.js"]') >= 0,
    "The Quick output controller must be present in the serialized browser startup chain."
);
assert.ok(
    admin.indexOf('"quick-output-state.js": ["public/native/quick-output-state.js", "text/javascript; charset=utf-8"]') >= 0,
    "Every startup script must be exposed by pluginadmin.ashx with a JavaScript MIME type."
);
assert.ok(
    fs.existsSync(controllerPath) && fs.statSync(controllerPath).isFile(),
    "The mapped Quick output controller file must exist."
);
assert.ok(
    read("public/native/quick-output-state.js").indexOf("window.SirkQuickOutputState") >= 0,
    "The Quick output controller must expose its diagnostic API after loading."
);

console.log("Startup asset MIME contract: OK");

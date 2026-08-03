"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var modulesRoot = path.join(root, "server", "modules");

fs.readdirSync(modulesRoot, { withFileTypes: true })
    .filter(function (entry) { return entry.isDirectory() && fs.existsSync(path.join(modulesRoot, entry.name, "index.js")); })
    .forEach(function (entry) {
        var modulePath = path.join(modulesRoot, entry.name, "index.js");
        assert.ok(fs.existsSync(modulePath), "Missing module entrypoint: " + entry.name);
        var loaded = require(modulePath);
        assert.strictEqual(typeof loaded.createModule, "function", "Module must export createModule(context): " + entry.name);
    });

console.log("Runtime module loading: OK");

"use strict";

var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var checks = [
    "scripts/validate-repository-layout.js",
    "scripts/validate-architecture.js"
];
var tests = fs.readdirSync(path.join(root, "test"))
    .filter(function (name) { return /\.test\.js$/i.test(name); })
    .sort()
    .map(function (name) { return path.join("test", name); });

checks.concat(tests).forEach(function (relativePath) {
    var result = childProcess.spawnSync(process.execPath, [path.join(root, relativePath)], {
        cwd: root,
        stdio: "inherit"
    });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
});

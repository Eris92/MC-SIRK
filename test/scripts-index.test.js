"use strict";

var assert = require("assert");
var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var trackedFiles = childProcess.execFileSync("git", ["ls-files", "-z", "--", "scripts/"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
}).split("\0").filter(Boolean);
var index = fs.readFileSync(path.join(root, "scripts", "INDEX.md"), "utf8");
var mentions = new Set(Array.from(index.matchAll(/`([^`\r\n]+)`/g), function (match) {
    return match[1];
}));
var missing = trackedFiles.filter(function (file) { return !mentions.has(file); });

assert.ok(trackedFiles.length > 0, "Git nie zwrócił śledzonych plików scripts/.");
assert.deepStrictEqual(missing, [], "Brak plików w scripts/INDEX.md: " + missing.join(", "));
console.log("scripts-index.test.js: PASS (" + trackedFiles.length + " śledzonych plików)");

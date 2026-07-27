"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..", "public");
var offenders = [];

function duplicateNames(value) {
    var seen = Object.create(null);
    return String(value || "").trim().split(/\s+/).filter(Boolean).filter(function (name) {
        if (seen[name]) return true;
        seen[name] = true;
        return false;
    });
}

function inspectClassList(file, line, index) {
    var patterns = [/className\s*=\s*"([^"]*)"/g, /class\s*=\s*"([^"]*)"/g];
    patterns.forEach(function (pattern) {
        var match;
        while ((match = pattern.exec(line))) {
            var duplicates = duplicateNames(match[1]);
            if (duplicates.length) offenders.push(path.relative(root, file) + ":" + (index + 1) + " repeats classes: " + duplicates.join(", "));
        }
    });
}

function walk(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach(function (entry) {
        var file = path.join(directory, entry.name);
        if (entry.isDirectory()) { if (entry.name !== "native") walk(file); return; }
        if (!/\.(js|css|html)$/i.test(entry.name)) return;
        var source = fs.readFileSync(file, "utf8");
        source.split(/\r?\n/).forEach(function (line, index) {
            if (!/standalone[\\/]scripts[\\/]cleanup\.js$/i.test(file) && /\bmc-[a-z0-9-]+/i.test(line)) offenders.push(path.relative(root, file) + ":" + (index + 1) + " contains mc-* class");
            if (!/portal[\\/]standalone[\\/]scripts[\\/]app\.js$/i.test(file) && !/portal[\\/]management\.js$/i.test(file) && !/shared[\\/]icon-registry\.js$/i.test(file)) inspectClassList(file, line, index);
        });
    });
}

walk(root);
assert.deepStrictEqual(offenders, [], "Forbidden Portal classes:\n" + offenders.join("\n"));

var page = fs.readFileSync(path.join(root, "shared", "ui", "page.js"), "utf8");
var layout = fs.readFileSync(path.join(root, "shared", "ui", "layout.js"), "utf8");
assert.ok(page.indexOf('host.className = "sirk-standalone-view-scroll"') >= 0, "Every shared page must use sirk-standalone-view-scroll.");
["sirk-column-primary", "sirk-column-secondary", "sirk-column-details"].forEach(function (name) {
    assert.ok(layout.indexOf('div("' + name + '")') >= 0, "Missing standalone canonical layout class: " + name);
});
assert.ok(layout.indexOf('div("sirk-column ') < 0, "Column variants must not include the redundant sirk-column base class.");
console.log("Portal class contract: OK");

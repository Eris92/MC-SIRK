"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var results = fs.readFileSync(path.join(root, "public/shared/ui/results.js"), "utf8");
var css = fs.readFileSync(path.join(root, "public/shared/ui/shared-ui.css"), "utf8");
var approvals = fs.readFileSync(path.join(root, "public/modules/approvals/index.js"), "utf8");

assert.ok(css.indexOf('.mc-results-table-wrap{width:100%;overflow:auto}') >= 0,
    "Shared Results wrapper must own horizontal overflow.");
assert.ok(css.indexOf('.mc-results-table{width:100%;min-width:620px;border-collapse:collapse;table-layout:auto}') >= 0,
    "Shared Results tables must use readable auto layout with a baseline minimum.");
assert.strictEqual(css.indexOf('table-layout:fixed'), -1,
    "Shared Results must not force fixed-layout column compression.");
assert.ok(css.indexOf('.mc-results-table.mc-results-table-medium{min-width:780px}') >= 0 &&
    css.indexOf('.mc-results-table.mc-results-table-wide{min-width:1040px}') >= 0,
    "Column-count classes must increase the shared minimum width for wider tables.");
assert.ok(results.indexOf('if (columnCount >= 7) return "mc-results-table-wide"') >= 0 &&
    results.indexOf('if (columnCount >= 4) return "mc-results-table-medium"') >= 0,
    "SharedResultsView must classify table width by rendered column count without DOM measurement.");
assert.ok(results.indexOf('renderedColumnCount = columns.length + (options.showView !== false ? 1 : 0) + (typeof options.actions === "function" ? 1 : 0)') >= 0,
    "A 7-9 column fixture must include View/Actions in the width class decision.");
assert.ok(results.indexOf('mc-results-structured-table " + tableWidthClass(columns.length)') >= 0,
    "Structured result tables must reuse the same count-based width contract.");

["datetime", "status", "approval"].forEach(function (title) {
    assert.ok(results.indexOf('key === "' + title + '"') >= 0,
        "Short result column must have a stable semantic role: " + title);
});
["request", "summary", "command", "script", "device", "result"].forEach(function (title) {
    assert.ok(results.indexOf('key === "' + title + '"') >= 0,
        "Long result column must have a readable text role: " + title);
});
assert.ok(css.indexOf('.mc-results-table .mc-results-col-short{min-width:105px;white-space:nowrap}') >= 0,
    "DateTime/Status/Approval style columns must stay compact and unbroken.");
assert.ok(css.indexOf('.mc-results-table .mc-results-col-text{min-width:210px;width:280px;max-width:420px;white-space:normal;word-break:normal;overflow-wrap:normal}') >= 0,
    "Request/Summary/Command/Script/Device text must wrap normally only after a readable minimum.");
assert.strictEqual(/\.mc-results-table[^}]*word-break:break-all/.test(css), false,
    "Result tables must never break words character-by-character to avoid horizontal scrolling.");
assert.ok(approvals.indexOf('{ title: "Request"') >= 0 && approvals.indexOf('{ title: "Summary"') >= 0 && approvals.indexOf('{ title: "Status"') >= 0,
    "Approval Center must continue using SharedResultsView columns consumed by the shared semantic width contract.");
assert.strictEqual(results.indexOf('ResizeObserver'), -1,
    "Results readability must not add ResizeObserver autosizing.");
assert.strictEqual(results.indexOf('getBoundingClientRect'), -1,
    "Results readability must not measure cells or tables at runtime.");

console.log("Shared Results tables preserve readable columns and scroll horizontally instead of compressing: OK");

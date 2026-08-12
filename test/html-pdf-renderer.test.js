"use strict";

var assert = require("assert");
var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var renderer = require(path.join(root, "server/core/html-pdf-renderer.js"));

(async function () {
    var originalExecFile = childProcess.execFile;
    var observedDirectory = "";
    try {
        childProcess.execFile = function (executable, args, options, callback) {
            assert.strictEqual(executable, "C:\\Test\\msedge.exe");
            var profileArg = args.filter(function (arg) { return arg.indexOf("--user-data-dir=") === 0; })[0];
            var pdfArg = args.filter(function (arg) { return arg.indexOf("--print-to-pdf=") === 0; })[0];
            assert.ok(profileArg, "Headless browser must use one isolated per-render user-data-dir.");
            assert.ok(pdfArg, "Headless browser must receive the bounded output PDF path.");
            observedDirectory = path.dirname(pdfArg.slice("--print-to-pdf=".length));
            assert.strictEqual(profileArg.slice("--user-data-dir=".length), path.join(observedDirectory, "browser-profile"),
                "Browser profile must live inside the unique render temp directory.");
            assert.strictEqual(options.cwd, observedDirectory,
                "Browser process working directory must be the same writable per-render temp directory.");
            assert.strictEqual(args.indexOf("--no-first-run") >= 0, true);
            assert.strictEqual(args.indexOf("--no-default-browser-check") >= 0, true);
            fs.writeFileSync(pdfArg.slice("--print-to-pdf=".length), Buffer.from("%PDF-1.7\nTEST\n"));
            callback(null, "", "");
        };

        var pdf = await renderer.renderHtmlPdf("<html><body>test</body></html>", {
            browserPath: "C:\\Test\\msedge.exe"
        });
        assert.ok(Buffer.isBuffer(pdf));
        assert.strictEqual(pdf.slice(0, 8).toString("ascii").indexOf("%PDF-1."), 0);
        assert.ok(observedDirectory && !fs.existsSync(observedDirectory),
            "Per-render HTML/PDF/browser profile directory must be removed after completion.");

        childProcess.execFile = function (executable, args, options, callback) {
            callback(new Error("exit 1"), "", "profile initialization failed");
        };
        await assert.rejects(function () {
            return renderer.renderHtmlPdf("<html><body>fail</body></html>", {
                browserPath: "C:\\Test\\msedge.exe"
            });
        }, /Browser PDF renderer failed: profile initialization failed/,
        "Browser stderr must be retained in the bounded runtime failure instead of only returning the command line.");

        console.log("HTML PDF renderer isolated browser profile and diagnostics: OK");
    } finally {
        childProcess.execFile = originalExecFile;
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

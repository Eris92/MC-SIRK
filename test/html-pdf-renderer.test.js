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
            assert.ok(args.indexOf("--headless") >= 0,
                "Edge print-to-PDF must prefer the compatibility headless flag before retrying --headless=new.");
            assert.strictEqual(args.indexOf("--headless=new"), -1);
            assert.strictEqual(profileArg.indexOf("\\"), -1,
                "Edge profile path must use portable forward slashes to avoid Windows headless print path regressions.");
            assert.strictEqual(pdfArg.indexOf("\\"), -1,
                "Edge PDF output path must use portable forward slashes.");
            observedDirectory = path.dirname(pdfArg.slice("--print-to-pdf=".length));
            assert.strictEqual(options.cwd.replace(/\\/g, "/"), observedDirectory.replace(/\\/g, "/"),
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

        var calls = 0;
        childProcess.execFile = function (executable, args, options, callback) {
            calls++;
            var pdfArg = args.filter(function (arg) { return arg.indexOf("--print-to-pdf=") === 0; })[0];
            if (calls === 1) {
                assert.ok(args.indexOf("--headless") >= 0 && args.indexOf("--headless=new") < 0);
                return callback(new Error("exit 1"), "", "edge default headless failed");
            }
            assert.ok(args.indexOf("--headless=new") >= 0,
                "Edge must retry once with --headless=new after the compatibility mode fails.");
            fs.writeFileSync(pdfArg.slice("--print-to-pdf=".length), Buffer.from("%PDF-1.7\nRETRY\n"));
            callback(null, "", "");
        };
        var retryPdf = await renderer.renderHtmlPdf("<html><body>retry</body></html>", {
            browserPath: "C:\\Test\\msedge.exe"
        });
        assert.strictEqual(calls, 2, "Edge renderer retry must be bounded to one alternate headless mode.");
        assert.ok(Buffer.isBuffer(retryPdf));

        childProcess.execFile = function (executable, args, options, callback) {
            if (args.indexOf("--headless") >= 0 && args.indexOf("--headless=new") < 0) {
                return callback(new Error("exit 1"), "", "profile initialization failed");
            }
            callback(new Error("exit 2"), "", "alternate headless failed");
        };
        await assert.rejects(function () {
            return renderer.renderHtmlPdf("<html><body>fail</body></html>", {
                browserPath: "C:\\Test\\msedge.exe"
            });
        }, /Browser PDF renderer failed: edge-headless: profile initialization failed \| edge-headless-new: alternate headless failed/,
        "Both bounded Edge attempts must retain useful stderr instead of only returning the command line.");

        console.log("HTML PDF renderer isolated Edge profile, portable paths, bounded retry and diagnostics: OK");
    } finally {
        childProcess.execFile = originalExecFile;
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

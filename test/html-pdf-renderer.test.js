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
            assert.ok(profileArg);
            assert.ok(pdfArg);
            assert.ok(args.indexOf("--headless") >= 0);
            assert.strictEqual(args.indexOf("--headless=new"), -1);
            assert.strictEqual(profileArg.indexOf("\\"), -1);
            assert.strictEqual(pdfArg.indexOf("\\"), -1);
            observedDirectory = path.dirname(pdfArg.slice("--print-to-pdf=".length));
            assert.strictEqual(options.cwd.replace(/\\/g, "/"), observedDirectory.replace(/\\/g, "/"));
            fs.writeFileSync(pdfArg.slice("--print-to-pdf=".length), Buffer.from("%PDF-1.7\nTEST\n"));
            callback(null, "", "");
        };

        var pdf = await renderer.renderHtmlPdf("<html><body>test</body></html>", { browserPath: "C:\\Test\\msedge.exe" });
        assert.ok(Buffer.isBuffer(pdf));
        assert.strictEqual(pdf.slice(0, 8).toString("ascii").indexOf("%PDF-1."), 0);
        assert.ok(observedDirectory && !fs.existsSync(observedDirectory));

        var calls = 0;
        childProcess.execFile = function (executable, args, options, callback) {
            calls++;
            var pdfArg = args.filter(function (arg) { return arg.indexOf("--print-to-pdf=") === 0; })[0];
            if (calls === 1) return callback(new Error("exit 1"), "", "edge default headless failed");
            assert.ok(args.indexOf("--headless=new") >= 0);
            fs.writeFileSync(pdfArg.slice("--print-to-pdf=".length), Buffer.from("%PDF-1.7\nRETRY\n"));
            callback(null, "", "");
        };
        var retryPdf = await renderer.renderHtmlPdf("<html><body>retry</body></html>", { browserPath: "C:\\Test\\msedge.exe" });
        assert.strictEqual(calls, 2);
        assert.ok(Buffer.isBuffer(retryPdf));

        calls = 0;
        childProcess.execFile = function (executable, args, options, callback) {
            calls++;
            if (calls === 1) return callback(new Error("exit 1"), "", "profile initialization failed");
            callback(new Error("exit 2"), "", "alternate headless failed");
        };
        var fallbackPdf = await renderer.renderHtmlPdf("<html><body>fail</body></html>", {
            browserPath: "C:\\Test\\msedge.exe",
            fallbackText: "PROTOKOL\nUzytkownik: Test\nSprzet: PC-01"
        });
        assert.strictEqual(calls, 2, "Both bounded Edge modes must run before the direct fallback.");
        assert.ok(Buffer.isBuffer(fallbackPdf) && fallbackPdf.length >= 100);
        assert.strictEqual(fallbackPdf.slice(0, 8).toString("ascii").indexOf("%PDF-1."), 0,
            "Edge failure with fallbackText must return direct PDF bytes instead of bubbling the Edge command error.");

        calls = 0;
        childProcess.execFile = function (executable, args, options, callback) {
            calls++;
            callback(new Error("exit"), "", calls === 1 ? "profile initialization failed" : "alternate headless failed");
        };
        await assert.rejects(function () {
            return renderer.renderHtmlPdf("<html><body>fail</body></html>", { browserPath: "C:\\Test\\msedge.exe" });
        }, /Browser PDF renderer failed:/,
        "Callers without fallbackText must retain browser failure diagnostics.");

        console.log("HTML PDF renderer browser path, bounded Edge retry and renderer-owned direct fallback: OK");
    } finally {
        childProcess.execFile = originalExecFile;
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

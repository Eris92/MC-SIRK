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
            assert.ok(args.indexOf("--allow-run-as-system") >= 0,
                "Edge must explicitly allow the MeshCentral LocalSystem service context without disabling its sandbox.");
            assert.strictEqual(args.indexOf("--no-sandbox"), -1,
                "The LocalSystem compatibility path must retain the Edge sandbox.");
            assert.strictEqual(profileArg.indexOf("\\"), -1,
                "Edge profile path must use portable forward slashes to avoid Windows headless print path regressions.");
            assert.strictEqual(pdfArg.indexOf("\\"), -1, "Edge PDF output path must use portable forward slashes.");
            observedDirectory = path.dirname(pdfArg.slice("--print-to-pdf=".length));
            assert.strictEqual(options.cwd.replace(/\\/g, "/"), observedDirectory.replace(/\\/g, "/"));
            assert.strictEqual(args.indexOf("--no-first-run") >= 0, true);
            assert.strictEqual(args.indexOf("--no-default-browser-check") >= 0, true);
            var renderedHtml = fs.readFileSync(path.join(options.cwd, "protocol.html"), "utf8");
            assert.ok(renderedHtml.indexOf('<div class="brand-fallback">LOGO</div>') >= 0,
                "A missing custom logo must use a neutral LOGO placeholder.");
            assert.strictEqual(renderedHtml.indexOf("INVESTA"), -1,
                "The shared protocol template must not inject company-specific fallback branding.");
            fs.writeFileSync(pdfArg.slice("--print-to-pdf=".length), Buffer.from("%PDF-1.7\nTEST\n"));
            callback(null, "", "");
        };

        var pdf = await renderer.renderHtmlPdf("<html><body>__SIRK_DOCUMENT_LOGO_MARKUP__</body></html>", {
            browserPath: "C:\\Test\\msedge.exe",
            logoPath: path.join(root, "test", "missing-protocol-logo.svg")
        });
        assert.ok(Buffer.isBuffer(pdf));
        assert.ok(observedDirectory && !fs.existsSync(observedDirectory));

        var calls = 0;
        childProcess.execFile = function (executable, args, options, callback) {
            calls++;
            var pdfArg = args.filter(function (arg) { return arg.indexOf("--print-to-pdf=") === 0; })[0];
            if (calls === 1) return callback(new Error("exit 1"), "", "edge default headless failed");
            assert.ok(args.indexOf("--headless=new") >= 0);
            assert.ok(args.indexOf("--allow-run-as-system") >= 0);
            fs.writeFileSync(pdfArg.slice("--print-to-pdf=".length), Buffer.from("%PDF-1.7\nRETRY\n"));
            callback(null, "", "");
        };
        var retryPdf = await renderer.renderHtmlPdf("<html><body>retry</body></html>", {
            browserPath: "C:\\Test\\msedge.exe"
        });
        assert.strictEqual(calls, 2);
        assert.ok(Buffer.isBuffer(retryPdf));

        calls = 0;
        childProcess.execFile = function (executable, args, options, callback) {
            calls++;
            callback(new Error("exit " + calls), "", calls === 1 ? "profile initialization failed" : "alternate headless failed");
        };
        var fallbackPdf = await renderer.renderHtmlPdf("<html><body>fail</body></html>", {
            browserPath: "C:\\Test\\msedge.exe",
            fallbackText: "PROTOKOL\nUzytkownik: Test\nSprzet: PC-01"
        });
        assert.strictEqual(calls, 2);
        assert.ok(Buffer.isBuffer(fallbackPdf) && fallbackPdf.length >= 100);
        assert.ok(String(fallbackPdf.sirkFallbackReason).indexOf("profile initialization failed") >= 0);

        console.log("HTML PDF renderer isolated Edge profile, retry and direct fallback: OK");
    } finally {
        childProcess.execFile = originalExecFile;
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

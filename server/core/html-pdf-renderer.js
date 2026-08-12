"use strict";

var childProcess = require("child_process");
var os = require("os");
var path = require("path");
var fs = require("fs");
var pathToFileURL = require("url").pathToFileURL;
var pdfTextRenderer = require("./pdf-text-renderer.js");

function browserPath() {
    var candidates = process.platform === "win32" ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
    ] : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
    return candidates.filter(function (candidate) { return fs.existsSync(candidate); })[0] || "";
}

function fileUrl(filePath) {
    return pathToFileURL(path.resolve(filePath)).href;
}

function removeTree(directory) {
    try { fs.rmSync(directory, { recursive: true, force: true }); } catch (error) {}
}

function edgeExecutable(executable) {
    return /(^|[\\/])msedge\.exe$/i.test(String(executable || ""));
}

function browserFilePath(filePath, portable) {
    filePath = String(filePath || "");
    return portable ? filePath.replace(/\\/g, "/") : filePath;
}

function browserArguments(directory, htmlPath, pdfPath, options) {
    options = options || {};
    var headless = options.headless === "default" ? "--headless" : "--headless=" + (options.headless || "new");
    var portable = options.portablePaths === true;
    return [
        headless,
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--user-data-dir=" + browserFilePath(path.join(directory, "browser-profile"), portable),
        "--no-pdf-header-footer",
        "--print-to-pdf=" + browserFilePath(pdfPath, portable),
        fileUrl(htmlPath)
    ];
}

function failureDetail(error, stdout, stderr) {
    var detail = String(stderr || stdout || error && error.message || error || "Browser process failed.").trim();
    return detail.replace(/\s+/g, " ").slice(0, 1200);
}

function failureMessage(failures) {
    return "Browser PDF renderer failed: " + failures.join(" | ").slice(0, 2000);
}

function validPdf(value) {
    return Buffer.isBuffer(value) && value.slice(0, 8).toString("ascii").indexOf("%PDF-1.") === 0;
}

function directFallback(options, browserError) {
    var fallbackText = String(options && options.fallbackText || "").trim();
    if (!fallbackText) throw browserError;
    try {
        var pdf = pdfTextRenderer.renderTextPdf(fallbackText);
        if (!validPdf(pdf)) throw new Error("Direct PDF fallback returned invalid bytes.");
        return pdf;
    } catch (fallbackError) {
        throw new Error("PDF renderers failed: browser=" + failureDetail(browserError) + "; fallback=" + failureDetail(fallbackError));
    }
}

function renderHtmlPdf(html, options) {
    options = options || {};
    var executable = options.browserPath || browserPath();
    if (!executable) {
        try { return Promise.resolve(directFallback(options, new Error("Chrome or Edge is required for styled protocol PDF rendering."))); }
        catch (error) { return Promise.reject(error); }
    }
    var directory = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-protocol-pdf-"));
    var htmlPath = path.join(directory, "protocol.html");
    var pdfPath = path.join(directory, "protocol.pdf");
    var logoPath = options.logoPath || path.join(__dirname, "..", "assets", "investa-logo.png");
    var extension = path.extname(logoPath).toLowerCase();
    var mime = extension === ".svg" ? "image/svg+xml" : (extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png");
    var logoMarkup = fs.existsSync(logoPath) ? '<img class="brand-logo" alt="INVESTA" src="data:' + mime + ';base64,' + fs.readFileSync(logoPath).toString("base64") + '" />' : '<div class="brand-fallback">INVESTA</div>';
    html = String(html || "").replace(/__SIRK_DOCUMENT_LOGO_MARKUP__/g, logoMarkup);
    fs.writeFileSync(htmlPath, html, "utf8");

    var attempts = edgeExecutable(executable) ? [
        { headless: "default", portablePaths: true, label: "edge-headless" },
        { headless: "new", portablePaths: true, label: "edge-headless-new" }
    ] : [
        { headless: "new", portablePaths: false, label: "headless-new" }
    ];
    var failures = [];

    function runAttempt(index) {
        var attempt = attempts[index];
        try { fs.unlinkSync(pdfPath); } catch (ignore) {}
        return new Promise(function (resolve, reject) {
            childProcess.execFile(executable, browserArguments(directory, htmlPath, pdfPath, attempt), {
                windowsHide: true,
                timeout: 45000,
                cwd: directory,
                maxBuffer: 2 * 1024 * 1024
            }, function (error, stdout, stderr) {
                if (error) return reject(new Error(failureDetail(error, stdout, stderr)));
                try {
                    var result = fs.readFileSync(pdfPath);
                    if (!validPdf(result)) throw new Error("Browser returned invalid PDF bytes.");
                    resolve(result);
                } catch (failure) {
                    reject(failure);
                }
            });
        }).catch(function (error) {
            failures.push(attempt.label + ": " + failureDetail(error));
            if (index + 1 < attempts.length) return runAttempt(index + 1);
            throw new Error(failureMessage(failures));
        });
    }

    return runAttempt(0).catch(function (browserError) {
        return directFallback(options, browserError);
    }).finally(function () { removeTree(directory); });
}

module.exports = {
    renderHtmlPdf: renderHtmlPdf,
    browserPath: browserPath,
    browserArguments: browserArguments
};

"use strict";

var childProcess = require("child_process");
var os = require("os");
var path = require("path");
var fs = require("fs");
var pathToFileURL = require("url").pathToFileURL;

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

function renderHtmlPdf(html, options) {
    options = options || {};
    var executable = options.browserPath || browserPath();
    if (!executable) return Promise.reject(new Error("Chrome or Edge is required for styled protocol PDF rendering."));
    var directory = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-protocol-pdf-"));
    var htmlPath = path.join(directory, "protocol.html");
    var pdfPath = path.join(directory, "protocol.pdf");
    var logoPath = options.logoPath || path.join(__dirname, "..", "assets", "investa-logo.png");
    var extension = path.extname(logoPath).toLowerCase();
    var mime = extension === ".svg" ? "image/svg+xml" : (extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png");
    var logoMarkup = fs.existsSync(logoPath) ? '<img class="brand-logo" alt="INVESTA" src="data:' + mime + ';base64,' + fs.readFileSync(logoPath).toString("base64") + '" />' : '<div class="brand-fallback">INVESTA</div>';
    html = String(html || "").replace(/__SIRK_DOCUMENT_LOGO_MARKUP__/g, logoMarkup);
    fs.writeFileSync(htmlPath, html, "utf8");
    return new Promise(function (resolve, reject) {
        childProcess.execFile(executable, [
            "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
            "--print-to-pdf=" + pdfPath, fileUrl(htmlPath)
        ], { windowsHide: true, timeout: 45000 }, function (error) {
            try {
                if (error) throw error;
                var result = fs.readFileSync(pdfPath);
                if (result.slice(0, 8).toString("ascii").indexOf("%PDF-1.") !== 0) throw new Error("Browser returned invalid PDF bytes.");
                resolve(result);
            } catch (failure) { reject(failure); }
            finally { removeTree(directory); }
        });
    });
}

module.exports = { renderHtmlPdf: renderHtmlPdf, browserPath: browserPath };

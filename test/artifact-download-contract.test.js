"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var artifactFactory = require(path.join(root, "server/core/artifact-service.js"));
var adminSource = fs.readFileSync(path.join(root, "admin.js"), "utf8");
var resultsSource = fs.readFileSync(path.join(root, "public/shared/ui/results.js"), "utf8");

var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-artifacts-"));
try {
    var service = artifactFactory.createArtifactService({ fs: fs, path: path, dataRoot: temp });
    var requestId = "Req_123456";
    var artifact = service.create(requestId, {
        type: "pdf",
        data: Buffer.from("%PDF-1.4\n% test artifact\n", "utf8"),
        fileName: "protocol.pdf",
        label: "Open PDF",
        autoOpen: true
    });

    assert.strictEqual(artifact.requestId, requestId);
    assert.strictEqual(artifact.type, "pdf");
    assert.strictEqual(artifact.label, "Open PDF");
    assert.strictEqual(artifact.autoOpen, true);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(artifact, "path"), false,
        "Public artifact metadata must never expose a filesystem path.");

    var resolved = service.resolve(requestId, artifact.id);
    assert.strictEqual(resolved.contentType, "application/pdf");
    assert.strictEqual(resolved.fileName, "protocol.pdf");
    assert.ok(resolved.path.indexOf(path.join(temp, "artifacts", requestId)) === 0,
        "Artifact payload must stay in canonical dataRoot/artifacts/requestId.");
    assert.strictEqual(fs.readFileSync(resolved.path, "utf8").indexOf("%PDF-1.4"), 0,
        "Artifact service must persist the actual payload bytes.");

    ["../escape", "C:/escape", "/absolute", "..", "a/b/c"].forEach(function (bad) {
        assert.throws(function () { service.resolve(bad, artifact.id); }, /Invalid artifact identifier/,
            "Request IDs must reject path-like input: " + bad);
        assert.throws(function () { service.resolve(requestId, bad); }, /Invalid artifact identifier/,
            "Artifact IDs must reject path-like input: " + bad);
    });
    assert.throws(function () {
        service.create(requestId, { type: "exe", data: Buffer.from("bad") });
    }, /Unsupported artifact type/, "Only explicitly registered artifact MIME types may be persisted.");

    assert.ok(adminSource.indexOf("context.approval.getRequest(user, requestId)") >= 0,
        "Typed download must enforce the existing approval request visibility ACL before resolving bytes.");
    assert.ok(adminSource.indexOf("service.resolve(requestId, artifactId)") >= 0,
        "Download route must resolve opaque IDs through the artifact owner, not accept a filesystem path.");
    assert.ok(adminSource.indexOf('String(req && req.query && req.query.mode || "download").toLowerCase() === "open"') >= 0,
        "Typed artifact route must support explicit safe inline/open mode.");
    assert.ok(adminSource.indexOf('setHeader(res, "Content-Type", artifact.contentType)') >= 0,
        "Typed artifact route must return registered MIME type.");
    assert.ok(adminSource.indexOf('setHeader(res, "X-Content-Type-Options", "nosniff")') >= 0,
        "Typed artifact route must preserve nosniff protection.");

    assert.ok(adminSource.indexOf('path.extname(target).toLowerCase() !== ".csv"') >= 0 &&
        adminSource.indexOf('"text/csv; charset=utf-8"') >= 0,
        "Existing filesystem-backed CSV download behavior must remain intact.");
    assert.ok(resultsSource.indexOf("CSV_DOWNLOAD:") >= 0,
        "Shared Results must retain the existing CSV marker contract while typed artifacts are introduced.");

    console.log("Request-bound typed artifact store and protected PDF download contract: OK");
} finally {
    fs.rmSync(temp, { recursive: true, force: true });
}

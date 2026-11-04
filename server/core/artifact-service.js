"use strict";

var shared = require("./shared.js");

var DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;
var MAX_CLEANUP_ENTRIES = 200;
var TYPES = {
    pdf: { extension: ".pdf", contentType: "application/pdf" },
    certificate: { extension: ".cer", contentType: "application/pkix-cert" }
};
var UPLOAD_PATTERN = /^upload-[a-f0-9]{48}$/;
var WORKSPACE_PATTERN = /^work-[a-f0-9]{32}$/;

function text(value, limit) {
    return shared.cleanText(value == null ? "" : value, limit || 1000).trim();
}

function safeId(value) {
    value = text(value, 128);
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(value)) throw new Error("Invalid artifact identifier.");
    return value;
}

function safeFileName(value, fallback) {
    var name = text(value, 200).replace(/[\\/:*?"<>|\r\n]+/g, "_").replace(/^\.+/, "");
    return name || fallback;
}

module.exports.createArtifactService = function (options) {
    options = options || {};
    var fs = options.fs;
    var path = options.path;
    var dataRoot = options.dataRoot;
    var retentionMs = Math.max(60 * 1000, Number(options.retentionMs) || DEFAULT_RETENTION_MS);
    var root = path.join(dataRoot, "artifacts");
    fs.mkdirSync(root, { recursive: true });

    function requestRoot(requestId) {
        requestId = safeId(requestId);
        if (UPLOAD_PATTERN.test(requestId) || WORKSPACE_PATTERN.test(requestId)) throw new Error("Invalid artifact identifier.");
        return path.join(root, requestId);
    }

    function artifactPaths(requestId, artifactId, type) {
        requestId = safeId(requestId);
        artifactId = safeId(artifactId);
        type = text(type, 32).toLowerCase();
        var definition = TYPES[type];
        if (!definition) throw new Error("Unsupported artifact type.");
        var directory = requestRoot(requestId);
        return {
            directory: directory,
            metadata: path.join(directory, artifactId + ".json"),
            payload: path.join(directory, artifactId + definition.extension),
            definition: definition
        };
    }

    function writeAtomic(target, data, writeOptions) {
        var temp = target + ".tmp-" + process.pid + "-" + Date.now();
        fs.writeFileSync(temp, data, writeOptions);
        try {
            fs.renameSync(temp, target);
        } catch (error) {
            try { fs.unlinkSync(target); } catch (ignore) {}
            fs.renameSync(temp, target);
        }
    }

    function cleanup(now) {
        now = Number(now) || Date.now();
        var entries;
        try { entries = fs.readdirSync(root, { withFileTypes: true }); }
        catch (error) { return; }
        entries.filter(function (entry) { return entry && entry.isDirectory(); }).slice(0, MAX_CLEANUP_ENTRIES).forEach(function (entry) {
            var directory = path.join(root, entry.name);
            try {
                var stat = fs.statSync(directory);
                if (stat.mtimeMs < now - retentionMs) fs.rmSync(directory, { recursive: true, force: true });
            } catch (error) {}
        });
    }

    function create(requestId, value) {
        value = value || {};
        requestId = safeId(requestId);
        var type = text(value.type, 32).toLowerCase();
        var artifactId = safeId(value.id || shared.randomId(12));
        var paths = artifactPaths(requestId, artifactId, type);
        var payload = Buffer.isBuffer(value.data) ? value.data : Buffer.from(value.data == null ? "" : value.data);
        if (!payload.length) throw new Error("Artifact payload is empty.");
        fs.mkdirSync(paths.directory, { recursive: true });
        var fileName = safeFileName(value.fileName, artifactId + paths.definition.extension);
        if (path.extname(fileName).toLowerCase() !== paths.definition.extension) fileName += paths.definition.extension;
        var metadata = {
            schemaVersion: 1,
            id: artifactId,
            requestId: requestId,
            type: type,
            fileName: fileName,
            contentType: paths.definition.contentType,
            size: payload.length,
            createdAt: Date.now()
        };
        writeAtomic(paths.payload, payload, { mode: 384 });
        try {
            writeAtomic(paths.metadata, JSON.stringify(metadata, null, 2), { encoding: "utf8", mode: 384 });
        } catch (error) {
            try { fs.unlinkSync(paths.payload); } catch (ignore) {}
            throw error;
        }
        cleanup(metadata.createdAt);
        return {
            id: metadata.id,
            requestId: metadata.requestId,
            type: metadata.type,
            label: text(value.label, 160) || (type === "pdf" ? "Open PDF" : type === "certificate" ? "Download certificate" : "Open artifact"),
            fileName: metadata.fileName,
            autoOpen: value.autoOpen === true
        };
    }

    function resolve(requestId, artifactId) {
        requestId = safeId(requestId);
        artifactId = safeId(artifactId);
        var directory = requestRoot(requestId);
        var metadataPath = path.join(directory, artifactId + ".json");
        var metadata;
        try { metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")); }
        catch (error) { throw new Error("Artifact not found."); }
        if (!metadata || metadata.requestId !== requestId || metadata.id !== artifactId || !TYPES[metadata.type]) {
            throw new Error("Artifact metadata is invalid.");
        }
        var paths = artifactPaths(requestId, artifactId, metadata.type);
        var stat;
        try { stat = fs.statSync(paths.payload); }
        catch (error) { throw new Error("Artifact not found."); }
        if (!stat.isFile()) throw new Error("Artifact not found.");
        return {
            path: paths.payload,
            fileName: safeFileName(metadata.fileName, artifactId + paths.definition.extension),
            type: metadata.type,
            contentType: paths.definition.contentType,
            size: stat.size,
            createdAt: Number(metadata.createdAt) || 0
        };
    }

    // #407: request-independent upload staging inside the same bounded store.
    // Directory names are server-generated; client file names never reach a path.
    function stageUpload(value) {
        value = value || {};
        var data = Buffer.isBuffer(value.data) ? value.data : null;
        if (!data || !data.length) throw new Error("Uploaded file is empty.");
        var token = "upload-" + shared.randomId(24);
        var directory = path.join(root, token);
        fs.mkdirSync(directory, { recursive: false, mode: 448 });
        try {
            writeAtomic(path.join(directory, "input.bin"), data, { mode: 384 });
            writeAtomic(path.join(directory, "upload.json"), JSON.stringify({
                schemaVersion: 1,
                token: token,
                ownerId: text(value.ownerId, 300),
                scriptPath: text(value.scriptPath, 1000),
                variable: text(value.variable, 100),
                format: text(value.format, 32),
                size: data.length,
                createdAt: Date.now()
            }), { encoding: "utf8", mode: 384 });
        } catch (error) {
            try { fs.rmSync(directory, { recursive: true, force: true }); } catch (ignore) {}
            throw error;
        }
        cleanup(Date.now());
        return token;
    }

    function resolveUpload(token, expected) {
        expected = expected || {};
        token = String(token || "");
        if (!UPLOAD_PATTERN.test(token)) throw new Error("Uploaded file not found.");
        var directory = path.join(root, token);
        var metadata;
        try { metadata = JSON.parse(fs.readFileSync(path.join(directory, "upload.json"), "utf8")); }
        catch (error) { throw new Error("Uploaded file not found or expired."); }
        var matches = metadata && metadata.token === token &&
            metadata.ownerId === text(expected.ownerId, 300) &&
            metadata.scriptPath === text(expected.scriptPath, 1000) &&
            metadata.variable === text(expected.variable, 100) &&
            Number(metadata.createdAt) >= Date.now() - retentionMs;
        if (!matches) throw new Error("Uploaded file not found or expired.");
        var file = path.join(directory, "input.bin");
        var stat;
        try { stat = fs.statSync(file); } catch (error) { throw new Error("Uploaded file not found or expired."); }
        if (!stat.isFile()) throw new Error("Uploaded file not found or expired.");
        return { token: token, path: file, format: String(metadata.format || ""), size: stat.size };
    }

    function discardUpload(token) {
        if (!UPLOAD_PATTERN.test(String(token || ""))) return;
        try { fs.rmSync(path.join(root, String(token)), { recursive: true, force: true }); } catch (error) {}
    }

    function createWorkspace() {
        var directory = path.join(root, "work-" + shared.randomId(16));
        fs.mkdirSync(directory, { recursive: false, mode: 448 });
        return directory;
    }

    function removeWorkspace(directory) {
        var resolved = path.resolve(String(directory || ""));
        if (path.dirname(resolved) !== path.resolve(root) || !WORKSPACE_PATTERN.test(path.basename(resolved))) return;
        try { fs.rmSync(resolved, { recursive: true, force: true }); } catch (error) {}
    }

    return {
        cleanup: cleanup,
        create: create,
        createWorkspace: createWorkspace,
        discardUpload: discardUpload,
        removeWorkspace: removeWorkspace,
        resolve: resolve,
        resolveUpload: resolveUpload,
        root: root,
        stageUpload: stageUpload
    };
};

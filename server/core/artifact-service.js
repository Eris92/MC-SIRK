"use strict";

var shared = require("./shared.js");

var DEFAULT_RETENTION_MS = 24 * 60 * 60 * 1000;
var MAX_CLEANUP_ENTRIES = 200;
var TYPES = {
    pdf: { extension: ".pdf", contentType: "application/pdf" }
};

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
        return path.join(root, safeId(requestId));
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
            label: text(value.label, 160) || (type === "pdf" ? "Open PDF" : "Open artifact"),
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

    return {
        cleanup: cleanup,
        create: create,
        resolve: resolve,
        root: root
    };
};

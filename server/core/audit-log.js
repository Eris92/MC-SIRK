"use strict";

var crypto = require("crypto");
var shared = require("./shared.js");

module.exports.createAuditLog = function (options) {
    var fs = options.fs;
    var path = options.path;
    var filePath = options.filePath;
    var maxBytes = Math.max(262144, Number(options.maxBytes) || 10485760);
    var maxEntries = Math.max(100, Number(options.maxEntries) || 5000);
    var memory = [];
    var forbidden = /(?:password|secret|token|credential|authorization|cookie|command|payload|output|stdout|stderr|body)/i;

    function clean(value, limit) {
        return shared.cleanText(value == null ? "" : value, limit || 1000);
    }

    function sanitize(value, depth) {
        if (depth > 3 || value == null) return value == null ? null : clean(value, 1000);
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return typeof value === "string" ? clean(value, 2000) : value;
        if (Array.isArray(value)) return value.slice(0, 30).map(function (item) { return sanitize(item, depth + 1); });
        if (typeof value !== "object") return clean(value, 1000);
        var result = {};
        Object.keys(value).slice(0, 50).forEach(function (key) {
            if (forbidden.test(key)) return;
            result[clean(key, 100)] = sanitize(value[key], depth + 1);
        });
        return result;
    }

    function normalize(event) {
        event = event && typeof event === "object" ? event : {};
        return {
            id: clean(event.id || crypto.randomBytes(10).toString("hex"), 80),
            timestamp: clean(event.timestamp || new Date().toISOString(), 80),
            actorId: clean(event.actorId, 300),
            actorName: clean(event.actorName || "system", 300),
            module: clean(event.module || "runtime", 80),
            action: clean(event.action || "action", 120),
            outcome: clean(event.outcome || "success", 40).toLowerCase(),
            target: clean(event.target, 500),
            durationMs: Math.max(0, Number(event.durationMs) || 0),
            details: sanitize(event.details || {}, 0)
        };
    }

    function ensureDirectory() {
        var directory = path.dirname(filePath);
        if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
    }

    function parsedLines(text) {
        return String(text || "").split(/\r?\n/).filter(Boolean).map(function (line) {
            try { return JSON.parse(line); } catch (error) { return null; }
        }).filter(Boolean);
    }

    function rotateIfNeeded() {
        try {
            if (!fs.existsSync(filePath) || fs.statSync(filePath).size <= maxBytes) return;
            var entries = parsedLines(fs.readFileSync(filePath, "utf8")).slice(-maxEntries);
            fs.writeFileSync(filePath, entries.map(function (entry) { return JSON.stringify(entry); }).join("\n") + (entries.length ? "\n" : ""), "utf8");
        } catch (error) {}
    }

    function writeSync(event) {
        var entry = normalize(event);
        memory.unshift(entry);
        if (memory.length > maxEntries) memory.length = maxEntries;
        try {
            ensureDirectory();
            fs.appendFileSync(filePath, JSON.stringify(entry) + "\n", "utf8");
            rotateIfNeeded();
        } catch (error) {}
        return shared.copy(entry);
    }

    function tail(limit) {
        limit = Math.max(1, Math.min(maxEntries, Number(limit) || 200));
        try {
            if (fs.existsSync(filePath)) {
                return parsedLines(fs.readFileSync(filePath, "utf8")).slice(-limit).reverse();
            }
        } catch (error) {}
        return shared.copy(memory.slice(0, limit));
    }

    return { filePath: filePath, tail: tail, writeSync: writeSync };
};

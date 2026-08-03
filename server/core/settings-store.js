"use strict";

var shared = require("./shared.js");
var atomicJson = require("./atomic-json.js");

function isObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
}

function merge(base, override) {
    var result = {};
    base = isObject(base) ? base : {};
    override = isObject(override) ? override : {};

    Object.keys(base).forEach(function (key) {
        result[key] = isObject(base[key])
            ? merge(base[key], {})
            : shared.copy(base[key]);
    });

    Object.keys(override).forEach(function (key) {
        result[key] = isObject(base[key]) && isObject(override[key])
            ? merge(base[key], override[key])
            : shared.copy(override[key]);
    });

    return result;
}

module.exports.createSettingsStore = function (options) {
    var fs = options.fs;
    var path = options.path;
    var filePath = options.filePath;
    var fallbackPath = options.fallbackPath || "";
    var activeFilePath = fallbackPath && fs.existsSync(fallbackPath) ? fallbackPath : filePath;
    var defaults = shared.copy(options.defaults || {});
    var queue = Promise.resolve();

    function read() {
        return merge(defaults, shared.readJson(fs, activeFilePath, {}));
    }

    function canFallback(error) {
        return fallbackPath && activeFilePath !== fallbackPath && ["EACCES", "EBUSY", "EEXIST", "EISDIR", "ENOTEMPTY", "EPERM"].indexOf(String(error && error.code || "")) >= 0;
    }

    function write(value) {
        var normalized = merge(defaults, value);
        return atomicJson.write(fs, path, activeFilePath, normalized).catch(function (error) {
            if (!canFallback(error)) throw error;
            activeFilePath = fallbackPath;
            return atomicJson.write(fs, path, activeFilePath, normalized);
        })
            .then(function () {
                return normalized;
            });
    }

    function update(mutator) {
        var operation = queue.then(function () {
            return Promise.resolve(mutator(shared.copy(read())));
        }).then(function (next) {
            if (!isObject(next)) {
                throw new Error("Settings update must return an object.");
            }
            return write(next);
        });

        queue = operation.catch(function () {});
        return operation;
    }

    function updateSync(mutator) {
        var next = mutator(shared.copy(read()));
        if (!isObject(next)) throw new Error("Settings update must return an object.");
        var normalized = merge(defaults, next);
        try { shared.writeJsonAtomic(fs, path, activeFilePath, normalized); }
        catch (error) {
            if (!canFallback(error)) throw error;
            activeFilePath = fallbackPath;
            shared.writeJsonAtomic(fs, path, activeFilePath, normalized);
        }
        return normalized;
    }

    function isModuleEnabled(key) {
        var settings = read();
        var value = settings.modules && settings.modules[key];
        return !!value && value.enabled !== false;
    }

    return {
        defaults: defaults,
        filePath: filePath,
        fallbackPath: fallbackPath,
        isModuleEnabled: isModuleEnabled,
        read: read,
        update: update,
        updateSync: updateSync,
        write: write
    };
};

"use strict";

var fs = require("fs");
var path = require("path");
var loadedVersion = "";
var loadedRuntime = null;

function canonicalPath(value) {
    var resolved = path.resolve(value);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

var PLUGIN_ROOT = canonicalPath(__dirname) + path.sep;
var ENTRYPOINT = canonicalPath(__filename);

function diskVersion() {
    var config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));
    var version = String(config && config.version || "").trim();
    if (!version) throw new Error("SIRK Platform config.json does not contain a version.");
    return version;
}

function clearInternalModuleCache() {
    Object.keys(require.cache).forEach(function (id) {
        var candidate = canonicalPath(id);
        if (candidate !== ENTRYPOINT && candidate.indexOf(PLUGIN_ROOT) === 0) {
            delete require.cache[id];
        }
    });
}

function loadRuntime() {
    var currentVersion = diskVersion();
    if (loadedRuntime && currentVersion === loadedVersion) return loadedRuntime;

    if (loadedRuntime) clearInternalModuleCache();

    loadedRuntime = {
        implementation: require("./plugin-main.js"),
        policies: [
            require("./server/core/elevated-quick-command-policy.js"),
            require("./server/core/logged-on-user-command-policy.js"),
            require("./server/core/agent-command-guard.js"),
            require("./server/core/multi-device-catalog-policy.js"),
            require("./server/core/multi-device-catalog-browser-policy.js")
        ]
    };
    loadedVersion = currentVersion;
    return loadedRuntime;
}

module.exports.SIRKPortal = function (parent) {
    var runtime = loadRuntime();
    var plugin = runtime.implementation.createPlugin(parent, "SIRKPortal");
    runtime.policies.forEach(function (policy) { policy.apply(plugin); });
    return plugin;
};

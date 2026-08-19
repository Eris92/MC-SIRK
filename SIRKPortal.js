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

function runtimeDataRoot(parent) {
    var meshServer = parent && parent.parent;
    var dataBase = meshServer && meshServer.datapath
        ? meshServer.datapath
        : path.dirname(parent && parent.pluginPath || __dirname);
    return path.join(dataBase, "sirk-platform-data");
}

function writeRuntimeState(parent, plugin, version) {
    var root = runtimeDataRoot(parent);
    var target = path.join(root, "runtime-state.json");
    var temporary = target + "." + process.pid + ".tmp";
    var runtimeVersion = String(plugin && plugin.runtime && plugin.runtime.version || "").trim();
    var state = {
        version: String(version || ""),
        runtimeVersion: runtimeVersion,
        pid: process.pid,
        pluginRoot: path.resolve(__dirname),
        loadedAt: new Date().toISOString()
    };

    fs.mkdirSync(root, { recursive: true });
    try {
        fs.writeFileSync(temporary, JSON.stringify(state, null, 2) + "\n", "utf8");
        fs.renameSync(temporary, target);
    } finally {
        try { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); } catch (ignored) {}
    }
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
    try {
        writeRuntimeState(parent, plugin, loadedVersion);
    } catch (error) {
        console.error("SIRK Platform runtime identity write failed", error);
    }
    return plugin;
};

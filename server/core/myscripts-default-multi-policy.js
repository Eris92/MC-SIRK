"use strict";

var shared = require("./shared.js");

function scriptsRoot(runtime) {
    var context = runtime && runtime.context || {};
    if (context.scriptRoots && context.scriptRoots.myscripts) {
        return String(context.scriptRoots.myscripts);
    }
    var path = context.nativePath || context.path || require("path");
    return path.join(context.pluginRoot || process.cwd(), "seed", "MyScripts");
}

function multiHostEnabled(runtime, relativePath) {
    var context = runtime && runtime.context || {};
    var fs = context.fs || require("fs");
    var path = context.nativePath || context.path || require("path");
    var root = scriptsRoot(runtime);
    var target = shared.normalizeRelativePath(path, root, relativePath);
    if (!target) return false;

    try {
        var source = String(fs.readFileSync(target, "utf8") || "")
            .replace(/^\uFEFF/, "")
            .slice(0, 128 * 1024);
        var match = source.match(/^\s*#\s*MultiHost\s*:\s*(true|false)\s*$/im);
        return !match || String(match[1]).toLowerCase() === "true";
    } catch (error) {
        return false;
    }
}

function decorateScript(runtime, script) {
    if (!script || typeof script !== "object") return script;
    if (script.type && script.type !== "script") return script;
    if (!script.path) return script;
    script.multiHost = multiHostEnabled(runtime, script.path);
    return script;
}

function decorateTree(runtime, node) {
    if (!node || typeof node !== "object") return node;
    if (node.type === "script") decorateScript(runtime, node);
    (node.children || []).forEach(function (child) {
        decorateTree(runtime, child);
    });
    return node;
}

function decorateResult(runtime, asset, result) {
    if (!result || typeof result !== "object") return result;
    if ((asset === "tree" || asset === "scripts") && result.tree) {
        decorateTree(runtime, result.tree);
    }
    if (asset === "script" && result.script) {
        decorateScript(runtime, result.script);
    }
    return result;
}

function apply(plugin) {
    var runtime = plugin && plugin.runtime;
    var module = runtime && runtime.modules && runtime.modules.myscripts;
    if (!runtime || !runtime.context || !module || module.__sirkMyScriptsDefaultMultiApplied) return plugin;
    module.__sirkMyScriptsDefaultMultiApplied = true;

    if (typeof module.apiGet === "function") {
        var originalApiGet = module.apiGet;
        module.apiGet = function (asset, req, user) {
            var result = originalApiGet.call(module, asset, req, user);
            if (result && typeof result.then === "function") {
                return result.then(function (value) {
                    return decorateResult(runtime, asset, value);
                });
            }
            return decorateResult(runtime, asset, result);
        };
    }

    return plugin;
}

module.exports.apply = apply;
module.exports.decorateScript = decorateScript;
module.exports.decorateTree = decorateTree;
module.exports.multiHostEnabled = multiHostEnabled;

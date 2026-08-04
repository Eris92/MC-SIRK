"use strict";

var baseFactory = require("./script-library.js");
var shared = require("./shared.js");

var CONFIRM_DIRECTIVE = /^\s*#\s*ConfirmExecution\s*:\s*(true|false)\s*$/i;
var RUN_AS_DIRECTIVE = /^\s*#\s*runAsUser\s*:\s*([012])\s*$/i;

function normalizeRunAsUser(value) {
    // MeshAgent semantics:
    // 0 = Agent (SYSTEM), 1 = UserOrAgent, 2 = UserOnly.
    // SIRK exposes an unambiguous SYSTEM/User choice, so legacy 1 is
    // promoted to strict UserOnly instead of silently falling back to SYSTEM.
    return Number(value) === 0 ? 0 : 2;
}

function parseEnabled(source) {
    var lines = String(source && source.text || source || "").replace(/^\uFEFF/, "").split(/\r?\n/);
    var enabled = false;
    for (var index = 0; index < lines.length; index++) {
        var line = String(lines[index] || "");
        var trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.charAt(0) !== "#") break;
        var match = line.match(CONFIRM_DIRECTIVE);
        if (match) enabled = String(match[1]).toLowerCase() === "true";
    }
    return enabled;
}

function splitHeader(sourceText) {
    var newline = String(sourceText || "").indexOf("\r\n") >= 0 ? "\r\n" : "\n";
    var lines = String(sourceText || "").replace(/^\uFEFF/, "").split(/\r?\n/);
    var boundary = lines.length;

    for (var index = 0; index < lines.length; index++) {
        var trimmed = String(lines[index] || "").trim();
        if (!trimmed || trimmed.charAt(0) === "#") continue;
        boundary = index;
        break;
    }

    return {
        newline: newline,
        header: lines.slice(0, boundary),
        body: lines.slice(boundary)
    };
}

function updateConfirmDirective(sourceText, enabled) {
    var parts = splitHeader(sourceText);
    var header = parts.header.filter(function (line) {
        return !CONFIRM_DIRECTIVE.test(String(line || ""));
    });

    if (enabled === true) {
        var insertAt = 0;
        for (var index = 0; index < header.length; index++) {
            if (String(header[index] || "").trim().charAt(0) === "#") {
                insertAt = index + 1;
                break;
            }
        }
        header.splice(insertAt, 0, "# ConfirmExecution: true");
    }

    return header.concat(parts.body).join(parts.newline);
}

function updateRunAsDirective(sourceText, runAsUser) {
    var parts = splitHeader(sourceText);
    var header = parts.header.filter(function (line) {
        return !RUN_AS_DIRECTIVE.test(String(line || ""));
    });
    var insertAt = header.length;

    while (insertAt > 0 && !String(header[insertAt - 1] || "").trim()) insertAt--;
    header.splice(insertAt, 0, "# runAsUser: " + normalizeRunAsUser(runAsUser));

    return header.concat(parts.body).join(parts.newline);
}

function decorateScript(base, script) {
    if (!script || script.type !== "script") return script;
    var result = shared.copy(script);
    var source = base.getSource(result.path);
    result.confirmExecution = parseEnabled(source);
    result.runAsUser = normalizeRunAsUser(result.runAsUser);
    return result;
}

function decorateTree(base, node) {
    if (!node) return node;
    var result = shared.copy(node);
    if (result.type === "script") return decorateScript(base, result);
    result.children = (result.children || []).map(function (child) {
        return decorateTree(base, child);
    });
    return result;
}

module.exports.createScriptLibrary = function (options) {
    var base = baseFactory.createScriptLibrary(options);
    var wrapper = {};

    Object.keys(base).forEach(function (key) {
        wrapper[key] = base[key];
    });

    wrapper.getScript = function (relativePath, includeBody) {
        return decorateScript(base, base.getScript(relativePath, includeBody));
    };

    wrapper.getTree = function () {
        return decorateTree(base, base.getTree());
    };

    wrapper.getRoots = function () {
        return (wrapper.getTree().children || []).filter(function (node) {
            return node.type === "directory";
        });
    };

    wrapper.getDefinition = function (relativePath) {
        var definition = base.getDefinition(relativePath);
        if (!definition) return null;
        definition.confirmExecution = parseEnabled(base.getSource(relativePath));
        definition.runAsUser = normalizeRunAsUser(definition.runAsUser);
        return definition;
    };

    wrapper.saveDefinition = function (relativePath, definition) {
        definition = definition && typeof definition === "object" ? definition : {};
        var enabled = definition.confirmExecution === true;
        var runAsUser = normalizeRunAsUser(definition.runAsUser);
        definition = shared.copy(definition);
        definition.runAsUser = runAsUser;

        base.saveDefinition(relativePath, definition);
        var source = base.getSource(relativePath);
        if (!source) throw new Error("Script not found after definition save.");

        var updated = updateConfirmDirective(source.text, enabled);
        updated = updateRunAsDirective(updated, runAsUser);
        base.saveSource(relativePath, updated);

        return {
            script: wrapper.getScript(relativePath, true),
            definition: wrapper.getDefinition(relativePath)
        };
    };

    return wrapper;
};

module.exports.normalizeRunAsUser = normalizeRunAsUser;
module.exports.updateRunAsDirective = updateRunAsDirective;

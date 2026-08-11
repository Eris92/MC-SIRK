"use strict";

var baseFactory = require("./script-library.js");
var shared = require("./shared.js");

var CONFIRM_DIRECTIVE = /^\s*#\s*ConfirmExecution\s*:\s*(true|false)\s*$/i;
var RUN_AS_DIRECTIVE = /^\s*#\s*runAsUser\s*:\s*([012])\s*$/i;
var MULTI_HOST_DIRECTIVE = /^\s*#\s*MultiHost\s*:\s*(true|false)\s*$/i;
var SIRK_HEADER = /^\s*#\s*(Sirk[A-Za-z0-9_-]*\s*:\s*.+?)\s*$/i;
var DECORATED_TREE_CACHE_MS = 5000;

function normalizeRunAsUser(value) {
    // MeshAgent semantics:
    // 0 = Agent (SYSTEM), 1 = UserOrAgent, 2 = UserOnly.
    // SIRK exposes an unambiguous SYSTEM/User choice, so legacy 1 is
    // promoted to strict UserOnly instead of silently falling back to SYSTEM.
    return Number(value) === 0 ? 0 : 2;
}

function headerBoolean(source, directive, defaultValue) {
    var lines = String(source && source.text || source || "").replace(/^\uFEFF/, "").split(/\r?\n/);
    var enabled = defaultValue === true;
    for (var index = 0; index < lines.length; index++) {
        var line = String(lines[index] || "");
        var trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.charAt(0) !== "#") break;
        var match = line.match(directive);
        if (match) enabled = String(match[1]).toLowerCase() === "true";
    }
    return enabled;
}

function sirkHeaders(source) {
    var lines = String(source && source.text || source || "").replace(/^\uFEFF/, "").split(/\r?\n/);
    var result = [];
    for (var index = 0; index < lines.length; index++) {
        var line = String(lines[index] || "");
        var trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.charAt(0) !== "#") break;
        var match = line.match(SIRK_HEADER);
        if (match) result.push(shared.cleanText(match[1], 5000).trim());
    }
    return result;
}

function parseEnabled(source) {
    return headerBoolean(source, CONFIRM_DIRECTIVE, false);
}

function parseMultiHost(source) {
    // My Commands is an operator-invoked device surface. Existing scripts
    // are therefore eligible for multi-device execution unless they opt out.
    return headerBoolean(source, MULTI_HOST_DIRECTIVE, true);
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

function updateBooleanDirective(sourceText, directive, line) {
    var parts = splitHeader(sourceText);
    var header = parts.header.filter(function (value) {
        return !directive.test(String(value || ""));
    });
    var insertAt = header.length;
    while (insertAt > 0 && !String(header[insertAt - 1] || "").trim()) insertAt--;
    header.splice(insertAt, 0, line);
    return header.concat(parts.body).join(parts.newline);
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

function updateMultiHostDirective(sourceText, enabled) {
    return updateBooleanDirective(
        sourceText,
        MULTI_HOST_DIRECTIVE,
        "# MultiHost: " + (enabled === false ? "false" : "true")
    );
}

function decorateScript(base, script) {
    if (!script || script.type !== "script") return script;
    var result = shared.copy(script);
    var source = base.getSource(result.path);
    result.confirmExecution = parseEnabled(source);
    result.multiHost = parseMultiHost(source);
    result.runAsUser = normalizeRunAsUser(result.runAsUser);
    result.extraHeaders = sirkHeaders(source);
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
    var decoratedTreeCache = { value: null, expiresAt: 0 };

    function invalidateDecoratedTree() {
        decoratedTreeCache = { value: null, expiresAt: 0 };
    }

    Object.keys(base).forEach(function (key) {
        wrapper[key] = base[key];
    });

    wrapper.invalidate = function () {
        invalidateDecoratedTree();
        return base.invalidate.apply(base, arguments);
    };

    wrapper.getScript = function (relativePath, includeBody) {
        return decorateScript(base, base.getScript(relativePath, includeBody));
    };

    wrapper.getTree = function () {
        if (decoratedTreeCache.value && decoratedTreeCache.expiresAt > Date.now()) {
            return shared.copy(decoratedTreeCache.value);
        }
        decoratedTreeCache = {
            value: decorateTree(base, base.getTree()),
            expiresAt: Date.now() + DECORATED_TREE_CACHE_MS
        };
        return shared.copy(decoratedTreeCache.value);
    };

    wrapper.getRoots = function () {
        return (wrapper.getTree().children || []).filter(function (node) {
            return node.type === "directory";
        });
    };

    wrapper.getDefinition = function (relativePath) {
        var definition = base.getDefinition(relativePath);
        if (!definition) return null;
        var source = base.getSource(relativePath);
        definition.confirmExecution = parseEnabled(source);
        definition.multiHost = parseMultiHost(source);
        definition.runAsUser = normalizeRunAsUser(definition.runAsUser);
        return definition;
    };

    wrapper.saveSource = function () {
        var result = base.saveSource.apply(base, arguments);
        invalidateDecoratedTree();
        return result;
    };

    wrapper.saveDefinition = function (relativePath, definition) {
        definition = definition && typeof definition === "object" ? definition : {};
        var enabled = definition.confirmExecution === true;
        var runAsUser = normalizeRunAsUser(definition.runAsUser);
        var multiHost = definition.multiHost !== false;
        definition = shared.copy(definition);
        definition.runAsUser = runAsUser;
        definition.multiHost = multiHost;

        base.saveDefinition(relativePath, definition);
        var source = base.getSource(relativePath);
        if (!source) throw new Error("Script not found after definition save.");

        var updated = updateConfirmDirective(source.text, enabled);
        updated = updateRunAsDirective(updated, runAsUser);
        updated = updateMultiHostDirective(updated, multiHost);
        base.saveSource(relativePath, updated);
        invalidateDecoratedTree();

        return {
            script: wrapper.getScript(relativePath, true),
            definition: wrapper.getDefinition(relativePath)
        };
    };

    return wrapper;
};

module.exports.normalizeRunAsUser = normalizeRunAsUser;
module.exports.parseMultiHost = parseMultiHost;
module.exports.sirkHeaders = sirkHeaders;
module.exports.updateRunAsDirective = updateRunAsDirective;
module.exports.updateMultiHostDirective = updateMultiHostDirective;

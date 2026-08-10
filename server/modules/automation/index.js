"use strict";

var shared = require("../../core/shared.js");
var libraryFactory = require("../../core/script-confirmation-library.js");
var adminFactory = require("../../core/script-admin-service.js");
var executorFactory = require("../../core/server-script-executor.js");
var jiraAssetFactory = require("../../core/jira-asset-service.js");
var jiraProtocolFactory = require("../../core/jira-protocol-service.js");
var rootResolver = require("../../core/automation-root.js");
var folderAccess = require("../../core/folder-access.js");

module.exports.createModule = function (context) {
    var root = rootResolver.resolve(context);
    var library = libraryFactory.createScriptLibrary({ fs: context.fs, path: context.nativePath || context.path, root: root, readOnly: true, allowWrite: true });
    var admin = adminFactory.createScriptAdminService({ context: context, library: library, namespace: "script-secrets.myscripts" });
    var executor = executorFactory.createServerScriptExecutor({ context: context, library: library, admin: admin, assignmentNamespace: "script-secrets.myscripts.system-credentials" });
    var jiraAssets = jiraAssetFactory.createJiraAssetService({
        fs: context.fs,
        path: context.nativePath || context.path,
        dataRoot: context.dataRoot,
        integrations: context.integrations
    });
    var jiraProtocol = jiraProtocolFactory.createJiraProtocolService({ context: context, jiraAssets: jiraAssets, executor: executor });
    var protocolStartSignals = Object.create(null);
    var unregister = null;

    function allowed(user) {
        if (!user) return false;
        if (shared.isSiteAdmin(user)) return true;
        var config = context.settings.read().modules.myscripts || {};
        var groups = Array.isArray(config.accessGroupIds) ? config.accessGroupIds : [];
        return !groups.length || shared.isUserInAnyGroup(user, groups);
    }
    function requireAdmin(user) { if (!shared.isSiteAdmin(user)) throw new Error("Permission denied."); }
    function tree() { return library.getTree(); }
    function folderKeys() { return (tree().children || []).map(function (item) { return String(item.path || item.name || ""); }); }
    function folderRules() { return (context.settings.read().modules.myscripts || {}).folderPermissions || {}; }
    function visibleTree(user) { return folderAccess.filterTree(tree(), folderRules(), user); }
    function requireScriptAccess(user, relativePath) { return folderAccess.requirePath(user, folderRules(), relativePath); }
    function folderSettings() {
        var rules = folderRules();
        return (tree().children || []).map(function (item) {
            var key = String(item.path || item.name || "");
            return { key: key, label: item.label || item.name || key, locales: item.locales || {}, enabled: !rules[key] || rules[key].enabled !== false, allowAll: !!(rules[key] && rules[key].allowAll === true), groupIds: rules[key] && Array.isArray(rules[key].groupIds) ? rules[key].groupIds : [] };
        });
    }
    function normalizeApprovalLevels(value) {
        return Array.isArray(value) ? value.map(Number).filter(function (level, index, all) {
            return level >= 1 && level <= 3 && all.indexOf(level) === index;
        }).sort() : [];
    }
    function allowNoApproval() {
        var current = context.settings.read();
        var provider = current.modules && current.modules.approvals && current.modules.approvals.providers && current.modules.approvals.providers.myscripts || {};
        return provider.allowNoApproval === true;
    }
    function dynamicVariable(script, name) {
        name = String(name || "");
        return (script && script.variables || []).filter(function (variable) {
            return String(variable.name || "") === name && (variable.control === "user" || variable.control === "asset");
        })[0] || null;
    }
    function signalProtocolStart(payload, request) {
        var nonce = String(payload && payload.protocolRunNonce || "");
        var signal = protocolStartSignals[nonce];
        if (signal) signal(String(request && request.id || ""));
    }
    function publicProtocolRequest(user, id) {
        var request = context.approval.getRequest(user, id);
        requireScriptAccess(user, request.scriptPath);
        return request;
    }

    var provider = {
        type: "myscripts",
        moduleKey: "myscripts",
        title: "My Scripts",
        tabTitle: "My Scripts",
        settingsTitle: "My Scripts approvers",
        description: "Approval workflow and server-side execution for My Scripts.",
        columns: ["createdAt", "title", "requester", "status"],
        normalizePayload: function (payload) {
            payload = shared.copy(payload || {});
            payload.variableValues = payload.variableValues && typeof payload.variableValues === "object" && !Array.isArray(payload.variableValues) ? payload.variableValues : {};
            payload.confirmedExecution = payload.confirmedExecution === true;
            return payload;
        },
        getTitle: function (payload) { return payload.label || payload.scriptPath || "Script"; },
        getSummary: function (payload) { return payload.description || payload.scriptPath || "My Scripts request"; },
        getApprovalLevels: function (payload) { return normalizeApprovalLevels(payload && payload.approvalLevels); },
        canSubmit: allowed,
        presentRequest: function (user, request) {
            if (request && request.payload && request.payload.scriptPath) request.scriptPath = String(request.payload.scriptPath);
            return request;
        },
        getResources: function (user, query) {
            var script = query && query.scriptPath ? library.getScript(query.scriptPath, true) : null;
            return { tree: visibleTree(user), script: script && (requireScriptAccess(user, script.path), script) || null };
        },
        execute: function (payload, request) {
            var requester = shared.findUser(context.parent, request && request.requester && request.requester.id) || { _id: request && request.requester && request.requester.id };
            requireScriptAccess(requester, payload && payload.scriptPath);
            var script = library.getScript(payload && payload.scriptPath, true);
            if (!script) throw new Error("Script not found.");
            if (jiraProtocol.isProtocolScript(script)) {
                if (!admin.hasSystemCredential(script.path, "jira")) throw new Error("Assign the configured Jira integration to this script first.");
                signalProtocolStart(payload, request);
                return jiraProtocol.execute(script, payload, request);
            }
            return executor.execute(payload, request);
        }
    };

    return {
        key: "myscripts",
        clientConfig: function () {
            return {
                key: "myscripts",
                name: "My Scripts",
                menuTitle: "My Scripts",
                script: "myscripts.js",
                style: "myscripts.css",
                scriptsRoot: root,
                toolbar: { refresh: true, clear: false, favorites: true, search: true, manage: true, settings: false }
            };
        },
        getAccess: function (user) { return { allowed: allowed(user), siteAdmin: shared.isSiteAdmin(user) }; },
        initialize: function () {
            library.ensure();
            if (!unregister) unregister = context.approval.registerProvider(provider);
            return Promise.resolve();
        },
        serveIcon: function (req, res) { shared.send(res, 404, "text/plain; charset=utf-8", "Icons are included in the script tree."); },
        apiGet: function (asset, req, user) {
            if (!allowed(user)) throw new Error("Permission denied.");
            var q = req && req.query || {};
            if (asset === "tree" || asset === "scripts") return { ok: true, tree: visibleTree(user), scriptsRoot: shared.isSiteAdmin(user) ? root : "" };
            if (asset === "script") {
                requireScriptAccess(user, q.path);
                var script = library.getScript(q.path, true);
                if (!script) throw new Error("Script not found.");
                return { ok: true, script: script };
            }
            if (asset === "source") {
                requireAdmin(user);
                requireScriptAccess(user, q.path);
                var source = library.getSource(q.path);
                if (!source) throw new Error("Script not found.");
                return { ok: true, source: source };
            }
            if (asset === "definition") { requireScriptAccess(user, q.path); return { ok: true, definition: admin.getDefinition(user, q.path) }; }
            if (asset === "script-secrets") { requireScriptAccess(user, q.path); return { ok: true, secrets: admin.getSecretState(user, q.path) }; }
            if (asset === "system-credentials") { requireScriptAccess(user, q.path); return { ok: true, systemCredentials: admin.getSystemCredentialState(user, q.path) }; }
            if (asset === "progress") {
                var progressRequest = publicProtocolRequest(user, q.id);
                return { ok: true, request: progressRequest, progress: jiraProtocol.progress(progressRequest.id, progressRequest.status) };
            }
            if (asset === "results") {
                return context.approval.list(user, {
                    type: "myscripts",
                    status: q.status || "",
                    q: q.q || "",
                    page: Number(q.page) || 1,
                    perPage: Math.min(500, Number(q.perPage) || 100)
                }).then(function (value) {
                    value.ok = true;
                    return value;
                });
            }
            if (asset === "settings") return { ok: true, settings: context.settings.read().modules.myscripts || {}, scriptsRoot: root };
            throw new Error("Unknown My Scripts action.");
        },
        apiPost: function (asset, req, user) {
            if (!allowed(user)) throw new Error("Permission denied.");
            var value = req && req.body || {};
            if (asset === "refresh") { library.invalidate(); return { ok: true, tree: visibleTree(user) }; }
            if (asset === "source") { requireAdmin(user); requireScriptAccess(user, value.path); return { ok: true, script: library.saveSource(value.path, value.text), tree: visibleTree(user) }; }
            if (asset === "definition") {
                requireScriptAccess(user, value.path);
                var saved = admin.saveDefinition(user, value.path, value.definition);
                saved.ok = true;
                saved.tree = visibleTree(user);
                return saved;
            }
            if (asset === "script-secrets") { requireScriptAccess(user, value.path); return { ok: true, secrets: admin.saveSecrets(user, value.path, value.values, value.clearNames) }; }
            if (asset === "system-credentials") { requireScriptAccess(user, value.path); return { ok: true, systemCredentials: admin.saveSystemCredentials(user, value.path, value.selected) }; }
            if (asset === "variable-options") {
                requireScriptAccess(user, value.scriptPath);
                var optionScript = library.getScript(value.scriptPath, false);
                if (!optionScript) throw new Error("Script not found.");
                var variable = dynamicVariable(optionScript, value.variableName);
                if (!variable) throw new Error("Dynamic script variable not found.");
                if (!admin.hasSystemCredential(optionScript.path, "jira")) {
                    throw new Error("Assign the configured Jira integration to this script first.");
                }
                return jiraAssets.optionsFor(variable, value.values, value.force === true).then(function (result) {
                    return {
                        ok: true,
                        items: result.items || [],
                        stale: result.stale === true,
                        warning: result.warning || ""
                    };
                });
            }
            if (asset === "request") {
                requireScriptAccess(user, value.scriptPath);
                var requestedScript = library.getScript(value.scriptPath, false);
                if (!requestedScript) throw new Error("Script not found.");
                if (requestedScript.confirmExecution === true && value.confirmedExecution !== true) throw new Error("Execution confirmation is required for this script.");
                var levels = normalizeApprovalLevels(requestedScript.approvalLevels);
                if (!levels.length && !allowNoApproval()) levels = [1];
                var language = String(value.language || "en").toLowerCase() === "pl" ? "pl" : "en";
                var locale = requestedScript.locales && requestedScript.locales[language] || {};
                var protocol = jiraProtocol.isProtocolScript(requestedScript);
                if (protocol && !admin.hasSystemCredential(requestedScript.path, "jira")) {
                    throw new Error("Assign the configured Jira integration to this script first.");
                }
                var payload = {
                    scriptPath: requestedScript.path,
                    scriptHash: requestedScript.hash,
                    label: locale.label || requestedScript.label || requestedScript.name,
                    description: locale.description || requestedScript.description || "",
                    approvalLevels: levels,
                    confirmedExecution: requestedScript.confirmExecution === true,
                    variableValues: value.variableValues && typeof value.variableValues === "object" && !Array.isArray(value.variableValues) ? shared.copy(value.variableValues) : {}
                };
                if (!protocol) {
                    return context.approval.submit("myscripts", user, payload, value.note).then(function (request) { return { ok: true, request: request }; });
                }

                var nonce = shared.randomId(12);
                payload.protocolRunNonce = nonce;
                var startPromise = new Promise(function (resolve) { protocolStartSignals[nonce] = resolve; });
                var submission = context.approval.submit("myscripts", user, payload, value.note).then(function (request) {
                    return String(request && request.id || "");
                });
                return Promise.race([startPromise, submission]).then(function (requestId) {
                    delete protocolStartSignals[nonce];
                    if (!requestId) throw new Error("Protocol request ID is unavailable.");
                    return { ok: true, request: publicProtocolRequest(user, requestId), protocol: true };
                }, function (error) {
                    delete protocolStartSignals[nonce];
                    throw error;
                });
            }
            if (asset === "settings") {
                requireAdmin(user);
                return context.settings.update(function (current) {
                    current.modules.myscripts.accessGroupIds = Array.isArray(value.accessGroupIds) ? value.accessGroupIds.map(String) : [];
                    current.modules.myscripts.folderPermissions = folderAccess.normalizeRules(value.folderPermissions, folderKeys(), shared.getUserGroups(context.parent).map(function (group) { return group.id; }));
                    current.modules.myscripts.runTimeoutSeconds = Math.max(30, Math.min(3600, Number(value.runTimeoutSeconds) || 600));
                    return current;
                }).then(function () { return { ok: true }; });
            }
            throw new Error("Unknown My Scripts action.");
        },
        getFolderSettings: folderSettings
    };
};
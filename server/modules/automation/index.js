"use strict";

var shared = require("../../core/shared.js");
var libraryFactory = require("../../core/script-confirmation-library.js");
var adminFactory = require("../../core/script-admin-service.js");
var executorFactory = require("../../core/server-script-executor.js");
var jiraAssetsFactory = require("../../core/jira-assets-service.js");
var rootResolver = require("../../core/automation-root.js");
var folderAccess = require("../../core/folder-access.js");

module.exports.createModule = function (context) {
    var root = rootResolver.resolve(context);
    var library = libraryFactory.createScriptLibrary({ fs: context.fs, path: context.nativePath || context.path, root: root, readOnly: true, allowWrite: true });
    var admin = adminFactory.createScriptAdminService({ context: context, library: library, namespace: "script-secrets.myscripts" });
    var executor = executorFactory.createServerScriptExecutor({ context: context, library: library, admin: admin, assignmentNamespace: "script-secrets.myscripts.system-credentials" });
    var jiraAssets = jiraAssetsFactory.createJiraAssetsService({ context: context });
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
        getResources: function (user, query) {
            var script = query && query.scriptPath ? library.getScript(query.scriptPath, true) : null;
            return { tree: visibleTree(user), script: script && (requireScriptAccess(user, script.path), script) || null };
        },
        execute: function (payload, request) {
            var requester = shared.findUser(context.parent, request && request.requester && request.requester.id) || { _id: request && request.requester && request.requester.id };
            requireScriptAccess(requester, payload && payload.scriptPath);
            var script = library.getScript(payload && payload.scriptPath, true);
            if (script && jiraAssets.isProtocolScript(script)) {
                return jiraAssets.executeProtocol(payload, request, function (environment) {
                    return executor.execute(payload, request, { environment: environment });
                });
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
        serveArtifact: function (req, res, user) {
            if (!allowed(user)) { shared.send(res, 403, "text/plain; charset=utf-8", "Forbidden"); return; }
            try {
                var q = req && req.query || {};
                var request = context.approval.getRequest(user, q.id);
                var artifact = jiraAssets.resolveArtifact(q.id, q.type || "pdf");
                requireScriptAccess(user, artifact.meta && artifact.meta.scriptPath);
                if (String(request.id) !== String(artifact.meta.requestId)) throw new Error("Artifact request mismatch.");
                var contentTypes = { pdf: "application/pdf", json: "application/json; charset=utf-8", txt: "text/plain; charset=utf-8", html: "text/html; charset=utf-8" };
                var stat = context.fs.statSync(artifact.path);
                var disposition = String(q.download || "") === "1" ? "attachment" : "inline";
                var name = String(artifact.name || "artifact").replace(/[\r\n\"]/g, "_");
                if (typeof res.setHeader === "function") {
                    res.setHeader("Content-Type", contentTypes[artifact.type] || "application/octet-stream");
                    res.setHeader("Content-Disposition", disposition + '; filename="' + name + '"');
                    res.setHeader("Content-Length", String(stat.size));
                    res.setHeader("Cache-Control", "no-store");
                    res.setHeader("X-Content-Type-Options", "nosniff");
                } else if (typeof res.set === "function") {
                    res.set("Content-Type", contentTypes[artifact.type] || "application/octet-stream");
                    res.set("Content-Disposition", disposition + '; filename="' + name + '"');
                    res.set("Content-Length", String(stat.size));
                    res.set("Cache-Control", "no-store");
                    res.set("X-Content-Type-Options", "nosniff");
                }
                res.statusCode = 200;
                var stream = context.fs.createReadStream(artifact.path);
                stream.on("error", function () { if (typeof res.destroy === "function") res.destroy(); });
                stream.pipe(res);
            } catch (error) {
                shared.send(res, 403, "text/plain; charset=utf-8", "Artifact unavailable");
            }
        },
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
            if (asset === "variable-options") {
                requireScriptAccess(user, q.path);
                var optionScript = library.getScript(q.path, true);
                if (!optionScript) throw new Error("Script not found.");
                var optionVariable = (optionScript.variables || []).find(function (item) { return item.name === String(q.variable || ""); });
                if (!optionVariable) throw new Error("Variable not found.");
                var currentValues = {};
                try { currentValues = q.values ? JSON.parse(String(q.values)) : {}; } catch (error) { currentValues = {}; }
                if (!currentValues || typeof currentValues !== "object" || Array.isArray(currentValues)) currentValues = {};
                return jiraAssets.variableOptions(optionScript, optionVariable, currentValues).then(function (options) { return { ok: true, options: options }; });
            }
            if (asset === "progress") {
                var progressRequest = context.approval.getRequest(user, q.id);
                requireScriptAccess(user, progressRequest.payload && progressRequest.payload.scriptPath);
                return { ok: true, progress: jiraAssets.progress(q.id), request: progressRequest };
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
            if (asset === "request") {
                requireScriptAccess(user, value.scriptPath);
                var requestedScript = library.getScript(value.scriptPath, false);
                if (!requestedScript) throw new Error("Script not found.");
                if (requestedScript.confirmExecution === true && value.confirmedExecution !== true) throw new Error("Execution confirmation is required for this script.");
                var levels = normalizeApprovalLevels(requestedScript.approvalLevels);
                if (!levels.length && !allowNoApproval()) levels = [1];
                var language = String(value.language || "en").toLowerCase() === "pl" ? "pl" : "en";
                var locale = requestedScript.locales && requestedScript.locales[language] || {};
                var payload = {
                    scriptPath: requestedScript.path,
                    scriptHash: requestedScript.hash,
                    label: locale.label || requestedScript.label || requestedScript.name,
                    description: locale.description || requestedScript.description || "",
                    approvalLevels: levels,
                    confirmedExecution: requestedScript.confirmExecution === true,
                    variableValues: value.variableValues && typeof value.variableValues === "object" && !Array.isArray(value.variableValues) ? shared.copy(value.variableValues) : {}
                };
                var protocol = jiraAssets.isProtocolScript(requestedScript);
                return context.approval.submit("myscripts", user, payload, value.note, { deferExecution: protocol && !levels.length }).then(function (request) {
                    if (protocol && !levels.length && request && request.status === "approved") {
                        context.approval.execute(request.id).catch(function () {});
                    }
                    return { ok: true, request: request, protocol: protocol };
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

"use strict";

var baseFactory = require("./runtime-base.js");
var auditFactory = require("./audit-log.js");
var shared = require("./shared.js");

function safeCopy(value) {
    try { return shared.copy(value); } catch (error) { return value; }
}

module.exports.createRuntime = function (options) {
    var runtime = baseFactory.createRuntime(options);
    var context = runtime.context;
    var settings = runtime.settings;
    var fs = context.fs;
    var path = context.path || context.nativePath;
    var audit = auditFactory.createAuditLog({
        fs: fs,
        path: path,
        filePath: path.join(context.dataRoot, "audit.jsonl"),
        maxEntries: 5000,
        maxBytes: 10485760
    });

    function ensureUiSettings() {
        try {
            settings.updateSync(function (current) {
                current.ui = current.ui || {};
                var mode = String(current.ui.iconMode || "auto").toLowerCase();
                current.ui.iconMode = ["auto", "classic", "modern"].indexOf(mode) >= 0 ? mode : "auto";
                current.schemaVersion = Math.max(Number(current.schemaVersion) || 0, 6);
                return current;
            });
        } catch (error) {}
    }

    function userName(user) {
        return shared.userName(user) || user && user._id || "system";
    }

    function detailsFromRequest(req, result) {
        var source = req && req.body || {};
        if (source && typeof source.payload === "string") source = shared.parseJsonObject(source.payload, {});
        source = source && typeof source === "object" && !Array.isArray(source) ? source : {};
        var details = {};
        ["id", "nodeId", "nodeName", "scriptPath", "commandId", "type", "approved", "status", "action"].forEach(function (key) {
            if (source[key] != null && source[key] !== "") details[key === "id" ? "requestId" : key] = source[key];
        });
        var request = result && result.request || {};
        var execution = request && request.result || result && result.result || {};
        if (!details.requestId && request.id) details.requestId = request.id;
        if (request.status) details.status = request.status;
        if (execution.id) details.executionId = execution.id;
        if (!details.nodeId && execution.nodeId) details.nodeId = execution.nodeId;
        if (!details.nodeName && execution.nodeName) details.nodeName = execution.nodeName;
        return details;
    }

    function writeAudit(user, moduleName, action, outcome, startedAt, req, result, error) {
        var details = detailsFromRequest(req, result);
        if (error) details.message = shared.cleanText(error && error.message || error, 1000);
        audit.writeSync({
            actorId: user && user._id || "",
            actorName: userName(user),
            module: moduleName || "runtime",
            action: action || "action",
            outcome: outcome,
            target: details.nodeName || details.nodeId || details.scriptPath || details.commandId || details.requestId || "",
            durationMs: Date.now() - startedAt,
            details: details
        });
    }

    function wrapModuleAudit(key, module) {
        if (!module || module.__loadError || module.__sirkAuditWrapped || typeof module.apiPost !== "function") return;
        module.__sirkAuditWrapped = true;
        var originalPost = module.apiPost;
        module.apiPost = function (asset, req, user) {
            var startedAt = Date.now();
            var operation;
            try { operation = originalPost.call(module, asset, req, user); }
            catch (error) { writeAudit(user, key, asset, "failed", startedAt, req, null, error); throw error; }
            return Promise.resolve(operation).then(function (result) {
                writeAudit(user, key, asset, "success", startedAt, req, result);
                return result;
            }, function (error) {
                writeAudit(user, key, asset, "failed", startedAt, req, null, error);
                throw error;
            });
        };
    }

    function installCommandsExtension(module) {
        if (!module || module.__loadError || module.__sirkCommandsExtension || typeof module.apiGet !== "function" || typeof module.apiPost !== "function") return;
        module.__sirkCommandsExtension = true;
        var originalGet = module.apiGet;
        var originalPost = module.apiPost;
        var publicCommand = {
            id: "network-settings",
            label: "Active network adapter settings",
            description: "Open properties for the adapter used by the active default route.",
            variables: [],
            approvalLevels: [],
            requiresApproval: false,
            confirmExecution: false,
            runAsUser: 2,
            showOnDesktop: true,
            showWithoutDesktop: true
        };
        var commandText = "start \"\" powershell.exe -NoProfile -WindowStyle Hidden -Command \"$route=Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue|Sort-Object RouteMetric,InterfaceMetric|Select-Object -First 1;$adapter=if($route){Get-NetAdapter -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue};$shell=New-Object -ComObject Shell.Application;$folder=$shell.Namespace('shell:::{7007ACC7-3202-11D1-AAD2-00805FC1270E}');$item=if($adapter -and $folder){@($folder.Items())|Where-Object{$_.Name -eq $adapter.Name}|Select-Object -First 1};if($item){$item.InvokeVerb('Properties')}else{Start-Process explorer.exe 'shell:::{7007ACC7-3202-11D1-AAD2-00805FC1270E}'}\"";

        function allowed(user) {
            var access = typeof module.getAccess === "function" ? module.getAccess(user) : null;
            return !!(access && access.allowed);
        }
        function map(value, mapper) { return value && typeof value.then === "function" ? value.then(mapper) : mapper(value); }
        function inject(value) {
            if (!value || !Array.isArray(value.catalog)) return value;
            var network = value.catalog.filter(function (item) { return item && item.key === "network"; })[0];
            if (!network) { network = { key: "network", title: "Network", icon: "🌐", commands: [] }; value.catalog.push(network); }
            network.commands = Array.isArray(network.commands) ? network.commands : [];
            if (!network.commands.some(function (item) { return item && item.id === publicCommand.id; })) network.commands.push(safeCopy(publicCommand));
            return value;
        }
        function executeNetwork(user, value) {
            if (!allowed(user)) return Promise.reject(new Error("Permission denied."));
            value = value || {};
            var nodeId = String(value.nodeId || "").trim();
            if (!nodeId) return Promise.reject(new Error("Device is required."));
            return context.device.resolveNode(user, nodeId, { requireCommandRights: true }).then(function (node) {
                var id = "sirk-platform-" + shared.randomId(10);
                var command = { label: publicCommand.label, cmd: commandText, type: 1, runAsUser: 2 };
                return context.device.sendRunCommands(node, command, id, null).then(function (state) {
                    context.device.auditCommand(node, user, command);
                    return { ok: true, direct: true, request: { status: state && state.state || "sent", result: { id: id, nodeId: node.nodeId, nodeName: node.node && node.node.name || value.nodeName || nodeId, command: command.label, status: state && state.state || "sent" } } };
                });
            });
        }
        function nodeIds(value) {
            var list = Array.isArray(value) ? value : String(value || "").split(/[\r\n,;]+/), seen = Object.create(null);
            return list.map(function (id) { return String(id || "").trim(); }).filter(function (id) { if (!id || seen[id]) return false; seen[id] = true; return true; });
        }
        function multi(user, value) {
            value = value || {};
            if (!allowed(user)) return Promise.reject(new Error("Permission denied."));
            var config = settings.read().modules.mycommands || {};
            var limit = Math.max(1, Math.min(1000, Number(config.maxMultiHostNodes) || 200));
            var concurrency = Math.max(1, Math.min(64, Number(config.multiHostConcurrency) || 8));
            var ids = nodeIds(value.nodeIds);
            if (!ids.length && value.nodeId) ids = [String(value.nodeId)];
            if (!ids.length) return Promise.reject(new Error("Select at least one device."));
            if (ids.length > limit) return Promise.reject(new Error("A maximum of " + limit + " devices can be selected."));
            var rows = [], cursor = 0;
            function worker() {
                if (cursor >= ids.length) return Promise.resolve();
                var id = ids[cursor++];
                var operation = String(value.commandId) === publicCommand.id
                    ? executeNetwork(user, Object.assign({}, value, { nodeId: id }))
                    : Promise.resolve(originalPost.call(module, "execute", { body: Object.assign({}, value, { nodeId: id, nodeIds: undefined, desktopDirect: true, confirmedExecution: true }) }, user));
                return operation.then(function (result) { rows.push({ nodeId: id, ok: true, request: result && result.request || result }); }, function (error) { rows.push({ nodeId: id, ok: false, error: String(error && error.message || error) }); }).then(worker);
            }
            var workers = [];
            for (var index = 0; index < Math.min(concurrency, ids.length); index += 1) workers.push(worker());
            return Promise.all(workers).then(function () {
                var failed = rows.filter(function (row) { return !row.ok; }).length;
                return { ok: failed === 0, total: ids.length, submitted: rows.length - failed, pending: 0, failed: failed, rows: rows };
            });
        }

        module.apiGet = function (asset, req, user) {
            if (asset === "command-definition" && req && req.query && String(req.query.id) === publicCommand.id) {
                if (!allowed(user)) throw new Error("Permission denied.");
                return { ok: true, definition: safeCopy(publicCommand) };
            }
            var result = originalGet.call(module, asset, req, user);
            return (asset === "scripts" || asset === "catalog" || asset === "refresh") ? map(result, inject) : result;
        };
        module.apiPost = function (asset, req, user) {
            var value = req && req.body || {};
            if (asset === "execute" && String(value.commandId || "") === publicCommand.id) return executeNetwork(user, value);
            if (asset === "multi-execute" && value.commandId) return multi(user, value);
            if (asset === "command-definition" && String(value.id || "") === publicCommand.id) return map(originalGet.call(module, "catalog", { query: {} }, user), inject);
            return originalPost.call(module, asset, req, user);
        };
    }

    ensureUiSettings();
    installCommandsExtension(runtime.modules && runtime.modules.mycommands);
    Object.keys(runtime.modules || {}).forEach(function (key) { wrapModuleAudit(key, runtime.modules[key]); });

    var originalBootstrap = runtime.bootstrap;
    runtime.bootstrap = function (user) {
        var value = originalBootstrap.call(runtime, user);
        value.ui = safeCopy(settings.read().ui || { iconMode: "auto" });
        return value;
    };

    var originalAdminSnapshot = runtime.adminSnapshot;
    runtime.adminSnapshot = function (user) {
        var value = originalAdminSnapshot.call(runtime, user);
        if (!value) return value;
        value.uiSettings = safeCopy(settings.read().ui || { iconMode: "auto" });
        value.auditLog = audit.tail(500);
        return value;
    };

    var originalSaveAdminSettings = runtime.saveAdminSettings;
    runtime.saveAdminSettings = function (user, payload) {
        payload = payload || {};
        var general = payload.moduleOptions && payload.moduleOptions.general;
        return Promise.resolve(originalSaveAdminSettings.call(runtime, user, payload)).then(function () {
            if (general) {
                settings.updateSync(function (current) {
                    current.ui = current.ui || {};
                    var mode = String(general.iconMode || "auto").toLowerCase();
                    current.ui.iconMode = ["auto", "classic", "modern"].indexOf(mode) >= 0 ? mode : "auto";
                    return current;
                });
            }
            audit.writeSync({ actorId: user && user._id || "", actorName: userName(user), module: "admin", action: "save-settings", outcome: "success", details: { iconMode: settings.read().ui && settings.read().ui.iconMode || "auto" } });
            return runtime.adminSnapshot(user);
        }, function (error) {
            audit.writeSync({ actorId: user && user._id || "", actorName: userName(user), module: "admin", action: "save-settings", outcome: "failed", details: { message: String(error && error.message || error) } });
            throw error;
        });
    };

    var originalCaptureAgentData = runtime.captureAgentData;
    runtime.captureAgentData = function (command, agent) {
        var result = originalCaptureAgentData.call(runtime, command, agent);
        var responseId = command && (command.responseid || command.responseId);
        if (responseId) audit.writeSync({ actorName: "MeshCentral Agent", module: "mycommands", action: "agent-result", outcome: String(command.status || command.state || "completed").toLowerCase(), target: String(responseId), details: { executionId: String(responseId), status: String(command.status || command.state || "completed") } });
        return result;
    };

    runtime.audit = audit;
    runtime.context.audit = audit;
    return runtime;
};

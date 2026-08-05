"use strict";

var shared = require("./shared.js");

function cleanIds(value) {
    var source = Array.isArray(value) ? value : String(value || "").split(/[\r\n,;]+/);
    var seen = Object.create(null);
    return source.map(function (id) { return String(id || "").trim(); }).filter(function (id) {
        if (!id || seen[id]) return false;
        seen[id] = true;
        return true;
    });
}

function levels(value) {
    return (Array.isArray(value) ? value : []).map(Number).filter(function (level, index, all) {
        return level >= 1 && level <= 3 && all.indexOf(level) === index;
    }).sort();
}

function settingsValue(runtime) {
    var current = runtime.settings && typeof runtime.settings.read === "function"
        ? runtime.settings.read()
        : {};
    return current && current.modules || {};
}

function providerAllowsNoApproval(runtime) {
    var modules = settingsValue(runtime);
    var provider = modules.approvals && modules.approvals.providers && modules.approvals.providers.myscripts || {};
    return provider.allowNoApproval === true;
}

function nodeName(runtime, id) {
    var parent = runtime.context && runtime.context.parent;
    var stores = [
        parent && parent.parent && parent.parent.webserver && parent.parent.webserver.meshes,
        parent && parent.parent && parent.parent.webserver && parent.parent.webserver.nodes,
        parent && parent.nodes
    ];
    for (var index = 0; index < stores.length; index += 1) {
        var item = stores[index] && stores[index][id];
        if (item && (item.name || item.rname || item.host)) return String(item.name || item.rname || item.host);
    }
    return String(id || "");
}

function installExecutionEnvironment(runtime, contexts) {
    var processApi = runtime.context && runtime.context.childProcess || require("child_process");
    if (!processApi || typeof processApi.execFile !== "function") return;
    if (processApi.execFile.__sirkMyScriptsMultiWrapped) return;

    var original = processApi.execFile;
    var wrapped = function (file, args, options, callback) {
        options = options || {};
        var requestId = options.env && options.env.MYSCRIPTS_REQUEST_ID;
        var current = requestId && contexts[requestId];
        if (current) {
            options = Object.assign({}, options, {
                env: Object.assign({}, options.env || {}, {
                    MYSCRIPTS_NODE_ID: current.nodeId,
                    MYSCRIPTS_NODE_NAME: current.nodeName,
                    MYSCRIPTS_MULTI_HOST: "1"
                })
            });
        }
        return original.call(processApi, file, args, options, callback);
    };
    wrapped.__sirkMyScriptsMultiWrapped = true;
    wrapped.__sirkMyScriptsMultiOriginal = original;
    processApi.execFile = wrapped;
}

function wrapProviderRegistration(runtime, contexts) {
    var approval = runtime.context && runtime.context.approval;
    if (!approval || typeof approval.registerProvider !== "function") return;
    if (approval.registerProvider.__sirkMyScriptsMultiWrapped) return;

    var originalRegister = approval.registerProvider;
    var wrappedRegister = function (provider) {
        if (provider && String(provider.type || "").toLowerCase() === "myscripts" &&
            typeof provider.execute === "function" && !provider.execute.__sirkMyScriptsMultiWrapped) {
            var originalExecute = provider.execute;
            var wrappedExecute = function (payload, request, executionId) {
                payload = payload || {};
                var requestId = String(request && request.id || "");
                if (requestId && payload.multiHost === true && payload.nodeId) {
                    contexts[requestId] = {
                        nodeId: String(payload.nodeId),
                        nodeName: String(payload.nodeName || payload.nodeId)
                    };
                }
                var operation;
                try {
                    operation = originalExecute.call(provider, payload, request, executionId);
                } catch (error) {
                    if (requestId) delete contexts[requestId];
                    throw error;
                }
                return Promise.resolve(operation).then(function (result) {
                    if (requestId) delete contexts[requestId];
                    return result;
                }, function (error) {
                    if (requestId) delete contexts[requestId];
                    throw error;
                });
            };
            wrappedExecute.__sirkMyScriptsMultiWrapped = true;
            provider.execute = wrappedExecute;
        }
        return originalRegister.call(approval, provider);
    };
    wrappedRegister.__sirkMyScriptsMultiWrapped = true;
    approval.registerProvider = wrappedRegister;
}

function copyConfig(config, runtime) {
    var result = shared.copy(config || {});
    var modules = settingsValue(runtime);
    var current = modules.myscripts || {};
    result.toolbar = Object.assign({}, result.toolbar || {}, { multiHost: true });
    result.maxMultiHostNodes = Math.max(1, Math.min(1000, Number(current.maxMultiHostNodes) || 200));
    result.multiHostConcurrency = Math.max(1, Math.min(64, Number(current.multiHostConcurrency) || 8));
    return result;
}

function submissionPayload(runtime, script, value, nodeId) {
    var language = String(value.language || "en").toLowerCase() === "pl" ? "pl" : "en";
    var locale = script.locales && script.locales[language] || {};
    var required = levels(script.approvalLevels);
    if (!required.length && !providerAllowsNoApproval(runtime)) required = [1];
    return {
        nodeId: nodeId,
        nodeName: nodeName(runtime, nodeId),
        multiHost: true,
        scriptPath: script.path,
        scriptHash: script.hash,
        label: locale.label || script.label || script.name,
        description: locale.description || script.description || "",
        approvalLevels: required,
        confirmedExecution: script.confirmExecution === true,
        variableValues: value.variableValues && typeof value.variableValues === "object" && !Array.isArray(value.variableValues)
            ? shared.copy(value.variableValues)
            : {}
    };
}

function multiExecute(runtime, module, req, user) {
    var value = req && req.body || {};
    var modules = settingsValue(runtime);
    var current = modules.myscripts || {};
    var maxNodes = Math.max(1, Math.min(1000, Number(current.maxMultiHostNodes) || 200));
    var concurrency = Math.max(1, Math.min(64, Number(current.multiHostConcurrency) || 8));
    var ids = cleanIds(value.nodeIds);
    if (!ids.length && value.nodeId) ids = [String(value.nodeId)];
    if (!ids.length) throw new Error("Select at least one device.");
    if (ids.length > maxNodes) throw new Error("A maximum of " + maxNodes + " devices can be selected.");

    return Promise.resolve(module.apiGet("script", { query: { path: value.scriptPath } }, user)).then(function (response) {
        var script = response && response.script;
        if (!script) throw new Error("Script not found.");
        if (script.multiHost !== true) throw new Error("This script does not allow multi-device execution.");
        if (script.confirmExecution === true && value.confirmedExecution !== true) {
            throw new Error("Execution confirmation is required for this script.");
        }

        var cursor = 0;
        var rows = [];
        function worker() {
            if (cursor >= ids.length) return Promise.resolve();
            var id = ids[cursor++];
            var payload = submissionPayload(runtime, script, value, id);
            return runtime.context.approval.submit("myscripts", user, payload, value.note).then(function (request) {
                rows.push({ nodeId: id, nodeName: payload.nodeName, ok: true, request: request });
            }).catch(function (error) {
                rows.push({ nodeId: id, nodeName: payload.nodeName, ok: false, error: String(error && error.message || error) });
            }).then(worker);
        }

        var workers = [];
        for (var index = 0; index < Math.min(concurrency, ids.length); index += 1) workers.push(worker());
        return Promise.all(workers).then(function () {
            var failed = rows.filter(function (row) { return !row.ok; }).length;
            var pending = rows.filter(function (row) {
                return row.ok && row.request && row.request.status === "pending";
            }).length;
            return {
                ok: failed === 0,
                total: ids.length,
                submitted: rows.length - failed,
                pending: pending,
                failed: failed,
                rows: rows
            };
        });
    });
}

function apply(plugin) {
    var runtime = plugin && plugin.runtime;
    var module = runtime && runtime.modules && runtime.modules.myscripts;
    if (!runtime || !runtime.context || !module || module.__sirkMyScriptsMultiApplied) return plugin;
    module.__sirkMyScriptsMultiApplied = true;

    var contexts = Object.create(null);
    installExecutionEnvironment(runtime, contexts);
    wrapProviderRegistration(runtime, contexts);

    if (typeof module.clientConfig === "function") {
        var originalClientConfig = module.clientConfig;
        module.clientConfig = function () {
            return copyConfig(originalClientConfig.apply(module, arguments), runtime);
        };
    }

    if (typeof module.apiPost === "function") {
        var originalApiPost = module.apiPost;
        module.apiPost = function (asset, req, user) {
            if (asset === "multi-execute") return multiExecute(runtime, module, req, user);
            return originalApiPost.call(module, asset, req, user);
        };
    }

    return plugin;
}

module.exports.apply = apply;
module.exports.cleanIds = cleanIds;
module.exports.multiExecute = multiExecute;

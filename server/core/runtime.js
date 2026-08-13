"use strict";

var shared = require("./shared.js");
var settingsFactory = require("./settings-store.js");
var secretsFactory = require("./secret-store.js");
var approvalFactory = require("./approval-service.js");
var deviceFactory = require("./device-service.js");
var integrationFactory = require("./integration-service.js");
var eventFactory = require("./mesh-events.js");
var folderAccess = require("./folder-access.js");

var VERSION = require("../../config.json").version;
var DEFAULTS = {
    schemaVersion: 6,
    ui: { iconMode: "auto" },
    modules: {
        myscripts: { enabled: true, accessGroupIds: [], folderPermissions: {} },
        mycommands: {
            enabled: true,
            accessGroupIds: [],
            folderPermissions: {},
            showInMenu: false,
            showOnDevice: true,
            maxMultiHostNodes: 200,
            multiHostConcurrency: 8,
            commandOverrides: {},
            scriptAvailability: {}
        },
        moverequests: { enabled: true, hostButtonEnabled: true, menuEnabled: false },
        approvals: { retentionDays: 365, providers: {} },
        approvalcenter: { enabled: true, retentionDays: 365, providers: {} }
    },
    integrations: {
        ad: { domain: "", login: "" },
        entra: { tenantId: "", clientId: "" },
        zabbix: { url: "", username: "", verifyTls: true }
    }
};

var MODULES = [
    { key: "approvalcenter", name: "Approvals", path: "../modules/approval-center/index.js" },
    { key: "moverequests", name: "Move Requests", path: "../modules/move-requests/index.js" },
    { key: "mycommands", name: "Commands", path: "../modules/commands/index.js" },
    { key: "myscripts", name: "Automation", path: "../modules/automation/index.js" }
];

function errorText(error) {
    return String(error && (error.stack || error.message) || error || "Unknown module error.");
}

function failedModule(descriptor, error) {
    var message = errorText(error);
    return {
        __loadError: message,
        key: descriptor.key,
        clientConfig: function () {
            return { key: descriptor.key, name: descriptor.name, version: VERSION, loadError: true };
        },
        getAccess: function () { return { allowed: false, siteAdmin: false, error: true }; },
        initialize: function () { return Promise.resolve(); },
        apiGet: function () { throw new Error("Module failed to load: " + message); },
        apiPost: function () { throw new Error("Module failed to load: " + message); }
    };
}

function normalizeIconMode(value) {
    value = String(value || "auto").toLowerCase();
    return ["auto", "classic", "modern"].indexOf(value) >= 0 ? value : "auto";
}

module.exports.createRuntime = function (options) {
    var parent = options.parent;
    var pluginRoot = options.pluginRoot;
    var fs = parent.fs || require("fs");
    var nativePath = parent.path || require("path");
    var meshServer = parent.parent;
    var dataBase = meshServer && meshServer.datapath
        ? meshServer.datapath
        : nativePath.dirname(parent.pluginPath || pluginRoot);
    var dataRoot = nativePath.join(dataBase, "sirk-platform-data");

    fs.mkdirSync(dataRoot, { recursive: true });

    var scriptRoots = {
        myscripts: nativePath.join(pluginRoot, "seed", "MyScripts"),
        mycommands: nativePath.join(pluginRoot, "seed", "MyCommands")
    };
    var settings = settingsFactory.createSettingsStore({
        fs: fs,
        path: nativePath,
        filePath: nativePath.join(dataRoot, "settings.json"),
        fallbackPath: process.env.PROGRAMDATA
            ? nativePath.join(process.env.PROGRAMDATA, "SIRK Management Platform", "settings.json")
            : "",
        defaults: DEFAULTS
    });
    var secrets = secretsFactory.createSecretStore({
        fs: fs,
        path: nativePath,
        dataPath: nativePath.join(dataRoot, "secrets.json"),
        keyPath: nativePath.join(dataRoot, ".secret.key")
    });
    var integrations = integrationFactory.createIntegrationService({
        parent: parent,
        settings: settings,
        secrets: secrets
    });
    var eventLog = eventFactory.createMeshEventLog({ parent: parent });
    var context = {
        dataRoot: dataRoot,
        fs: fs,
        integrations: integrations,
        parent: parent,
        path: nativePath,
        nativePath: nativePath,
        pluginRoot: pluginRoot,
        scriptRoots: scriptRoots,
        settings: settings,
        secrets: secrets,
        source: options.source
    };

    context.device = deviceFactory.createDeviceService({ parent: parent, source: options.source });
    context.approval = approvalFactory.createApprovalService({
        fs: fs,
        path: nativePath,
        parent: parent,
        source: options.source,
        settings: settings,
        databasePath: nativePath.join(dataRoot, "requests.json"),
        fallbackDatabasePath: process.env.PROGRAMDATA
            ? nativePath.join(process.env.PROGRAMDATA, "SIRK Management Platform", "approval-requests.json")
            : nativePath.join(dataRoot, "approval-requests.json")
    });
    context.isModuleEnabled = settings.isModuleEnabled;

    var modules = {};
    var moduleLoadErrors = {};
    MODULES.forEach(function (descriptor) {
        try {
            var factory = require(descriptor.path);
            if (!factory || typeof factory.createModule !== "function") {
                throw new Error("Module factory does not export createModule().");
            }
            var module = factory.createModule(context);
            if (!module || typeof module.key !== "string") {
                throw new Error("Module factory returned an invalid module.");
            }
            modules[descriptor.key] = module;
        } catch (error) {
            moduleLoadErrors[descriptor.key] = errorText(error);
            console.error("SIRK Platform module load failed: " + descriptor.key, error);
            modules[descriptor.key] = failedModule(descriptor, error);
        }
    });

    function userName(user) {
        return shared.userName(user) || user && user._id || "system";
    }

    function eventDetails(req, result) {
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

    function writeEvent(user, moduleName, action, outcome, startedAt, req, result, error) {
        var details = eventDetails(req, result);
        if (error) details.message = shared.cleanText(error && error.message || error, 1000);
        eventLog.writeSync({
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

    function initialize() {
        return Promise.all(Object.keys(modules).map(function (key) {
            return Promise.resolve(modules[key].initialize());
        }));
    }

    function diagnostics(user) {
        var current = settings.read();
        return Object.keys(modules).map(function (key) {
            var module = modules[key];
            var config = current.modules[key] || { enabled: false };
            return {
                key: key,
                name: module.clientConfig().name,
                enabled: config.enabled !== false,
                builtIn: true,
                ready: !module.__loadError,
                error: module.__loadError
                    ? (shared.isSiteAdmin(user) ? module.__loadError : "Module failed to load.")
                    : null,
                access: module.getAccess(user)
            };
        });
    }

    function bootstrap(user) {
        var result = {};
        Object.keys(modules).forEach(function (key) {
            var module = modules[key];
            result[key] = {
                enabled: settings.isModuleEnabled(key),
                ready: !module.__loadError,
                error: module.__loadError
                    ? (shared.isSiteAdmin(user) ? module.__loadError : "Module failed to load.")
                    : null,
                config: module.clientConfig(user),
                access: module.getAccess(user)
            };
        });
        return {
            ok: true,
            version: VERSION,
            ui: shared.copy(settings.read().ui || { iconMode: "auto" }),
            modules: result
        };
    }

    function request(method, moduleName, asset, req, res, user) {
        if (moduleName === "_runtime" && method === "GET") {
            shared.sendJson(res, 200, bootstrap(user));
            return;
        }

        var module = modules[String(moduleName || "").toLowerCase()];
        if (!module) {
            shared.sendJson(res, 404, { ok: false, error: "Unknown SIRK Platform module." });
            return;
        }
        if (module.__loadError) {
            shared.sendJson(res, 503, { ok: false, error: "Module failed to load." });
            return;
        }
        if (!settings.isModuleEnabled(module.key)) {
            shared.sendJson(res, 403, { ok: false, error: module.clientConfig().name + " is disabled." });
            return;
        }

        var startedAt = Date.now();
        var operation;
        try {
            operation = method === "POST"
                ? module.apiPost(asset, req, user)
                : module.apiGet(asset, req, user);
        } catch (error) {
            if (method === "POST") writeEvent(user, module.key, asset, "failed", startedAt, req, null, error);
            shared.sendJson(res, 400, { ok: false, error: String(error && error.message || error) });
            return;
        }

        Promise.resolve(operation).then(function (value) {
            if (method === "POST") writeEvent(user, module.key, asset, "success", startedAt, req, value);
            shared.sendJson(res, 200, value);
        }).catch(function (error) {
            if (method === "POST") writeEvent(user, module.key, asset, "failed", startedAt, req, null, error);
            var message = String(error && error.message || error);
            var status = /permission|access|disabled/i.test(message)
                ? 403
                : /not found|unavailable|missing/i.test(message) ? 404 : 400;
            shared.sendJson(res, status, { ok: false, error: message });
        });
    }

    function normalizeGroups(value, knownGroups) {
        value = Array.isArray(value) ? value : [];
        return value.map(String).filter(function (id, index, list) {
            return knownGroups.indexOf(id) >= 0 && list.indexOf(id) === index;
        });
    }

    function moduleFolders(key) {
        var module = modules[key];
        return module && !module.__loadError && typeof module.getFolderSettings === "function"
            ? module.getFolderSettings()
            : [];
    }

    function saveAdminSettings(user, payload) {
        if (!shared.isSiteAdmin(user)) return Promise.reject(new Error("Permission denied."));
        payload = payload || {};
        var moduleValues = payload.modules || {};
        var moduleOptions = payload.moduleOptions || {};
        var knownGroups = shared.getUserGroups(parent).map(function (group) { return group.id; });
        var startedAt = Date.now();

        try {
            settings.updateSync(function (current) {
                Object.keys(modules).forEach(function (key) {
                    if (Object.prototype.hasOwnProperty.call(moduleValues, key)) {
                        current.modules[key].enabled = moduleValues[key] === true;
                    }
                });
                current.modules.mycommands.showInMenu = false;
                current.modules.moverequests.menuEnabled = false;

                if (moduleOptions.general) {
                    current.ui = current.ui || {};
                    current.ui.iconMode = normalizeIconMode(moduleOptions.general.iconMode);
                }
                if (moduleOptions.approvals) {
                    var approvalOptions = moduleOptions.approvals;
                    var approvals = current.modules.approvals || (current.modules.approvals = { retentionDays: 365, providers: {} });
                    approvals.retentionDays = Math.max(1, Math.min(3650, Number(approvalOptions.retentionDays) || 365));
                    approvals.providers = approvals.providers || {};
                    ["moverequests", "mycommands", "myscripts"].forEach(function (key) {
                        if (!approvalOptions.providers || !Object.prototype.hasOwnProperty.call(approvalOptions.providers, key)) return;
                        var existing = approvals.providers[key] || {};
                        var provider = approvalOptions.providers[key] || {};
                        existing.enabled = provider.enabled !== false;
                        existing.showTab = provider.showTab !== false;
                        existing.showOverview = provider.showOverview !== false;
                        existing.allowNoApproval = provider.allowNoApproval === true;
                        existing.levels = existing.levels || {};
                        [1, 2, 3].forEach(function (level) {
                            var selected = provider.levels && (provider.levels[level] || provider.levels[String(level)]);
                            existing.levels[level] = normalizeGroups(selected, knownGroups);
                        });
                        approvals.providers[key] = existing;
                    });
                }
                if (moduleOptions.permissions) {
                    ["mycommands", "myscripts"].forEach(function (key) {
                        var source = moduleOptions.permissions[key];
                        if (!source || typeof source !== "object" || Array.isArray(source)) return;
                        var target = current.modules[key] || (current.modules[key] = {});
                        target.accessGroupIds = normalizeGroups(source.accessGroupIds, knownGroups);
                        var allowedFolderKeys = moduleFolders(key).map(function (item) { return String(item.key); });
                        target.folderPermissions = folderAccess.normalizeRules(source.folderPermissions, allowedFolderKeys, knownGroups);
                    });
                }
                if (moduleOptions.moverequests) {
                    var moveOptions = modules.moverequests && typeof modules.moverequests.normalizeAdminSettings === "function"
                        ? modules.moverequests.normalizeAdminSettings(moduleOptions.moverequests, user)
                        : { hostButtonEnabled: moduleOptions.moverequests.hostButtonEnabled !== false };
                    current.modules.moverequests.hostButtonEnabled = moveOptions.hostButtonEnabled !== false;
                    if (Object.prototype.hasOwnProperty.call(moveOptions, "targetMeshApprovalLevels")) {
                        current.modules.moverequests.targetMeshApprovalLevels = moveOptions.targetMeshApprovalLevels;
                    }
                }
                if (moduleOptions.mycommands) {
                    current.modules.mycommands.showOnDevice = moduleOptions.mycommands.showOnDevice !== false;
                }
                return current;
            });

            eventLog.writeSync({
                actorId: user && user._id || "",
                actorName: userName(user),
                module: "admin",
                action: "save-settings",
                outcome: "success",
                durationMs: Date.now() - startedAt,
                details: { iconMode: settings.read().ui && settings.read().ui.iconMode || "auto" }
            });
            return Promise.resolve(adminSnapshot(user));
        } catch (error) {
            eventLog.writeSync({
                actorId: user && user._id || "",
                actorName: userName(user),
                module: "admin",
                action: "save-settings",
                outcome: "failed",
                durationMs: Date.now() - startedAt,
                details: { message: String(error && error.message || error) }
            });
            return Promise.reject(error);
        }
    }

    function diagnosticTail(filePath) {
        try {
            if (!fs.existsSync(filePath)) return "";
            return String(fs.readFileSync(filePath, "utf8") || "")
                .split(/\r?\n/).slice(-200).join("\n").slice(-64000);
        } catch (error) {
            return "Diagnostic file could not be read.";
        }
    }

    function adminSnapshot(user) {
        if (!shared.isSiteAdmin(user)) return null;
        var current = settings.read();
        return {
            plugin: { name: "SIRK Management Platform", shortName: "SIRKPortal", version: VERSION },
            modules: diagnostics(user),
            moduleSettings: current.modules,
            uiSettings: shared.copy(current.ui || { iconMode: "auto" }),
            moveRequestAdmin: modules.moverequests && !modules.moverequests.__loadError && typeof modules.moverequests.getAdminSettings === "function"
                ? modules.moverequests.getAdminSettings(user)
                : null,
            folderPermissions: {
                myscripts: moduleFolders("myscripts"),
                mycommands: moduleFolders("mycommands")
            },
            userGroups: shared.getUserGroups(parent),
            integrations: integrations.publicSettings(user),
            moduleLoadErrors: shared.copy(moduleLoadErrors),
            diagnostics: {
                logs: diagnosticTail(nativePath.join(dataRoot, "bootstrap.log")),
                errors: diagnosticTail(nativePath.join(dataRoot, "plugin-load-error.log"))
            },
            generatedAt: new Date().toISOString()
        };
    }

    function updateModules(user, values) {
        return saveAdminSettings(user, {
            modules: values,
            moduleOptions: {},
            integrations: integrations.readSettings(),
            secrets: {}
        });
    }

    function captureAgentData(command, agent) {
        if (settings.isModuleEnabled("mycommands") && modules.mycommands &&
            !modules.mycommands.__loadError && typeof modules.mycommands.captureAgentData === "function") {
            modules.mycommands.captureAgentData(command, agent);
        }
        var responseId = command && (command.responseid || command.responseId);
        if (responseId) {
            eventLog.writeSync({
                actorName: "MeshCentral Agent",
                module: "mycommands",
                action: "agent-result",
                outcome: String(command.status || command.state || "completed").toLowerCase(),
                target: String(responseId),
                details: {
                    executionId: String(responseId),
                    status: String(command.status || command.state || "completed")
                }
            });
        }
    }

    return {
        adminSnapshot: adminSnapshot,
        bootstrap: bootstrap,
        captureAgentData: captureAgentData,
        context: context,
        diagnostics: diagnostics,
        initialize: initialize,
        integrations: integrations,
        moduleLoadErrors: moduleLoadErrors,
        modules: modules,
        request: request,
        saveAdminSettings: saveAdminSettings,
        settings: settings,
        updateModules: updateModules,
        version: VERSION
    };
};

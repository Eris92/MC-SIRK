"use strict";

var artifactFactory = require("./artifact-service.js");
var pdfRenderer = require("./pdf-text-renderer.js");
var shared = require("./shared.js");

var MAX_PROGRESS_ENTRIES = 200;
var PROGRESS_RETENTION_MS = 24 * 60 * 60 * 1000;
var MAX_ASSETS_PER_PROTOCOL = 20;

function text(value, limit) {
    return shared.cleanText(value == null ? "" : value, limit || 4000).trim();
}

function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function lower(value) {
    return text(value, 4000).toLowerCase();
}

function protocolScript(script) {
    return !!(script && Array.isArray(script.extraHeaders) && script.extraHeaders.some(function (header) {
        return /^SirkWorkflow\s*:\s*JiraAssetProtocol$/i.test(String(header || "").trim());
    }));
}

function selectedAssetValues(value) {
    var seen = Object.create(null);
    return String(value == null ? "" : value).split(/[;,|\r\n]+/).map(function (item) {
        return item.trim();
    }).filter(function (item) {
        var key = item.toLowerCase();
        if (!key || seen[key]) return false;
        seen[key] = true;
        return true;
    }).slice(0, MAX_ASSETS_PER_PROTOCOL);
}

function findUser(users, value) {
    var wanted = lower(value);
    if (!wanted) return null;
    return (Array.isArray(users) ? users : []).filter(function (item) {
        return [item && item.value, item && item.accountId, item && item.emailAddress, item && item.displayName]
            .some(function (candidate) { return lower(candidate) === wanted; });
    })[0] || null;
}

function findAsset(assets, value) {
    var wanted = lower(value);
    if (!wanted) return null;
    return (Array.isArray(assets) ? assets : []).filter(function (item) {
        return [item && item.value, item && item.hostname, item && item.objectKey, item && item.objectId]
            .some(function (candidate) { return lower(candidate) === wanted; });
    })[0] || null;
}

module.exports.createJiraProtocolService = function (options) {
    options = options || {};
    var context = options.context;
    var jiraAssets = options.jiraAssets;
    var executor = options.executor;
    var artifactService = options.artifactService || artifactFactory.createArtifactService({
        fs: context.fs,
        path: context.nativePath || context.path,
        dataRoot: context.dataRoot
    });
    var progressByRequest = Object.create(null);

    function cleanupProgress(now) {
        now = Number(now) || Date.now();
        var ids = Object.keys(progressByRequest).sort(function (a, b) {
            return Number(progressByRequest[a] && progressByRequest[a].updatedAt || 0) - Number(progressByRequest[b] && progressByRequest[b].updatedAt || 0);
        });
        ids.forEach(function (id) {
            var item = progressByRequest[id];
            if (!item || item.updatedAt < now - PROGRESS_RETENTION_MS) delete progressByRequest[id];
        });
        ids = Object.keys(progressByRequest);
        while (ids.length > MAX_PROGRESS_ENTRIES) {
            delete progressByRequest[ids.shift()];
        }
    }

    function updateProgress(requestId, percent, stage, state) {
        requestId = text(requestId, 128);
        if (!requestId) return;
        progressByRequest[requestId] = {
            percent: Math.max(0, Math.min(100, Number(percent) || 0)),
            stage: text(stage, 240),
            state: text(state, 40) || "running",
            updatedAt: Date.now()
        };
        cleanupProgress();
    }

    function progress(requestId, requestStatus) {
        var item = progressByRequest[text(requestId, 128)];
        if (item) return shared.copy(item);
        if (requestStatus === "pending" || requestStatus === "approved") {
            return { percent: 0, stage: "Waiting for approval", state: "pending", updatedAt: 0 };
        }
        if (requestStatus === "completed") {
            return { percent: 100, stage: "Ready", state: "ready", updatedAt: 0 };
        }
        if (requestStatus === "failed" || requestStatus === "rejected") {
            return { percent: 0, stage: "Failed", state: "failed", updatedAt: 0 };
        }
        return { percent: 5, stage: "Starting", state: "running", updatedAt: 0 };
    }

    function normalizeProtocolInputs(payload) {
        var values = object(payload && payload.variableValues);
        var userValue = text(values.JiraUser, 500);
        var assetValues = selectedAssetValues(values.PcName);
        var itPersonValue = text(values.ItPerson, 500);
        var transfer = /^(1|true|yes|tak|on)$/i.test(String(values.IsTransferProtocol || ""));
        if (!userValue) throw new Error("Jira user is required.");
        if (!assetValues.length) throw new Error("Asset is required.");
        if (!itPersonValue) throw new Error("IT person is required.");
        return {
            userValue: userValue,
            assetValues: assetValues,
            itPersonValue: itPersonValue,
            transfer: transfer
        };
    }

    function execute(script, payload, request) {
        if (!protocolScript(script)) return Promise.reject(new Error("Invalid Jira protocol workflow."));
        var requestId = text(request && request.id, 128);
        if (!requestId) return Promise.reject(new Error("Protocol request ID is unavailable."));

        var inputs;
        try { inputs = normalizeProtocolInputs(payload); }
        catch (error) { return Promise.reject(error); }

        updateProgress(requestId, 5, "Validating protocol inputs", "running");
        var usersResult;
        var selectedUser;
        var selectedItPerson;
        var selectedAssets;

        return jiraAssets.listUsers(false).then(function (users) {
            usersResult = users || { items: [] };
            selectedUser = findUser(usersResult.items, inputs.userValue);
            if (!selectedUser) throw new Error("Selected Jira user is no longer available.");
            selectedItPerson = findUser(usersResult.items, inputs.itPersonValue) || {
                value: inputs.itPersonValue,
                accountId: "",
                emailAddress: "",
                displayName: inputs.itPersonValue
            };
            updateProgress(requestId, 25, "Resolving Jira Assets", "running");
            return jiraAssets.listAssets(selectedUser.value || inputs.userValue, script);
        }).then(function (assets) {
            var available = assets && Array.isArray(assets.items) ? assets.items : [];
            selectedAssets = inputs.assetValues.map(function (value) {
                var asset = findAsset(available, value);
                if (!asset) throw new Error("Selected asset is no longer assigned to the Jira user: " + value);
                return asset;
            });
            updateProgress(requestId, 50, "Building protocol", "running");

            var environment = {
                SIRK_PROTOCOL_MODE: inputs.transfer ? "transfer" : "return",
                SIRK_PROTOCOL_USER_NAME: text(selectedUser.displayName || selectedUser.label || selectedUser.value, 500),
                SIRK_PROTOCOL_USER_ID: text(selectedUser.accountId || selectedUser.value, 500),
                SIRK_PROTOCOL_USER_EMAIL: text(selectedUser.emailAddress, 500),
                SIRK_PROTOCOL_IT_NAME: text(selectedItPerson.displayName || selectedItPerson.label || selectedItPerson.value, 500),
                SIRK_PROTOCOL_IT_ID: text(selectedItPerson.accountId || selectedItPerson.value, 500),
                SIRK_PROTOCOL_IT_EMAIL: text(selectedItPerson.emailAddress, 500),
                SIRK_PROTOCOL_ASSETS_JSON: JSON.stringify(selectedAssets),
                SIRK_PROTOCOL_GENERATED_AT: new Date().toISOString()
            };

            return executor.execute(payload, request, {
                environment: environment,
                skipSystemEnvironment: true
            });
        }).then(function (executionResult) {
            updateProgress(requestId, 72, "Rendering PDF", "running");
            var rendered = object(executionResult && executionResult.data);
            if (rendered.protocol !== true || !text(rendered.text, 500000)) {
                throw new Error("Protocol renderer returned an invalid result.");
            }
            var protocolText = text(rendered.text, 500000);
            var pdf = pdfRenderer.renderTextPdf(protocolText);
            if (!Buffer.isBuffer(pdf) || pdf.length < 100 || pdf.slice(0, 8).toString("ascii").indexOf("%PDF-1.") !== 0) {
                throw new Error("PDF renderer returned an invalid artifact.");
            }
            updateProgress(requestId, 90, "Saving protected PDF", "running");
            var artifact = artifactService.create(requestId, {
                type: "pdf",
                data: pdf,
                fileName: "jira-protocol-" + requestId + ".pdf",
                label: "Open PDF",
                autoOpen: true
            });
            updateProgress(requestId, 100, "Ready", "ready");
            return {
                message: text(rendered.message, 2000) || "Jira Asset Protocol is ready.",
                output: protocolText,
                rawOutput: protocolText,
                data: rendered.data && typeof rendered.data === "object" ? rendered.data : rendered,
                artifacts: [artifact],
                exitCode: executionResult && executionResult.exitCode == null ? 0 : executionResult.exitCode,
                scriptPath: script.path,
                label: script.label || script.name || "Jira Asset Protocol"
            };
        }).catch(function (error) {
            var previous = progressByRequest[requestId];
            updateProgress(requestId, previous && previous.percent || 0, "Failed", "failed");
            throw error;
        });
    }

    return {
        execute: execute,
        isProtocolScript: protocolScript,
        progress: progress,
        updateProgress: updateProgress
    };
};

module.exports.isProtocolScript = protocolScript;

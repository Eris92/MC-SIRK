"use strict";

var artifactFactory = require("./artifact-service.js");
var documentTemplateRenderer = require("./document-template-renderer.js");
var htmlPdfRenderer = require("./html-pdf-renderer.js");
var brandingFactory = require("./branding-service.js");
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

function equipmentTable(data) {
    data = object(data);
    var assets = Array.isArray(data.assets) ? data.assets : [];
    return {
        meshTable: true,
        title: "Sprzęt",
        columns: ["Hostname", "Producent", "Model", "Numer seryjny", "Numer inwentarzowy", "Asset ID"],
        rows: assets.map(function (asset) {
            asset = object(asset);
            return {
                "Hostname": text(asset.hostname, 500),
                "Producent": text(asset.manufacturer, 500),
                "Model": text(asset.model, 500),
                "Numer seryjny": text(asset.serialNumber, 500),
                "Numer inwentarzowy": text(asset.inventoryNumber, 500),
                "Asset ID": text(asset.assetIdentifier, 500)
            };
        })
    };
}

function lower(value) {
    return text(value, 4000).toLowerCase();
}

function validPdf(value) {
    return Buffer.isBuffer(value) && value.length >= 100 && value.slice(0, 8).toString("ascii").indexOf("%PDF-1.") === 0;
}

function protocolScript(script) {
    return !!(script && Array.isArray(script.extraHeaders) && script.extraHeaders.some(function (header) {
        return /^SirkWorkflow\s*:\s*JiraAssetProtocol$/i.test(String(header || "").trim());
    }));
}

function protocolAssetVariable(script) {
    var variables = script && Array.isArray(script.variables) ? script.variables : [];
    return variables.filter(function (variable) {
        return variable && variable.control === "asset" && String(variable.name || "") === "PcName";
    })[0] || variables.filter(function (variable) {
        return variable && variable.control === "asset";
    })[0] || null;
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
function findMeshUser(parent, value) {
    var wanted = lower(value), web = shared.getWebServer(parent), users = web && web.users || {};
    if (!wanted) return null;
    var ids = Object.keys(users);
    for (var index = 0; index < ids.length; index++) {
        var user = users[ids[index]];
        if (!user || user.deleted != null) continue;
        if (lower(shared.userName(user)) === wanted || lower(user._id || ids[index]) === wanted || lower(user.name) === wanted) return user;
    }
    return null;
}

module.exports.createJiraProtocolService = function (options) {
    options = options || {};
    var context = options.context;
    var jiraAssets = options.jiraAssets;
    var executor = options.executor;
    var renderProtocolDocument = options.renderProtocolDocument || documentTemplateRenderer.renderJiraAssetProtocol;
    var renderHtmlPdf = options.renderHtmlPdf || htmlPdfRenderer.renderHtmlPdf;
    var branding = brandingFactory.createBrandingService({
        fs: context.fs,
        path: context.nativePath || context.path,
        dataRoot: context.dataRoot
    });
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

    function renderPdf(protocolHtml, protocolText, logoPath) {
        return Promise.resolve().then(function () {
            return renderHtmlPdf(protocolHtml, { logoPath: logoPath, fallbackText: protocolText });
        }).then(function (pdf) {
            if (!validPdf(pdf)) throw new Error("PDF renderer returned an invalid artifact.");
            return pdf;
        });
    }

    function execute(script, payload, request) {
        if (!protocolScript(script)) return Promise.reject(new Error("Invalid Jira protocol workflow."));
        var requestId = text(request && request.id, 128);
        if (!requestId) return Promise.reject(new Error("Protocol request ID is unavailable."));
        var assetVariable = protocolAssetVariable(script);
        if (!assetVariable) return Promise.reject(new Error("Jira protocol asset variable is unavailable."));

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
            var meshItPerson = findMeshUser(context.parent, inputs.itPersonValue);
            if (!meshItPerson && context.parent) throw new Error("Selected IT person is no longer available in MeshCentral.");
            selectedItPerson = {
                value: meshItPerson && (meshItPerson._id || meshItPerson.name) || inputs.itPersonValue,
                accountId: meshItPerson && meshItPerson._id || "",
                emailAddress: meshItPerson && (meshItPerson.email || meshItPerson.mail) || "",
                displayName: meshItPerson ? shared.userName(meshItPerson) : inputs.itPersonValue
            };
            updateProgress(requestId, 25, "Resolving Jira Assets", "running");
            return jiraAssets.listAssets(selectedUser.value || inputs.userValue, assetVariable);
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
            var protocolHtml = renderProtocolDocument(rendered.data);
            if (!text(protocolHtml, 1000000)) throw new Error("Shared document template returned no styled HTML document.");
            return renderPdf(protocolHtml, protocolText, branding.protocolLogoPath).then(function (pdf) {
                updateProgress(requestId, 90, "Saving protected PDF", "running");
                var artifact = artifactService.create(requestId, {
                    type: "pdf",
                    data: pdf,
                    fileName: "jira-protocol-" + requestId + ".pdf",
                    label: "Open PDF",
                    autoOpen: true
                });
                updateProgress(requestId, 100, "Ready", "ready");
                var fallbackReason = text(pdf && pdf.sirkFallbackReason, 1200);
                var message = text(rendered.message, 2000) || "Jira Asset Protocol is ready.";
                if (fallbackReason) {
                    message += " Uwaga: wygenerowano uproszczony (niesformatowany) PDF, ponieważ renderer stylizowanego dokumentu zawiódł: " + fallbackReason;
                }
                return {
                    message: message,
                    output: JSON.stringify(equipmentTable(rendered.data)),
                    rawOutput: protocolText,
                    data: rendered.data && typeof rendered.data === "object" ? rendered.data : rendered,
                    artifacts: [artifact],
                    exitCode: executionResult && executionResult.exitCode == null ? 0 : executionResult.exitCode,
                    scriptPath: script.path,
                    label: script.label || script.name || "Jira Asset Protocol"
                };
            });
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

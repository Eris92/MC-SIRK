"use strict";

var artifactFactory = require("./artifact-service.js");
var documentTemplateRenderer = require("./document-template-renderer.js");
var htmlPdfRenderer = require("./html-pdf-renderer.js");
var brandingFactory = require("./branding-service.js");
var confirmationFactory = require("./jira-asset-confirmation-service.js");
var shared = require("./shared.js");

var MAX_ASSETS_PER_PROTOCOL = 20;
var MAX_PROGRESS_ENTRIES = 200;
var PROGRESS_RETENTION_MS = 24 * 60 * 60 * 1000;

function text(value, limit) {
    return shared.cleanText(value == null ? "" : value, limit || 4000).trim();
}

function lower(value) {
    return text(value, 1000).toLowerCase();
}

function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
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

function actionMap(value) {
    var parsed = {};
    try { parsed = JSON.parse(String(value || "{}")); } catch (error) {}
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) parsed = {};
    var result = Object.create(null);
    Object.keys(parsed).slice(0, MAX_ASSETS_PER_PROTOCOL).forEach(function (key) {
        var stableKey = text(key, 200);
        var action = lower(parsed[key]);
        if (stableKey) result[stableKey] = action === "receive" || action === "return" ? action : "none";
    });
    return result;
}

function actionLabel(action) {
    if (action === "receive") return "Przyjęcie sprzętu";
    if (action === "return") return "Zdanie sprzętu";
    return "Bez zmian";
}

function stableAssetId(asset) {
    return text(asset && (asset.assetId || asset.objectId || asset.objectKey || asset.value), 200);
}

function findAssetByStableId(items, value) {
    var wanted = text(value, 200);
    if (!wanted) return null;
    return (Array.isArray(items) ? items : []).filter(function (item) {
        return [item && item.assetId, item && item.objectId, item && item.objectKey]
            .some(function (candidate) { return text(candidate, 200) === wanted; });
    })[0] || null;
}

function findUser(items, value) {
    var wanted = lower(value);
    if (!wanted) return null;
    return (Array.isArray(items) ? items : []).filter(function (item) {
        return [item && item.value, item && item.accountId, item && item.emailAddress, item && item.displayName]
            .some(function (candidate) { return lower(candidate) === wanted; });
    })[0] || null;
}

function publicAsset(asset, action) {
    return {
        assetId: stableAssetId(asset),
        objectId: text(asset && asset.objectId, 200),
        objectKey: text(asset && asset.objectKey, 200),
        assetIdentifier: text(asset && (asset.objectKey || asset.objectId), 500),
        hostname: text(asset && (asset.hostname || asset.value), 500),
        manufacturer: text(asset && asset.manufacturer, 500),
        model: text(asset && asset.model, 500),
        serialNumber: text(asset && asset.serialNumber, 500),
        inventoryNumber: text(asset && asset.inventoryNumber, 500),
        action: action || "none",
        actionLabel: actionLabel(action)
    };
}

function equipmentTable(data) {
    data = object(data);
    var assets = Array.isArray(data.assets) ? data.assets : [];
    return {
        meshTable: true,
        title: "Sprzęt",
        columns: ["Operacja", "Hostname", "Producent", "Model", "Numer seryjny", "Numer inwentarzowy", "Asset ID"],
        rows: assets.map(function (asset) {
            asset = object(asset);
            return {
                "Operacja": text(asset.actionLabel || actionLabel(asset.action), 200),
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

function validPdf(value) {
    return Buffer.isBuffer(value) && value.length >= 100 && value.slice(0, 8).toString("ascii").indexOf("%PDF-1.") === 0;
}

module.exports.createJiraProtocolService = function (options) {
    options = options || {};
    var context = options.context;
    var jiraAssets = options.jiraAssets;
    var mutation = confirmationFactory.createJiraAssetConfirmationService({
        integrations: context.integrations,
        jiraAssets: jiraAssets,
        requestJson: options.requestJson
    });
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
        while (ids.length > MAX_PROGRESS_ENTRIES) delete progressByRequest[ids.shift()];
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
        if (requestStatus === "awaiting_confirmation") return { percent: 100, stage: "Awaiting confirmation", state: "awaiting_confirmation", updatedAt: 0 };
        if (requestStatus === "confirming") return { percent: 100, stage: "Finalizing Jira Assets", state: "confirming", updatedAt: 0 };
        if (requestStatus === "pending" || requestStatus === "approved") return { percent: 0, stage: "Waiting for approval", state: "pending", updatedAt: 0 };
        if (requestStatus === "completed") return { percent: 100, stage: "Ready", state: "ready", updatedAt: 0 };
        if (requestStatus === "failed" || requestStatus === "rejected") return { percent: 0, stage: "Failed", state: "failed", updatedAt: 0 };
        return { percent: 5, stage: "Starting", state: "running", updatedAt: 0 };
    }

    function meshUser(value) {
        var wanted = lower(value);
        var web = shared.getWebServer(context.parent);
        var users = web && web.users || {};
        var ids = Object.keys(users);
        for (var index = 0; index < ids.length; index++) {
            var user = users[ids[index]];
            if (!user || user.deleted != null) continue;
            if (lower(user._id || ids[index]) === wanted || lower(user.name) === wanted || lower(shared.userName(user)) === wanted) return user;
        }
        return null;
    }

    function renderPdf(protocolHtml, protocolText) {
        return Promise.resolve(renderHtmlPdf(protocolHtml, {
            logoPath: branding.protocolLogoPath,
            fallbackText: protocolText
        })).then(function (pdf) {
            if (!validPdf(pdf)) throw new Error("PDF renderer returned an invalid artifact.");
            return pdf;
        });
    }

    function rawText(data) {
        var lines = [
            data.hasChanges ? "PROTOKÓŁ ZMIAN SPRZĘTU" : "PROTOKÓŁ UZGODNIENIA STANU SPRZĘTU",
            "Użytkownik: " + data.user.name,
            "Osoba IT: " + data.itPerson.name,
            "",
            "Zmiany na stanie:"
        ];
        data.assets.forEach(function (asset) {
            lines.push("- " + asset.actionLabel + ": " + (asset.hostname || asset.assetIdentifier));
        });
        lines.push("", "Stan po zmianie:");
        data.finalAssets.forEach(function (asset) {
            lines.push("- " + (asset.hostname || asset.assetIdentifier));
        });
        return lines.join("\n");
    }

    function protocolInventory(userValue, variable, force) {
        return mutation.protocolInventory(userValue, variable, force);
    }

    function execute(script, payload, request) {
        if (!protocolScript(script)) return Promise.reject(new Error("Invalid Jira protocol workflow."));
        var requestId = text(request && request.id, 128);
        var variable = protocolAssetVariable(script);
        if (!requestId || !variable) return Promise.reject(new Error("Protocol request context is unavailable."));

        var supplied = object(payload && payload.variableValues);
        var userValue = text(supplied.JiraUser, 500);
        var selected = selectedAssetValues(supplied.PcName);
        var itPersonValue = text(supplied.ItPerson, 500);
        var actions = actionMap(supplied.JiraAssetActionsJson);
        if (!userValue || !selected.length || !itPersonValue) {
            return Promise.reject(new Error("Jira user, equipment and IT person are required."));
        }

        updateProgress(requestId, 10, "Validating protocol", "running");
        var jiraUser;
        var itPerson;
        var selectedAssets;
        var currentItems;
        var changes;
        var snapshot;
        var protocolData;

        return jiraAssets.listUsers(false).then(function (users) {
            jiraUser = findUser(users && users.items, userValue);
            if (!jiraUser) throw new Error("Selected Jira user is no longer available.");
            var mesh = meshUser(itPersonValue);
            if (!mesh && context.parent) throw new Error("Selected IT person is no longer available in MeshCentral.");
            itPerson = {
                id: text(mesh && mesh._id || "", 500),
                name: mesh ? shared.userName(mesh) : itPersonValue,
                email: text(mesh && (mesh.email || mesh.mail), 500)
            };
            updateProgress(requestId, 25, "Resolving Jira Assets", "running");
            return protocolInventory(jiraUser.value || jiraUser.accountId, variable, false);
        }).then(function (inventory) {
            currentItems = Array.isArray(inventory.currentItems) ? inventory.currentItems : [];
            selectedAssets = selected.map(function (value) {
                var asset = findAssetByStableId(inventory.items || [], value);
                if (!asset) throw new Error("Selected Jira asset is no longer available in the protocol scope: " + value);
                var assetId = stableAssetId(asset);
                if (!assetId || assetId !== text(value, 200)) {
                    throw new Error("Selected Jira asset identity is invalid.");
                }
                var action = actions[assetId] || "none";
                if (action === "receive" && asset.assignedToUser === true) {
                    throw new Error("Jira asset is already assigned to the selected user: " + assetId + ".");
                }
                if (action === "return" && asset.assignedToUser !== true) {
                    throw new Error("Jira asset is no longer assigned to the selected user: " + assetId + ".");
                }
                return publicAsset(asset, action);
            });
            changes = selectedAssets.filter(function (asset) {
                return asset.action !== "none";
            }).map(function (asset) {
                return { assetId: asset.assetId, action: asset.action };
            });
            updateProgress(requestId, 40, changes.length ? "Capturing Jira ownership state" : "Building reconciliation", "running");
            if (!changes.length) return { version: 1, user: shared.copy(jiraUser), changes: [] };
            return mutation.snapshot(jiraUser, changes, variable);
        }).then(function (value) {
            snapshot = value;
            var finalMap = Object.create(null);
            currentItems.forEach(function (asset) {
                var key = stableAssetId(asset);
                if (key) finalMap[key] = publicAsset(asset, "none");
            });
            selectedAssets.forEach(function (asset) {
                if (asset.action === "return") delete finalMap[asset.assetId];
                else if (asset.action === "receive") finalMap[asset.assetId] = publicAsset(asset, "none");
            });
            protocolData = {
                mode: changes.length ? "changes" : "reconciliation",
                hasChanges: changes.length > 0,
                generatedAt: new Date().toISOString(),
                user: {
                    id: text(jiraUser.accountId || jiraUser.value, 500),
                    name: text(jiraUser.displayName || jiraUser.label || jiraUser.value, 500),
                    email: text(jiraUser.emailAddress, 500)
                },
                itPerson: itPerson,
                assets: selectedAssets,
                finalAssets: Object.keys(finalMap).map(function (key) {
                    return finalMap[key];
                }).sort(function (left, right) {
                    return String(left.hostname || left.assetIdentifier).localeCompare(String(right.hostname || right.assetIdentifier), "pl", { sensitivity: "base" });
                })
            };

            updateProgress(requestId, 60, "Preparing protocol PDF", "running");
            var protocolText = rawText(protocolData);
            var protocolHtml = renderProtocolDocument(protocolData);
            if (!text(protocolHtml, 1000000)) throw new Error("Shared document template returned no styled HTML document.");
            return renderPdf(protocolHtml, protocolText).then(function (pdf) {
                updateProgress(requestId, 90, "Saving protected PDF", "running");
                var artifact = artifactService.create(requestId, {
                    type: "pdf",
                    data: pdf,
                    fileName: "jira-protocol-" + requestId + ".pdf",
                    label: "Open PDF",
                    autoOpen: false
                });
                updateProgress(
                    requestId,
                    100,
                    protocolData.hasChanges ? "Awaiting confirmation" : "Ready",
                    protocolData.hasChanges ? "awaiting_confirmation" : "ready"
                );
                var fallbackReason = text(pdf && pdf.sirkFallbackReason, 1200);
                var message = protocolData.hasChanges ?
                    "Protocol prepared. Awaiting requester confirmation before Jira Assets is updated." :
                    "Reconciliation protocol is ready. No Jira Assets update is required.";
                if (fallbackReason) {
                    message += " Uwaga: wygenerowano uproszczony (niesformatowany) PDF, ponieważ renderer stylizowanego dokumentu zawiódł: " + fallbackReason;
                }
                var result = {
                    message: message,
                    output: JSON.stringify(equipmentTable(protocolData)),
                    rawOutput: protocolText,
                    data: protocolData,
                    artifacts: [artifact],
                    exitCode: 0,
                    scriptPath: script.path,
                    label: script.label || script.name || "Jira Asset Protocol"
                };
                if (protocolData.hasChanges) result._jiraConfirmation = snapshot;
                return result;
            });
        }).catch(function (error) {
            var previous = progressByRequest[requestId];
            updateProgress(requestId, previous && previous.percent || 0, "Failed", "failed");
            throw error;
        });
    }

    function requiresConfirmation(result) {
        return !!(result && result._jiraConfirmation &&
            Array.isArray(result._jiraConfirmation.changes) && result._jiraConfirmation.changes.length);
    }

    function confirm(result, request) {
        result = object(result);
        var snapshot = result._jiraConfirmation;
        if (!snapshot || !Array.isArray(snapshot.changes) || !snapshot.changes.length) {
            return Promise.resolve(shared.copy(result));
        }
        updateProgress(request && request.id, 100, "Finalizing Jira Assets", "confirming");
        return mutation.apply(snapshot).then(function (summary) {
            var completed = shared.copy(result);
            delete completed._jiraConfirmation;
            completed.data = object(completed.data);
            completed.data.cmdb = { updated: summary.updated, assetIds: summary.assetIds };
            completed.message = "Jira Assets updated after requester confirmation: " + summary.updated + " item(s).";
            updateProgress(request && request.id, 100, "Ready", "ready");
            return completed;
        }).catch(function (error) {
            updateProgress(request && request.id, 100, "Jira Assets finalization failed", "failed");
            throw error;
        });
    }

    return {
        confirm: confirm,
        execute: execute,
        isProtocolScript: protocolScript,
        progress: progress,
        protocolInventory: protocolInventory,
        requiresConfirmation: requiresConfirmation,
        updateProgress: updateProgress
    };
};

module.exports.isProtocolScript = protocolScript;

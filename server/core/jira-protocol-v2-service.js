"use strict";

var artifactFactory = require("./artifact-service.js");
var htmlPdfRenderer = require("./html-pdf-renderer.js");
var brandingFactory = require("./branding-service.js");
var documentRenderer = require("./jira-protocol-document-renderer.js");
var confirmationFactory = require("./jira-asset-confirmation-service.js");
var shared = require("./shared.js");

var MAX_ASSETS = 20;
var PROGRESS_RETENTION_MS = 24 * 60 * 60 * 1000;

function text(value, limit) { return shared.cleanText(value == null ? "" : value, limit || 4000).trim(); }
function lower(value) { return text(value, 1000).toLowerCase(); }
function object(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function protocolScript(script) { return !!(script && Array.isArray(script.extraHeaders) && script.extraHeaders.some(function (header) { return /^SirkWorkflow\s*:\s*JiraAssetProtocol$/i.test(String(header || "").trim()); })); }
function assetVariable(script) { return (script && script.variables || []).filter(function (item) { return item && item.control === "asset" && String(item.name || "") === "PcName"; })[0] || null; }
function valuesList(value) { var seen = Object.create(null); return String(value == null ? "" : value).split(/[;,|\r\n]+/).map(function (item) { return item.trim(); }).filter(function (item) { var key = item.toLowerCase(); if (!key || seen[key]) return false; seen[key] = true; return true; }).slice(0, MAX_ASSETS); }
function actionMap(value) { var parsed = {}; try { parsed = JSON.parse(String(value || "{}")); } catch (error) {} if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) parsed = {}; var result = Object.create(null); Object.keys(parsed).slice(0, MAX_ASSETS).forEach(function (key) { var action = lower(parsed[key]); result[text(key, 200)] = action === "receive" || action === "return" ? action : "none"; }); return result; }
function actionLabel(action) { return action === "receive" ? "Przyjęcie sprzętu" : action === "return" ? "Zdanie sprzętu" : "Bez zmian"; }
function stableId(asset) { return text(asset && (asset.assetId || asset.objectId || asset.objectKey || asset.value), 200); }
function findAsset(items, value) { var wanted = lower(value); return (items || []).filter(function (item) { return [item && item.value, item && item.assetId, item && item.objectId, item && item.objectKey, item && item.hostname].some(function (candidate) { return lower(candidate) === wanted; }); })[0] || null; }
function findUser(items, value) { var wanted = lower(value); return (items || []).filter(function (item) { return [item && item.value, item && item.accountId, item && item.emailAddress, item && item.displayName].some(function (candidate) { return lower(candidate) === wanted; }); })[0] || null; }
function publicAsset(asset, action) { return { assetId: stableId(asset), objectId: text(asset && asset.objectId, 200), objectKey: text(asset && asset.objectKey, 200), assetIdentifier: text(asset && (asset.objectKey || asset.objectId), 500), hostname: text(asset && (asset.hostname || asset.value), 500), manufacturer: text(asset && asset.manufacturer, 500), model: text(asset && asset.model, 500), serialNumber: text(asset && asset.serialNumber, 500), inventoryNumber: text(asset && asset.inventoryNumber, 500), action: action, actionLabel: actionLabel(action) }; }
function table(data) { return { meshTable: true, title: "Sprzęt", columns: ["Operacja", "Hostname", "Producent", "Model", "Numer seryjny", "Numer inwentarzowy", "Asset ID"], rows: (data.assets || []).map(function (asset) { return { "Operacja": asset.actionLabel, "Hostname": asset.hostname, "Producent": asset.manufacturer, "Model": asset.model, "Numer seryjny": asset.serialNumber, "Numer inwentarzowy": asset.inventoryNumber, "Asset ID": asset.assetIdentifier }; }) }; }
function escape(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]; }); }

module.exports.createJiraProtocolService = function (options) {
    options = options || {};
    var context = options.context, jiraAssets = options.jiraAssets, executor = options.executor;
    var mutation = confirmationFactory.createJiraAssetConfirmationService({ integrations: context.integrations, jiraAssets: jiraAssets, requestJson: options.requestJson });
    var artifactService = options.artifactService || artifactFactory.createArtifactService({ fs: context.fs, path: context.nativePath || context.path, dataRoot: context.dataRoot });
    var branding = brandingFactory.createBrandingService({ fs: context.fs, path: context.nativePath || context.path, dataRoot: context.dataRoot });
    var progressRows = Object.create(null);

    function updateProgress(id, percent, stage, state) { id = text(id, 128); if (!id) return; progressRows[id] = { percent: Math.max(0, Math.min(100, Number(percent) || 0)), stage: text(stage, 240), state: text(state, 40) || "running", updatedAt: Date.now() }; Object.keys(progressRows).forEach(function (key) { if (progressRows[key].updatedAt < Date.now() - PROGRESS_RETENTION_MS) delete progressRows[key]; }); }
    function progress(id, status) { var row = progressRows[text(id, 128)]; if (row) return shared.copy(row); if (status === "awaiting_confirmation") return { percent: 100, stage: "Awaiting confirmation", state: "awaiting_confirmation", updatedAt: 0 }; if (status === "confirming") return { percent: 100, stage: "Finalizing Jira Assets", state: "confirming", updatedAt: 0 }; if (status === "completed") return { percent: 100, stage: "Ready", state: "ready", updatedAt: 0 }; if (status === "pending" || status === "approved") return { percent: 0, stage: "Waiting for approval", state: "pending", updatedAt: 0 }; if (status === "failed" || status === "rejected") return { percent: 0, stage: "Failed", state: "failed", updatedAt: 0 }; return { percent: 5, stage: "Starting", state: "running", updatedAt: 0 }; }
    function meshUser(value) { var wanted = lower(value), web = shared.getWebServer(context.parent), users = web && web.users || {}; var ids = Object.keys(users); for (var i = 0; i < ids.length; i++) { var user = users[ids[i]]; if (!user || user.deleted != null) continue; if (lower(user._id || ids[i]) === wanted || lower(user.name) === wanted || lower(shared.userName(user)) === wanted) return user; } return null; }
    function sharedDocument(title, body) {
        var templatePath = (context.nativePath || context.path).join(context.pluginRoot, "server", "templates", "document-a4.html");
        var template = context.fs.readFileSync(templatePath, "utf8");
        var logo = "";
        try { var data = context.fs.readFileSync(branding.protocolLogoPath); if (data && data.length) logo = "data:image/png;base64," + data.toString("base64"); } catch (error) {}
        return template.replace(/{{DOCUMENT_TITLE}}/g, escape(title)).replace(/{{DOCUMENT_LOGO_DATA_URI}}/g, logo).replace(/{{DOCUMENT_LOGO_ALT}}/g, "Logo").replace(/{{DOCUMENT_BODY}}/g, body);
    }
    function renderHtml(data) { return documentRenderer.render(data, { renderDocument: sharedDocument }); }
    function renderPdf(html, fallbackText) { return (options.renderHtmlPdf || htmlPdfRenderer.renderHtmlPdf)(html, { logoPath: branding.protocolLogoPath, fallbackText: fallbackText }).then(function (pdf) { if (!Buffer.isBuffer(pdf) || pdf.length < 100 || pdf.slice(0, 8).toString("ascii").indexOf("%PDF-1.") !== 0) throw new Error("PDF renderer returned an invalid artifact."); return pdf; }); }
    function rawText(data) {
        var lines = [data.hasChanges ? "PROTOKÓŁ ZMIAN SPRZĘTU" : "PROTOKÓŁ UZGODNIENIA STANU SPRZĘTU", "Użytkownik: " + data.user.name, "Osoba IT: " + data.itPerson.name, "", "Zmiany na stanie:"];
        data.assets.forEach(function (asset) { lines.push("- " + asset.actionLabel + ": " + (asset.hostname || asset.assetIdentifier)); });
        lines.push("", "Stan po zmianie:"); data.finalAssets.forEach(function (asset) { lines.push("- " + (asset.hostname || asset.assetIdentifier)); }); return lines.join("\n");
    }

    function execute(script, payload, request) {
        if (!protocolScript(script)) return Promise.reject(new Error("Invalid Jira protocol workflow."));
        var id = text(request && request.id, 128), variable = assetVariable(script), supplied = object(payload && payload.variableValues);
        if (!id || !variable) return Promise.reject(new Error("Protocol request context is unavailable."));
        var userValue = text(supplied.JiraUser, 500), selected = valuesList(supplied.PcName), itValue = text(supplied.ItPerson, 500), actions = actionMap(supplied.JiraAssetActionsJson);
        if (!userValue || !selected.length || !itValue) return Promise.reject(new Error("Jira user, equipment and IT person are required."));
        updateProgress(id, 10, "Validating protocol", "running");
        var jiraUser, itPerson, assets, currentItems, changes, snapshot, data;
        return jiraAssets.listUsers(false).then(function (users) {
            jiraUser = findUser(users && users.items, userValue); if (!jiraUser) throw new Error("Selected Jira user is no longer available.");
            var mesh = meshUser(itValue); if (!mesh && context.parent) throw new Error("Selected IT person is no longer available in MeshCentral.");
            itPerson = { id: text(mesh && mesh._id || "", 500), name: mesh ? shared.userName(mesh) : itValue, email: text(mesh && (mesh.email || mesh.mail), 500) };
            updateProgress(id, 25, "Resolving Jira Assets", "running");
            return mutation.protocolInventory(jiraUser.value, variable, false);
        }).then(function (inventory) {
            currentItems = inventory.currentItems || [];
            assets = selected.map(function (value) { var asset = findAsset(inventory.items || [], value); if (!asset) throw new Error("Selected Jira asset is no longer available in the protocol scope: " + value); var assetId = stableId(asset), action = actions[assetId] || "none"; if (action === "receive" && asset.assignedToUser) throw new Error("Jira asset is already assigned to the selected user: " + assetId + "."); if (action === "return" && !asset.assignedToUser) throw new Error("Jira asset is no longer assigned to the selected user: " + assetId + "."); return publicAsset(asset, action); });
            changes = assets.filter(function (asset) { return asset.action !== "none"; }).map(function (asset) { return { assetId: asset.assetId, action: asset.action }; });
            updateProgress(id, 40, changes.length ? "Capturing Jira ownership state" : "Building reconciliation", "running");
            return changes.length ? mutation.snapshot(jiraUser, changes) : { version: 1, user: shared.copy(jiraUser), changes: [] };
        }).then(function (value) {
            snapshot = value;
            var finalMap = Object.create(null); currentItems.forEach(function (asset) { var key = stableId(asset); if (key) finalMap[key] = publicAsset(asset, "none"); });
            assets.forEach(function (asset) { if (asset.action === "return") delete finalMap[asset.assetId]; else if (asset.action === "receive") finalMap[asset.assetId] = publicAsset(asset, "none"); });
            data = { mode: changes.length ? "changes" : "reconciliation", hasChanges: changes.length > 0, generatedAt: new Date().toISOString(), user: { id: text(jiraUser.accountId || jiraUser.value, 500), name: text(jiraUser.displayName || jiraUser.label || jiraUser.value, 500), email: text(jiraUser.emailAddress, 500) }, itPerson: itPerson, assets: assets, finalAssets: Object.keys(finalMap).map(function (key) { return finalMap[key]; }).sort(function (a, b) { return String(a.hostname || a.assetIdentifier).localeCompare(String(b.hostname || b.assetIdentifier), "pl", { sensitivity: "base" }); }) };
            updateProgress(id, 60, "Preparing protocol PDF", "running");
            var fallback = rawText(data), html = renderHtml(data);
            return renderPdf(html, fallback).then(function (pdf) { var artifact = artifactService.create(id, { type: "pdf", data: pdf, fileName: "jira-protocol-" + id + ".pdf", label: "Open PDF", autoOpen: false }); updateProgress(id, 100, data.hasChanges ? "Awaiting confirmation" : "Ready", data.hasChanges ? "awaiting_confirmation" : "ready"); var result = { message: data.hasChanges ? "Protocol prepared. Awaiting requester confirmation before Jira Assets is updated." : "Reconciliation protocol is ready. No Jira Assets update is required.", output: JSON.stringify(table(data)), rawOutput: fallback, data: data, artifacts: [artifact], exitCode: 0, scriptPath: script.path, label: script.label || script.name || "Jira Asset Protocol" }; if (data.hasChanges) result._jiraConfirmation = snapshot; return result; });
        }).catch(function (error) { updateProgress(id, 0, "Failed", "failed"); throw error; });
    }
    function requiresConfirmation(result) { return !!(result && result._jiraConfirmation && Array.isArray(result._jiraConfirmation.changes) && result._jiraConfirmation.changes.length); }
    function confirm(result, request) {
        result = object(result); var snapshot = result._jiraConfirmation;
        if (!snapshot || !Array.isArray(snapshot.changes) || !snapshot.changes.length) return Promise.resolve(shared.copy(result));
        updateProgress(request && request.id, 100, "Finalizing Jira Assets", "confirming");
        return mutation.apply(snapshot).then(function (summary) { var completed = shared.copy(result); delete completed._jiraConfirmation; completed.data.cmdb = { updated: summary.updated, assetIds: summary.assetIds }; completed.message = "Jira Assets updated after requester confirmation: " + summary.updated + " item(s)."; updateProgress(request && request.id, 100, "Ready", "ready"); return completed; }).catch(function (error) { updateProgress(request && request.id, 100, "Jira Assets finalization failed", "failed"); throw error; });
    }

    return { execute: execute, confirm: confirm, requiresConfirmation: requiresConfirmation, progress: progress, isProtocolScript: protocolScript };
};
module.exports.isProtocolScript = protocolScript;

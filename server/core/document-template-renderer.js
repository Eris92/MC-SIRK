"use strict";

var fs = require("fs");
var path = require("path");

var DEFAULT_TEMPLATE = path.join(__dirname, "..", "templates", "document-a4.html");

function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function fill(template, values) {
    return String(template || "").replace(/\{\{([A-Z0-9_]+)\}\}/g, function (_, name) {
        return Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : "";
    });
}

function renderDocument(options) {
    options = options || {};
    var templatePath = options.templatePath || DEFAULT_TEMPLATE;
    var template = fs.readFileSync(templatePath, "utf8");
    return fill(template, {
        LANG: escapeHtml(options.lang || "pl"),
        TITLE: escapeHtml(options.title),
        LOGO_MARKUP: String(options.logoMarkup || "__SIRK_DOCUMENT_LOGO_MARKUP__"),
        HEADER_META: String(options.headerMeta || ""),
        DOCUMENT_TYPE: escapeHtml(options.documentType),
        DOCUMENT_BODY: String(options.documentBody || ""),
        FOOTER: escapeHtml(options.footer || "")
    });
}

function protocolValue(value) {
    return String(value == null || value === "" ? "-" : value);
}

function assetIdentifier(asset) {
    asset = asset && typeof asset === "object" ? asset : {};
    return asset.inventoryNumber || asset.assetIdentifier || asset.objectKey || asset.objectId || "-";
}

function protocolRows(assets, includeAction) {
    var rows = (Array.isArray(assets) ? assets : []).map(function (asset) {
        asset = asset && typeof asset === "object" ? asset : {};
        var action = includeAction ? "<td>" + escapeHtml(protocolValue(asset.actionLabel || "Bez zmian")) + "</td>" : "";
        return "<tr>" + action +
            "<td>" + escapeHtml(protocolValue(asset.manufacturer)) + "</td>" +
            "<td>" + escapeHtml(protocolValue(asset.model)) + "</td>" +
            "<td>" + escapeHtml(protocolValue(asset.serialNumber)) + "</td>" +
            "<td>" + escapeHtml(protocolValue(assetIdentifier(asset))) + "</td></tr>";
    }).join("");
    if (!rows) rows = '<tr><td colspan="' + (includeAction ? "5" : "4") + '">Brak danych sprzętu.</td></tr>';
    return rows;
}

function renderConfirmationProtocol(data) {
    var user = data.user && typeof data.user === "object" ? data.user : {};
    var itPerson = data.itPerson && typeof data.itPerson === "object" ? data.itPerson : {};
    var generatedAt = String(data.generatedAt || "");
    var localDate = generatedAt;
    try { localDate = new Date(generatedAt).toLocaleString("sv-SE").replace("T", " "); } catch (error) {}
    var changedAssets = (Array.isArray(data.assets) ? data.assets : []).filter(function (asset) {
        return asset && (asset.action === "receive" || asset.action === "return");
    });
    var changeRows = changedAssets.length ? protocolRows(changedAssets, true) : '<tr><td colspan="5">Brak zmian na stanie.</td></tr>';
    var title = "PROTOKÓŁ PRZEKAZANIA/ZWROTU SPRZĘTU";
    var statement = data.hasChanges ?
        "Oświadczam, że zapoznałem/am się ze stanem przekazywanego sprzętu, nie zgłaszam uwag oraz zapoznałem/am się z regulaminem użytkowania sprzętu służbowego." :
        "Protokół potwierdza uzgodniony stan sprzętu i nie zleca żadnej zmiany w Jira Assets.";
    var headerMeta = "<div class=\"header-date\"><strong>Data wygenerowania:</strong> " + escapeHtml(localDate) + "</div>";
    var body = "<div class=\"section\"><h2>Zmiany na stanie</h2><table><thead><tr><th>Operacja</th><th>Marka</th><th>Model</th><th>SN</th><th>Nr. INV / Asset ID</th>" +
        "</tr></thead><tbody>" + changeRows + "</tbody></table>" +
        "<div class=\"note\"><strong>Legenda:</strong><br>* Przyjęcie sprzętu - sprzęt zostaje przypisany do użytkownika<br>" +
        "** Zdanie sprzętu - sprzęt zostaje zdjęty ze stanu użytkownika</div></div>" +
        "<div class=\"section\"><h2>Stan po zmianie</h2><table><thead><tr><th>Marka</th><th>Model</th><th>SN</th><th>Nr. INV / Asset ID</th>" +
        "</tr></thead><tbody>" + protocolRows(data.finalAssets, false) + "</tbody></table></div>" +
        "<div class=\"note\">" + escapeHtml(statement) + "</div>" +
        "<div class=\"people\"><div class=\"person\"><span>Użytkownik</span><strong>" + escapeHtml(protocolValue(user.name)) +
        "</strong></div><div class=\"person\"><span>Przedstawiciel IT</span><strong>" + escapeHtml(protocolValue(itPerson.name)) +
        "</strong></div></div><div class=\"signatures\"><div class=\"signature\">Podpis</div><div class=\"signature\">Podpis</div></div>";
    return renderDocument({ title: title, headerMeta: headerMeta, documentBody: body, footer: "" });
}

function renderLegacyProtocol(data) {
    var assets = Array.isArray(data.assets) ? data.assets : [];
    var transfer = String(data.mode || "").toLowerCase() === "transfer";
    var title = "Protokół zdawczo-odbiorczy";
    var protocolType = transfer ? "odbiór sprzętu przez pracownika" : "zwrot sprzętu do IT";
    var user = data.user && typeof data.user === "object" ? data.user : {};
    var itPerson = data.itPerson && typeof data.itPerson === "object" ? data.itPerson : {};
    var generatedAt = String(data.generatedAt || "");
    var localDate = generatedAt;
    try { localDate = new Date(generatedAt).toLocaleString("sv-SE").replace("T", " "); } catch (error) {}
    var rows = assets.map(function (asset) {
        asset = asset && typeof asset === "object" ? asset : {};
        return "<tr><td>" + escapeHtml(protocolValue(asset.manufacturer)) + "</td><td>" + escapeHtml(protocolValue(asset.model)) +
            "</td><td>" + escapeHtml(protocolValue(asset.serialNumber)) + "</td><td>" + escapeHtml(protocolValue(asset.inventoryNumber)) + "</td></tr>";
    }).join("");
    if (!rows) rows = '<tr><td colspan="4">Brak danych sprzętu.</td></tr>';
    var statement = "Oświadczam, że zapoznałem/am się ze stanem przekazywanego sprzętu, nie zgłaszam uwag oraz zapoznałem/am się z regulaminem użytkowania sprzętu służbowego.";
    var body = "<div class=\"meta\"><div><strong>Data wygenerowania:</strong> " + escapeHtml(localDate) +
        "</div><div><strong>Typ protokołu:</strong> " + escapeHtml(protocolType) + "</div></div>" +
        "<div class=\"section\"><h2>Sprzęt</h2><table><thead><tr><th>Marka</th><th>Model</th><th>SN</th><th>Nr. INV</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
        "<div class=\"people\"><div class=\"person\"><span>Użytkownik</span><strong>" + escapeHtml(protocolValue(user.name)) +
        "</strong></div><div class=\"person\"><span>Przedstawiciel IT</span><strong>" + escapeHtml(protocolValue(itPerson.name)) +
        "</strong></div></div><div class=\"note\">" + escapeHtml(statement) + "</div>" +
        "<div class=\"signatures\"><div class=\"signature\">Podpis</div><div class=\"signature\">Podpis</div></div>";
    return renderDocument({ title: title, documentBody: body, footer: "" });
}

function renderJiraAssetProtocol(data) {
    data = data && typeof data === "object" ? data : {};
    var mode = String(data.mode || "").toLowerCase();
    if (typeof data.hasChanges === "boolean" || mode === "changes" || mode === "reconciliation") {
        return renderConfirmationProtocol(data);
    }
    return renderLegacyProtocol(data);
}

module.exports = {
    escapeHtml: escapeHtml,
    renderDocument: renderDocument,
    renderJiraAssetProtocol: renderJiraAssetProtocol,
    templatePath: DEFAULT_TEMPLATE
};

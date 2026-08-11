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
        DOCUMENT_TYPE: escapeHtml(options.documentType),
        DOCUMENT_BODY: String(options.documentBody || ""),
        FOOTER: escapeHtml(options.footer || "")
    });
}

function renderJiraAssetProtocol(data) {
    data = data && typeof data === "object" ? data : {};
    var assets = Array.isArray(data.assets) ? data.assets : [];
    var transfer = String(data.mode || "").toLowerCase() === "transfer";
    var title = "Protokół zdawczo-odbiorczy";
    var protocolType = transfer ? "odbiór sprzętu przez pracownika" : "zwrot sprzętu do IT";
    var user = data.user && typeof data.user === "object" ? data.user : {};
    var itPerson = data.itPerson && typeof data.itPerson === "object" ? data.itPerson : {};
    var generatedAt = String(data.generatedAt || "");
    var localDate = generatedAt;
    try { localDate = new Date(generatedAt).toLocaleString("sv-SE").replace("T", " "); } catch (error) {}
    function protocolValue(value) { return String(value == null || value === "" ? "-" : value); }
    var rows = assets.map(function (asset) {
        asset = asset && typeof asset === "object" ? asset : {};
        return "<tr><td>" + escapeHtml(protocolValue(asset.manufacturer)) + "</td><td>" + escapeHtml(protocolValue(asset.model)) +
            "</td><td>" + escapeHtml(protocolValue(asset.serialNumber)) + "</td><td>" + escapeHtml(protocolValue(asset.inventoryNumber)) + "</td></tr>";
    }).join("");
    if (!rows) rows = '<tr><td colspan="4">Brak danych sprzętu.</td></tr>';
    var givingPerson = transfer ? itPerson.name : user.name;
    var receivingPerson = transfer ? user.name : itPerson.name;
    var statement = "Oświadczam, że zapoznałem/am się ze stanem przekazywanego sprzętu, nie zgłaszam uwag oraz zapoznałem/am się z regulaminem użytkowania sprzętu służbowego.";
    var body = "<div class=\"meta\"><div><strong>Data wygenerowania:</strong> " + escapeHtml(localDate) +
        "</div><div><strong>Typ protokołu:</strong> " + escapeHtml(protocolType) + "</div></div>" +
        "<div class=\"section\"><h2>Sprzęt</h2><table><thead><tr><th>Marka</th><th>Model</th><th>SN</th><th>Nr. INV</th>" +
        "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
        "<div class=\"people\"><div class=\"person\"><span>Osoba przekazująca</span><strong>" + escapeHtml(protocolValue(givingPerson)) +
        "</strong></div><div class=\"person\"><span>Osoba odbierająca</span><strong>" + escapeHtml(protocolValue(receivingPerson)) +
        "</strong></div></div><div class=\"note\">" + escapeHtml(statement) + "</div>" +
        "<div class=\"signatures\"><div class=\"signature\">Podpis osoby przekazującej</div>" +
        "<div class=\"signature\">Podpis osoby odbierającej</div></div>";
    return renderDocument({
        title: title,
        documentBody: body,
        footer: ""
    });
}

module.exports = {
    escapeHtml: escapeHtml,
    renderDocument: renderDocument,
    renderJiraAssetProtocol: renderJiraAssetProtocol,
    templatePath: DEFAULT_TEMPLATE
};

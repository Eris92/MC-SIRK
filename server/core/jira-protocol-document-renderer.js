"use strict";

function text(value) { return String(value == null ? "" : value); }
function escape(value) { return text(value).replace(/[&<>"']/g, function (char) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]; }); }
function identifier(asset) { return asset && (asset.inventoryNumber || asset.assetIdentifier || asset.objectKey || asset.objectId) || "—"; }
function td(value) { return "<td>" + escape(value || "—") + "</td>"; }
function rows(assets, actions) { return (Array.isArray(assets) ? assets : []).map(function (asset) { return "<tr>" + (actions ? td(asset.actionLabel || "Bez zmian") : "") + td(asset.manufacturer) + td(asset.model) + td(asset.serialNumber) + td(identifier(asset)) + "</tr>"; }).join(""); }
function signatures(data) { var receive = 0, returned = 0; (data.assets || []).forEach(function (asset) { if (asset.action === "receive") receive++; else if (asset.action === "return") returned++; }); if (receive && returned) return ["Użytkownik (przekazujący / odbierający)", "Osoba IT (przekazująca / odbierająca)"]; if (receive) return ["Osoba przekazująca (IT)", "Osoba odbierająca (użytkownik)"]; if (returned) return ["Osoba przekazująca (użytkownik)", "Osoba odbierająca (IT)"]; return ["Użytkownik", "Osoba IT"]; }

module.exports.render = function (data, renderDocument) {
    data = data || {}; var user = data.user || {}, it = data.itPerson || {}, sign = signatures(data);
    var title = data.hasChanges ? "Protokół zmian sprzętu" : "Protokół uzgodnienia stanu sprzętu";
    var body = [
        '<section class="doc-meta"><div><strong>Użytkownik:</strong> ' + escape(user.name || "—") + '</div><div><strong>E-mail:</strong> ' + escape(user.email || "—") + '</div><div><strong>Osoba IT:</strong> ' + escape(it.name || "—") + '</div><div><strong>Data:</strong> ' + escape(data.generatedAt || "—") + '</div></section>',
        '<h2>Zmiany na stanie</h2><table><thead><tr><th>Operacja</th><th>Marka</th><th>Model</th><th>SN</th><th>Nr INV / Asset ID</th></tr></thead><tbody>' + rows(data.assets, true) + '</tbody></table>',
        '<div class="doc-note"><strong>Legenda:</strong> Przyjęcie sprzętu — przypisanie do użytkownika; Zdanie sprzętu — odpisanie od użytkownika; Bez zmian — wyłącznie potwierdzenie, bez zapisu do CMDB.</div>',
        '<h2>Stan po zmianie</h2><table><thead><tr><th>Marka</th><th>Model</th><th>SN</th><th>Nr INV / Asset ID</th></tr></thead><tbody>' + rows(data.finalAssets, false) + '</tbody></table>',
        '<p class="doc-statement">' + escape(data.hasChanges ? "Zmiany w Jira Assets zostaną wykonane dopiero po podpisaniu protokołu i potwierdzeniu operacji przez uprawnioną osobę." : "Protokół potwierdza bieżący stan i nie zleca żadnej zmiany w Jira Assets.") + '</p>',
        '<section class="doc-signatures"><div><div class="signature-line"></div><strong>' + escape(sign[0]) + '</strong></div><div><div class="signature-line"></div><strong>' + escape(sign[1]) + '</strong></div></section>'
    ].join("");
    return renderDocument(title, body);
};

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var renderer = require("../server/core/document-template-renderer.js");
var root = path.join(__dirname, "..");
var serviceSource = fs.readFileSync(path.join(root, "server/core/jira-protocol-service.js"), "utf8");
var seedSource = fs.readFileSync(path.join(root, "seed/MyScripts/Jira/Jira Asset Protocol.ps1"), "utf8");

function participantData(action) {
    var asset = {
        action: action,
        actionLabel: action === "receive" ? "Przyjęcie sprzętu" : action === "return" ? "Zdanie sprzętu" : "Bez zmian",
        manufacturer: "Lenovo",
        model: "T14",
        serialNumber: "SN1",
        inventoryNumber: "INV1",
        assetIdentifier: "IT-1"
    };
    return {
        mode: action === "none" ? "reconciliation" : "changes",
        hasChanges: action !== "none",
        generatedAt: "2026-08-18T07:00:00.000Z",
        user: { name: "Użytkownik Testowy", email: "user@example.invalid" },
        itPerson: { name: "Adam IT" },
        assets: [asset],
        finalAssets: action === "return" ? [] : [asset]
    };
}

function assertFixedParticipantOrder(html, context) {
    assert.ok(html.indexOf("<span>Użytkownik</span><strong>Użytkownik Testowy</strong>") >= 0,
        context + ": first participant must always be the user.");
    assert.ok(html.indexOf("<span>Przedstawiciel IT</span><strong>Adam IT</strong>") >= 0,
        context + ": second participant must always be the IT representative.");
    [
        "Osoba IT",
        "Osoba przekazująca (IT)",
        "Osoba odbierająca (IT)",
        "Osoba przekazująca (użytkownik)",
        "Osoba odbierająca (użytkownik)",
        "Użytkownik (przekazujący / odbierający)"
    ].forEach(function (legacyLabel) {
        assert.strictEqual(html.indexOf(legacyLabel), -1,
            context + ": direction-dependent participant label must not return: " + legacyLabel);
    });
}

["receive", "return", "none"].forEach(function (action) {
    var html = renderer.renderJiraAssetProtocol(participantData(action));
    assertFixedParticipantOrder(html, "current " + action + " protocol");
    assert.ok(html.indexOf("<strong>Przedstawiciel IT:</strong> Adam IT") >= 0,
        "Current protocol metadata must use Przedstawiciel IT for " + action + ".");
});

["transfer", "return"].forEach(function (mode) {
    var html = renderer.renderJiraAssetProtocol({
        mode: mode,
        generatedAt: "2026-08-18T07:00:00.000Z",
        user: { name: "Użytkownik Testowy" },
        itPerson: { name: "Adam IT" },
        assets: [{ manufacturer: "Lenovo", model: "T14", serialNumber: "SN1", inventoryNumber: "INV1" }]
    });
    assertFixedParticipantOrder(html, "legacy " + mode + " protocol");
});

assert.ok(seedSource.indexOf("VariableUserRequired: $ItPerson, Przedstawiciel IT|") >= 0,
    "Jira protocol dialog must label ItPerson as Przedstawiciel IT.");
assert.ok(seedSource.indexOf("przedstawiciela IT") >= 0,
    "Polish workflow description must use representative terminology.");
assert.ok(seedSource.indexOf("IT representative") >= 0,
    "English workflow description must use representative terminology.");
assert.strictEqual(seedSource.indexOf("Osoba IT"), -1,
    "Current Jira protocol script metadata must not expose the old Osoba IT label.");

assert.ok(serviceSource.indexOf('"Przedstawiciel IT: " + data.itPerson.name') >= 0,
    "Raw/debug protocol text must use Przedstawiciel IT.");
assert.strictEqual(serviceSource.indexOf('"Osoba IT: "'), -1,
    "Raw/debug protocol text must not retain the old Osoba IT label.");
assert.strictEqual(serviceSource.indexOf("IT person"), -1,
    "Current Jira protocol validation messages must use IT representative terminology.");

console.log("Jira protocol uses fixed User / IT representative order and representative terminology: OK");

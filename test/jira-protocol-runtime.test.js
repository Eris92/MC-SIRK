"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var renderer = require("../server/core/document-template-renderer.js");
var root = path.join(__dirname, "..");
var serviceSource = fs.readFileSync(path.join(root, "server/core/jira-protocol-service.js"), "utf8");
var serverSource = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
var clientSource = fs.readFileSync(path.join(root, "public/modules/automation/index.js"), "utf8");
var seedSource = fs.readFileSync(path.join(root, "seed/MyScripts/Jira/Jira Asset Protocol.ps1"), "utf8");
var parameterSource = fs.readFileSync(path.join(root, "public/shared/ui/parameter-dialog.js"), "utf8");

var html = renderer.renderJiraAssetProtocol({
    mode: "changes",
    hasChanges: true,
    generatedAt: "2026-08-17T10:00:00.000Z",
    user: { name: "Użytkownik Testowy", email: "user@example.invalid" },
    itPerson: { name: "Operator IT" },
    assets: [
        { action: "receive", actionLabel: "Przyjęcie sprzętu", manufacturer: "Lenovo", model: "T14", serialNumber: "SN1", inventoryNumber: "INV1", assetIdentifier: "IT-1" },
        { action: "return", actionLabel: "Zdanie sprzętu", manufacturer: "Dell", model: "U24", serialNumber: "SN2", inventoryNumber: "INV2", assetIdentifier: "IT-2" },
        { action: "none", actionLabel: "Bez zmian", manufacturer: "HP", model: "840", serialNumber: "SN3", inventoryNumber: "INV3", assetIdentifier: "IT-3" }
    ],
    finalAssets: [
        { manufacturer: "Lenovo", model: "T14", serialNumber: "SN1", inventoryNumber: "INV1", assetIdentifier: "IT-1" },
        { manufacturer: "HP", model: "840", serialNumber: "SN3", inventoryNumber: "INV3", assetIdentifier: "IT-3" }
    ]
});
assert.ok(html.indexOf("Zmiany na stanie") >= 0 && html.indexOf("Stan po zmianie") >= 0);
assert.ok(html.indexOf("Przyjęcie sprzętu") >= 0 && html.indexOf("Zdanie sprzętu") >= 0 && html.indexOf("Bez zmian") >= 0);
assert.ok(html.indexOf("Nr. INV / Asset ID") >= 0 && html.indexOf("Legenda") >= 0);

var reconciliation = renderer.renderJiraAssetProtocol({
    mode: "reconciliation",
    hasChanges: false,
    generatedAt: "2026-08-17T10:00:00.000Z",
    user: { name: "Użytkownik Testowy" },
    itPerson: { name: "Operator IT" },
    assets: [{ action: "none", actionLabel: "Bez zmian", model: "T14", assetIdentifier: "IT-1" }],
    finalAssets: [{ model: "T14", assetIdentifier: "IT-1" }]
});
assert.ok(reconciliation.indexOf("Protokół uzgodnienia stanu sprzętu") >= 0);
assert.ok(reconciliation.indexOf("nie zleca żadnej zmiany w Jira Assets") >= 0);

assert.ok(serviceSource.indexOf('require("./jira-asset-confirmation-service.js")') >= 0,
    "Canonical protocol owner may delegate bounded mutation inspection to one focused helper.");
assert.strictEqual(serviceSource.indexOf("server-script-executor"), -1,
    "Jira protocol CMDB workflow must no longer delegate its authority to the legacy PowerShell direction variable.");
assert.ok(serviceSource.indexOf('label: "Open PDF"') >= 0 && serviceSource.indexOf("autoOpen: false") >= 0,
    "Protected PDF lifecycle must remain explicit Open/Download only.");
var stableLookup = serviceSource.slice(
    serviceSource.indexOf("function findAssetByStableId"),
    serviceSource.indexOf("function findUser")
);
assert.ok(stableLookup.indexOf("assetId") >= 0 && stableLookup.indexOf("objectId") >= 0 && stableLookup.indexOf("objectKey") >= 0);
assert.strictEqual(stableLookup.indexOf("hostname"), -1,
    "Selected asset authorization must never match browser labels/hostnames.");
assert.ok(serverSource.indexOf('asset === "progress"') >= 0 && serverSource.indexOf("jiraProtocol.progress") >= 0);
assert.ok(serverSource.indexOf("jiraProtocol.protocolInventory") >= 0,
    "Protocol equipment options must use authoritative ownership metadata without changing the shared Jira cache scope.");
assert.ok(clientSource.indexOf('"awaiting_confirmation"') >= 0 && clientSource.indexOf("Download PDF") >= 0);
assert.ok(parameterSource.indexOf("variable && variable.dependsOn") >= 0,
    "Jira changes must not regress the generic explicit dependency contract.");
assert.strictEqual(seedSource.indexOf("VariableSwitchRequired: $IsTransferProtocol"), -1);
assert.ok(seedSource.indexOf('SirkJiraAssetAql: objectType in objectTypeAndChildren("Sprzęt użytkownika")') >= 0,
    "dev109 scoped Jira Assets behavior must remain unchanged.");
assert.strictEqual(seedSource.charCodeAt(0), 0xFEFF,
    "Polish PowerShell seed must retain UTF-8 BOM for Windows PowerShell 5.1.");
assert.strictEqual(seedSource.indexOf("MYSCRIPTS_JIRA_TOKEN"), -1);

console.log("Canonical Jira protocol renderer, protected artifact contract and dev109 scoped Jira source: OK");

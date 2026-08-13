"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var factory = require(path.join(root, "server/core/jira-asset-service.js"));

function integration() {
    return {
        get: function () {
            return {
                url: "https://example.atlassian.net",
                email: "service@example.invalid",
                token: "SECRET",
                cloudId: "cloud-1",
                workspaceId: "workspace-1",
                verifyTls: true
            };
        }
    };
}

function apiAsset(id, label, type, ownerDisplayValue) {
    return {
        id: id,
        objectKey: "KEY-" + id,
        label: label,
        objectType: { id: "type-" + type.toLowerCase(), name: type },
        attributes: [{
            objectTypeAttributeId: "responsible",
            objectAttributeValues: [{ value: "712020:acc-1", displayValue: ownerDisplayValue, searchValue: ownerDisplayValue }]
        }]
    };
}

(async function () {
    var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-responsible-"));
    try {
        var service = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: temp,
            integrations: integration(),
            requestJson: function (options) {
                if (options.url.indexOf("/rest/api/3/users/search") >= 0) {
                    return Promise.resolve([{ accountId: "712020:acc-1", displayName: "Przemysław Sobiech", emailAddress: "przemyslaw.sobiech@example.invalid", active: true }]);
                }
                if (options.url.indexOf("/object/aql") >= 0) {
                    return Promise.resolve({
                        values: [
                            apiAsset("1", "Laptop-01", "Komputer", "Przemysław Sobiech"),
                            apiAsset("2", "Monitor-01", "Monitor", "Przemysław Sobiech")
                        ],
                        objectTypeAttributes: [{ id: "responsible", name: "Osoba_odpowiedzialna" }],
                        hasMoreResults: false,
                        isLast: true
                    });
                }
                return Promise.reject(new Error("Unexpected request: " + options.url));
            }
        });

        var result = await service.optionsFor({
            control: "asset",
            jiraAsset: {
                aql: "objectType in objectTypeAndChildren(\"Sprzęt użytkownika\")",
                labelAttribute: "Hostname",
                maxResults: 5000,
                userVariable: "JiraUser"
            }
        }, { JiraUser: "712020:acc-1" }, false);

        assert.deepStrictEqual(result.items.map(function (item) { return item.objectType; }).sort(), ["Komputer", "Monitor"],
            "A plain-value 'Osoba_odpowiedzialna' (responsible person) attribute must bind equipment of every type to the selected Jira user, not only Komputer.");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }

    console.log("Jira 'Osoba_odpowiedzialna' plain-value assignment attribute matches every equipment type: OK");
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

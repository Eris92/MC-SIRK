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

function user(accountId, displayName) {
    return {
        accountId: accountId,
        displayName: displayName,
        emailAddress: accountId + "@example.invalid",
        active: true
    };
}

function asset(id, label, type, accountId, displayName) {
    return {
        id: id,
        objectKey: "KEY-" + id,
        label: label,
        objectType: { id: "type-" + id, name: type },
        attributes: [{
            objectTypeAttributeId: "responsible-person",
            objectAttributeValues: [{
                value: accountId,
                displayValue: displayName,
                searchValue: accountId
            }]
        }]
    };
}

(async function () {
    var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-responsible-person-"));
    try {
        var service = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: temp,
            integrations: integration(),
            requestJson: function (options) {
                if (options.url.indexOf("/rest/api/3/users/search") >= 0) {
                    return Promise.resolve([
                        user("acc-1", "User 1"),
                        user("acc-2", "User 2")
                    ]);
                }
                if (options.url.indexOf("/object/aql") >= 0) {
                    return Promise.resolve({
                        values: [
                            asset("1", "Laptop-01", "Komputer", "acc-1", "User 1"),
                            asset("2", "Monitor-01", "Monitor", "acc-1", "User 1"),
                            asset("3", "Tablet-Other", "Tablet", "acc-2", "User 2")
                        ],
                        objectTypeAttributes: [{
                            id: "responsible-person",
                            name: "Osoba_odpowiedzialna"
                        }],
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
                labelAttribute: "Nazwa_sieciowa",
                userVariable: "JiraUser"
            }
        }, { JiraUser: "acc-1" }, true);

        assert.deepStrictEqual(result.items.map(function (item) { return item.objectType; }).sort(), ["Komputer", "Monitor"],
            "Plain Osoba_odpowiedzialna values must bind every assigned equipment type to the selected Jira user.");
        assert.deepStrictEqual(result.items.map(function (item) { return item.value; }).sort(), ["Laptop-01", "Monitor-01"],
            "Equipment assigned to another Jira user must remain excluded.");

        console.log("Jira responsible-person plain assignment attribute matching: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

"use strict";

var assert = require("assert");
var factory = require("../server/core/integration-service.js");

var state = { integrations: {} };
var secretState = {};
var service = factory.createIntegrationService({
    parent: {},
    settings: {
        read: function () { return state; },
        update: function (callback) { state = callback(state); return Promise.resolve(state); }
    },
    secrets: {
        get: function () { return secretState; },
        set: function (key, value) { secretState = value; }
    }
});

service.save({ siteadmin: 0xFFFFFFFF }, {
    integrations: {
        ad: { health: { status: "ok", messagePl: "bez znaczenia" } },
        entra: { health: { status: "warning", messagePl: "Problemy z hostami", messageEn: "Host retrieval problems" } },
        jira: { health: { status: "invalid", messagePl: "\u0000test" } },
        defender: { health: { status: "critical", messagePl: "Awaria", messageEn: "Failure" } },
        zabbix: { health: { status: "ok" } }
    }
}).then(function () {
    var summary = service.healthSummary();
    assert.strictEqual(summary.status, "critical");
    assert.strictEqual(summary.items.length, 5);
    summary.items.forEach(function (item) {
        assert.strictEqual(item.configured, false);
        assert.strictEqual(item.status, "critical");
        assert.strictEqual(item.messageEn, "The integration is not fully configured.");
    });
    return service.save({ siteadmin: 0xFFFFFFFF }, {
        integrations: {
            ad: { domain: "example.local", login: "svc-ad", health: { status: "ok" } },
            entra: { tenantId: "tenant", clientId: "entra-client", health: { status: "warning", messagePl: "Problemy z hostami", messageEn: "Host retrieval problems" } },
            jira: {
                url: "https://example.atlassian.net",
                email: "svc@example.test",
                workspaceId: "workspace-1",
                cloudId: "cloud-1",
                verifyTls: true,
                projectKey: "LEGACY",
                aql: "objectType = Legacy",
                maxResults: 10,
                health: { status: "invalid", messagePl: "\u0000test" }
            },
            defender: { tenantId: "tenant", clientId: "defender-client", health: { status: "critical", messagePl: "Awaria", messageEn: "Failure" } },
            zabbix: { url: "https://zabbix.example.test", username: "svc-zabbix", health: { status: "ok" } }
        },
        secrets: {
            adPassword: "test-ad-password",
            entraClientSecret: "test-entra-secret",
            jiraToken: "test-jira-token",
            defenderClientSecret: "test-defender-secret",
            zabbixPassword: "test-zabbix-password"
        }
    });
}).then(function () {
    var summary = service.healthSummary();
    assert.strictEqual(summary.status, "critical");
    summary.items.forEach(function (item) { assert.strictEqual(item.configured, true); });
    assert.strictEqual(summary.items.find(function (item) { return item.key === "entra"; }).messagePl, "Problemy z hostami");
    assert.strictEqual(summary.items.find(function (item) { return item.key === "jira"; }).status, "ok");
    assert.strictEqual(summary.items.find(function (item) { return item.key === "jira"; }).messagePl, "test");
    assert.strictEqual(service.configured().jira, true,
        "Jira readiness must require only URL, account email and the write-only token.");
    var jira = service.readSettings().jira;
    assert.strictEqual(jira.projectKey, undefined, "Legacy project scope must not remain canonical after an integration save.");
    assert.strictEqual(jira.aql, undefined, "Legacy global AQL must not remain canonical after an integration save.");
    assert.strictEqual(jira.maxResults, undefined, "Legacy global result caps must not remain canonical after an integration save.");
    assert.strictEqual(jira.workspaceId, "workspace-1");
    assert.strictEqual(jira.cloudId, "cloud-1");
    console.log("Integration health and Jira connection-only readiness checks passed.");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

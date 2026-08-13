"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var saveCalls = 0;
var savedPayload = null;
var plugin = {
    shortName: "SIRKPortal",
    runtime: {
        integrations: {
            save: function (user, payload) {
                saveCalls += 1;
                savedPayload = payload;
                return Promise.resolve({
                    values: { jira: { url: payload.integrations.jira.url, email: payload.integrations.jira.email } },
                    configured: { jiraToken: true, jira: true }
                });
            }
        }
    }
};
var handler = require(path.join(root, "admin.js")).admin(plugin);
var admin = { _id: "user/domain/admin", siteadmin: 0xFFFFFFFF };
var user = { _id: "user/domain/user", siteadmin: 0 };

function response(done) {
    return {
        headers: {},
        setHeader: function (name, value) { this.headers[name] = value; },
        end: function (body) { done(this.statusCode, this.headers, body); }
    };
}

new Promise(function (resolve, reject) {
    handler.post({ query: {}, body: {
        action: "save-integrations",
        integrations: JSON.stringify({ jira: { url: "https://example.atlassian.net", email: "admin@example.test" } }),
        secrets: JSON.stringify({ jiraToken: "server-only-token" })
    } }, response(function (status, headers, body) {
        try {
            var result = JSON.parse(body);
            assert.strictEqual(status, 403, "Non-admin integration writes must be rejected.");
            assert.strictEqual(result.ok, false);
            assert.strictEqual(saveCalls, 0, "Rejected integration writes must not reach the canonical service.");
            resolve();
        } catch (error) { reject(error); }
    }), user);
}).then(function () {
    return new Promise(function (resolve, reject) {
        handler.post({ query: {}, body: {
            action: "save-integrations",
            integrations: JSON.stringify({ jira: { url: "https://example.atlassian.net", email: "admin@example.test" } }),
            secrets: JSON.stringify({ jiraToken: "server-only-token" })
        } }, response(function (status, headers, body) {
            try {
                var result = JSON.parse(body);
                assert.strictEqual(status, 200);
                assert.strictEqual(result.ok, true);
                assert.strictEqual(saveCalls, 1, "Admin writes must use the existing integration service exactly once.");
                assert.strictEqual(savedPayload.secrets.jiraToken, "server-only-token");
                assert.strictEqual(body.indexOf("server-only-token"), -1, "Jira token must never be echoed to the browser response.");
                assert.strictEqual(result.integrations.configured.jiraToken, true, "Browser may receive only the configured-state flag.");
                resolve();
            } catch (error) { reject(error); }
        }), admin);
    });
}).then(function () {
    return new Promise(function (resolve, reject) {
        handler.req({ query: { asset: "integrations-admin.js" } }, response(function (status, headers, body) {
            try {
                assert.strictEqual(status, 200);
                assert.ok(/text\/javascript/.test(headers["Content-Type"] || ""));
                assert.ok(String(body).indexOf("Save integrations") >= 0,
                    "The shared Jira/AD/Entra integration editor must expose one canonical save action.");
                assert.ok(String(body).indexOf('disclosure(card, "Jira")') >= 0 &&
                    String(body).indexOf('disclosure(card, "Active Directory")') >= 0 &&
                    String(body).indexOf('disclosure(card, "SMS / Voice SMS (SMSAPI.pl)")') >= 0 &&
                    String(body).indexOf('disclosure(card, "SMTP Relay")') >= 0 &&
                    String(body).indexOf('disclosure(card, "AAD / Entra ID")') >= 0,
                    "Jira, AD, SMS, SMTP and Entra must share the collapsed integration surface.");
                assert.ok(String(body).indexOf('input.type = options.type || "text"') >= 0);
                assert.ok(String(body).indexOf('type: "password"') >= 0, "Secret editors must remain password inputs.");
                assert.ok(String(body).indexOf("if (jiraToken.value) secrets.jiraToken = jiraToken.value") >= 0,
                    "Blank token must preserve the existing server-side secret.");
                assert.ok(String(body).indexOf("if (smsToken.value) secrets.smsApiToken = smsToken.value") >= 0 &&
                    String(body).indexOf("smsExternalToken.minLength = 32") >= 0,
                    "SMSAPI secrets must remain write-only and external tokens must enforce their minimum strength.");
                resolve();
            } catch (error) { reject(error); }
        }), admin);
    });
}).then(function () {
    var view = fs.readFileSync(path.join(root, "views/SIRK-Portal.handlebars"), "utf8");
    var adminSource = fs.readFileSync(path.join(root, "admin.js"), "utf8");
    var adminEntrypoint = fs.readFileSync(path.join(root, "SIRKPortalAdmin.js"), "utf8");
    assert.ok(view.indexOf('data-tab="integrations"') >= 0, "Admin must expose the Integrations tab.");
    assert.ok(view.indexOf("asset=integrations-admin.js") >= 0, "Integration UI asset must be loaded by the admin view.");
    assert.ok(adminSource.indexOf('"integrations-admin.js": ["web/admin/integrations.js"') >= 0,
        "Canonical admin owner must serve the integration editor asset.");
    assert.ok(adminSource.indexOf('action === "save-integrations"') >= 0 && adminSource.indexOf("integrations.save(user, integrationPayload)") >= 0,
        "Canonical admin owner must route secure writes to the existing integration service.");
    assert.strictEqual(adminEntrypoint.replace(/\r\n/g, "\n").trim(), '"use strict";\n\nmodule.exports = require("./admin.js");',
        "SIRKPortalAdmin must retain canonical delegation without a parallel wrapper owner.");
    console.log("Secure SiteAdmin-only shared integration configuration and no-secret browser contract: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

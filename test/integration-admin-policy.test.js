"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
var policy = require(path.join(root, "server/core/integration-admin-policy.js"));
var saveCalls = 0;
var savedPayload = null;
var plugin = {
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
var fallback = {
    req: function () { throw new Error("Unexpected fallback GET."); },
    post: function () { throw new Error("Unexpected fallback POST."); }
};
var handler = policy.wrap(fallback, plugin);
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
                assert.ok(String(body).indexOf("Save Jira integration") >= 0);
                assert.ok(String(body).indexOf('input.type = options.type || "text"') >= 0);
                assert.ok(String(body).indexOf('type: "password"') >= 0, "Token editor must be a password input.");
                assert.ok(String(body).indexOf("if (token.value) secrets.jiraToken = token.value") >= 0,
                    "Blank token must preserve the existing server-side secret.");
                resolve();
            } catch (error) { reject(error); }
        }), admin);
    });
}).then(function () {
    var view = fs.readFileSync(path.join(root, "views/SIRK-Portal.handlebars"), "utf8");
    var adminEntrypoint = fs.readFileSync(path.join(root, "SIRKPortalAdmin.js"), "utf8");
    assert.ok(view.indexOf('data-tab="integrations"') >= 0, "Admin must expose the Integrations tab.");
    assert.ok(view.indexOf("asset=integrations-admin.js") >= 0, "Integration UI asset must be loaded by the admin view.");
    assert.ok(adminEntrypoint.indexOf("integration-admin-policy.js") >= 0, "Admin entrypoint must install the secure integration policy.");
    console.log("Secure SiteAdmin-only Jira integration configuration and no-secret browser contract: OK");
}).catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

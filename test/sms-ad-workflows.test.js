"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var smsFactory = require("../server/core/sms-service.js");
var externalApi = require("../server/core/sms-external-api.js");
var integrationFactory = require("../server/core/integration-service.js");
var libraryFactory = require("../server/core/script-confirmation-library.js");

var root = path.resolve(__dirname, "..");
var requests = [];
var integration = {
    url: "https://api.smsapi.pl",
    token: "server-only-smsapi-token",
    externalToken: "external-token-with-at-least-32-characters",
    sender: "SIRK",
    vmsLector: "ewa",
    verifyTls: true
};
var service = smsFactory.createSmsService({
    integrations: { get: function () { return Object.assign({}, integration); } },
    requestJson: function (options) {
        requests.push(options);
        return Promise.resolve({ list: [{ id: "message-1", number: "48500100200", status: "QUEUE" }] });
    }
});

function response(resolve, reject) {
    return {
        statusCode: 0,
        status: function (value) { this.statusCode = value; return this; },
        json: function (value) { try { resolve({ status: this.statusCode, body: value }); } catch (error) { reject(error); } }
    };
}

(async function () {
    var integrationState = { integrations: {} }, secretState = {};
    var integrations = integrationFactory.createIntegrationService({
        parent: {},
        settings: {
            read: function () { return integrationState; },
            update: function (callback) { integrationState = callback(integrationState); return Promise.resolve(integrationState); }
        },
        secrets: {
            get: function () { return secretState; },
            set: function (key, value) { secretState = value; }
        }
    });
    await assert.rejects(function () { return integrations.save({ siteadmin: 0xFFFFFFFF }, {
        integrations: { sms: { url: "https://api.smsapi.pl" } }, secrets: { smsExternalToken: "too-short" }
    }); }, /at least 32 characters/);
    var publicSettings = await integrations.save({ siteadmin: 0xFFFFFFFF }, {
        integrations: {
            ad: { domain: "example.test", login: "svc-ad", upnSuffix: "example.test", userLocations: [
                { name: "New", dn: "OU=New,DC=example,DC=test" }, { name: "Rejected", dn: "CN=Users,DC=example,DC=test" }
            ] },
            sms: { url: "https://api.smsapi.pl", sender: "SIRK", vmsLector: "maja", verifyTls: true }
        },
        secrets: { smsApiToken: "private-sms-token", smsExternalToken: integration.externalToken }
    });
    assert.strictEqual(publicSettings.values.ad.userLocations.length, 1);
    assert.strictEqual(JSON.stringify(publicSettings).indexOf("private-sms-token"), -1);
    assert.strictEqual(publicSettings.configured.smsExternalToken, true);

    var sms = await service.send("sms", ["+48 500 100 200", "48500100300"], "Test");
    assert.strictEqual(requests[0].url, "https://api.smsapi.pl/sms.do");
    assert.strictEqual(requests[0].headers.Authorization, "Bearer " + "server-only-smsapi-token");
    assert.ok(/to=48500100200%2C48500100300/.test(requests[0].body), "Multi SMS must use one comma-separated SMSAPI request.");
    assert.strictEqual(JSON.stringify(sms).indexOf("48500100200"), -1, "Workflow output must mask recipient numbers.");
    assert.strictEqual(JSON.stringify(sms).indexOf("server-only-smsapi-token"), -1, "Workflow output must never expose the SMSAPI token.");

    await service.send("vms", "48500100200", "Voice test", { lector: "maja" });
    assert.strictEqual(requests[1].url, "https://api.smsapi.pl/vms.do");
    assert.ok(/tts=Voice\+test/.test(requests[1].body) && /tts_lector=maja/.test(requests[1].body));
    await assert.rejects(function () { return service.send("vms", "48500100200", "Voice", { lector: "invalid" }); }, /Unsupported Voice SMS lector/);

    var routes = {};
    var web = {
        users: {},
        app: { post: function (route, parser, handler) { routes[route] = handler; } },
        bodyParser: { json: function () { return function (req, res, next) { next(); }; } }
    };
    var context = {
        parent: { parent: { webserver: web } },
        source: {},
        integrations: { get: function () { return Object.assign({}, integration); } }
    };
    assert.strictEqual(externalApi.register({ context: context, sms: service }), true);
    assert.strictEqual(typeof routes["/sirk-sms/v1/send"], "function");
    var unauthorized = await new Promise(function (resolve, reject) {
        routes["/sirk-sms/v1/send"]({ headers: {}, body: {} }, response(resolve, reject));
    });
    assert.strictEqual(unauthorized.status, 401);
    var accepted = await new Promise(function (resolve, reject) {
        routes["/sirk-sms/v1/send"]({
            ip: "127.0.0.1",
            headers: { authorization: "Bearer " + integration.externalToken },
            body: { type: "sms", to: ["48500100200"], message: "External test" }
        }, response(resolve, reject));
    });
    assert.strictEqual(accepted.status, 202);
    assert.strictEqual(accepted.body.result.count, 1);

    var scriptsRoot = path.join(root, "seed", "MyScripts");
    var library = libraryFactory.createScriptLibrary({ fs: fs, path: path, root: scriptsRoot, readOnly: true, allowWrite: false });
    var reset = library.getScript("Active Directory/Reset user password and SMS.ps1", true);
    var create = library.getScript("Active Directory/Create user and SMS.ps1", true);
    assert.strictEqual(reset.variables.find(function (item) { return item.name === "AdUser"; }).optionSource, "ad-users");
    assert.strictEqual(create.variables.find(function (item) { return item.name === "UserLocation"; }).optionSource, "ad-user-locations");
    assert.strictEqual(reset.variables.find(function (item) { return item.name === "ChangeAtLogon"; }).defaultValue, "true");
    assert.strictEqual(create.variables.find(function (item) { return item.name === "ChangeAtLogon"; }).defaultValue, "true");

    var createSource = fs.readFileSync(path.join(scriptsRoot, "Active Directory", "Create user and SMS.ps1"), "utf8");
    var resetSource = fs.readFileSync(path.join(scriptsRoot, "Active Directory", "Reset user password and SMS.ps1"), "utf8");
    var sharedSource = fs.readFileSync(path.join(scriptsRoot, "_shared", "Sirk-AdSms.ps1"), "utf8");
    assert.ok(/for\(\$length=1;\$length -le \$maximumPrefixLength/.test(createSource), "Login allocation must start with one first-name letter and extend the prefix on collisions.");
    assert.ok(/for\(\$number=2;\$number -le 9999/.test(createSource), "Login allocation must have a numeric collision fallback.");
    assert.ok(/MYSCRIPTS_AD_USER_LOCATIONS_JSON/.test(createSource), "AD account creation must enforce the configured OU allowlist.");
    assert.ok(/Set-ADAccountPassword/.test(resetSource) && /Unlock-ADAccount/.test(resetSource) && /ChangePasswordAtLogon/.test(resetSource));
    assert.ok(/RandomNumberGenerator/.test(sharedSource) && !/Get-Random/.test(sharedSource), "Passwords must use a cryptographic random-number generator.");
    console.log("SMSAPI, external trigger and AD account workflows: OK");
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

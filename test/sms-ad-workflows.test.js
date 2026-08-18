"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var smsFactory = require("../server/core/sms-service.js");
var adDirectoryFactory = require("../server/core/ad-directory-service.js");
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

function hasUtf8Bom(filePath) {
    var data = fs.readFileSync(filePath);
    return data.length >= 3 && data[0] === 0xEF && data[1] === 0xBB && data[2] === 0xBF;
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

    var jiraCalls = [];
    var adCommand = "";
    var directory = adDirectoryFactory.createAdDirectoryService({
        context: {
            nativePath: path,
            integrations: {
                get: function (key) {
                    return key === "ad" ? { domain: "example.test", login: "svc-ad", password: "secret" } : {};
                },
                readSettings: function () { return { ad: { userLocations: [] } }; }
            }
        },
        jiraAssets: {
            listUsers: function (force, includeInactive) {
                jiraCalls.push([force, includeInactive]);
                return Promise.resolve({ items: [
                    { value: "jira-a", label: "Alicja Jira (Alice@Example.Test)", displayName: "Alicja Jira", emailAddress: "Alice@Example.Test", active: true },
                    { value: "jira-b", label: "Robert Jira (bob@example.test)", displayName: "Robert Jira", emailAddress: "bob@example.test", active: true },
                    { value: "jira-duplicate", label: "Alicja duplikat", displayName: "Alicja duplikat", emailAddress: "alice@example.test", active: true },
                    { value: "jira-display-only", label: "Display Match Only", displayName: "Display Match Only", emailAddress: "other@example.test", active: true },
                    { value: "jira-no-mail", label: "Bez UPN", displayName: "Bez UPN", emailAddress: "", active: true }
                ] });
            }
        },
        execFile: function (file, args, options, callback) {
            adCommand = Buffer.from(args[3], "base64").toString("utf16le");
            callback(null, JSON.stringify([
                { value: "alice", label: "Alice AD (alice)", displayName: "Alice AD", email: "alice@example.test", upn: "alice@example.test", active: true },
                { value: "bob", label: "Bob AD (bob)", displayName: "Bob AD", email: "bob@example.test", upn: "BOB@EXAMPLE.TEST", active: true },
                { value: "display", label: "Display Match Only (display)", displayName: "Display Match Only", email: "display@example.test", upn: "display@example.test", active: true }
            ]), "");
        }
    });
    var matchedUsers = await directory.listUsers();
    assert.deepStrictEqual(jiraCalls, [[false, false]], "AD reset options must reuse the standard active Jira users cache path once.");
    assert.ok(/UserPrincipalName/.test(adCommand), "AD matching must query UserPrincipalName.");
    assert.deepStrictEqual(matchedUsers.map(function (item) { return item.value; }), ["alice", "bob"], "Only case-insensitive Jira e-mail/AD UPN matches may be selectable.");
    assert.strictEqual(matchedUsers[0].label, "Alicja Jira (Alice@Example.Test)", "The visible option must retain the Jira cache label while the value stays AD-safe.");
    assert.strictEqual(matchedUsers.some(function (item) { return item.value === "display"; }), false, "Display-name-only matches must not be accepted.");

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
    var adUser = reset.variables.find(function (item) { return item.name === "AdUser"; });
    var adSearch = reset.variables.find(function (item) { return item.name === "AdUserSearch"; });
    assert.strictEqual(adUser.optionSource, "ad-users");
    assert.strictEqual(adUser.searchVariable, "AdUserSearch");
    assert.strictEqual(adUser.listMode, true, "Searchable AD users must reuse the shared local list filter contract.");
    assert.strictEqual(adUser.labels.pl, "Użytkownik");
    assert.strictEqual(adSearch.labels.pl, "Szukaj");
    assert.strictEqual(reset.locales.pl.label, "Reset hasła użytkownika i SMS");
    assert.strictEqual(reset.variables.find(function (item) { return item.name === "ChangeAtLogon"; }).labels.pl, "Wymuś zmianę hasła przy następnym logowaniu");
    assert.ok(reset.extraHeaders.some(function (header) { return /^SirkSystemCredential:\s*Jira$/i.test(header); }), "Reset workflow must explicitly declare the Jira credential used by its cached user source.");
    assert.strictEqual(create.variables.find(function (item) { return item.name === "UserLocation"; }).optionSource, "ad-user-locations");
    assert.strictEqual(reset.variables.find(function (item) { return item.name === "ChangeAtLogon"; }).defaultValue, "true");
    assert.strictEqual(create.variables.find(function (item) { return item.name === "ChangeAtLogon"; }).defaultValue, "true");

    var createPath = path.join(scriptsRoot, "Active Directory", "Create user and SMS.ps1");
    var resetPath = path.join(scriptsRoot, "Active Directory", "Reset user password and SMS.ps1");
    var createSource = fs.readFileSync(createPath, "utf8");
    var resetSource = fs.readFileSync(resetPath, "utf8");
    var sharedSource = fs.readFileSync(path.join(scriptsRoot, "_shared", "Sirk-AdSms.ps1"), "utf8");
    assert.strictEqual(hasUtf8Bom(createPath), true, "Create-account workflow must carry a UTF-8 BOM for Windows PowerShell 5.1 Polish text.");
    assert.strictEqual(hasUtf8Bom(resetPath), true, "Reset workflow must carry a UTF-8 BOM for Windows PowerShell 5.1 Polish text.");
    assert.ok(/for\(\$length=1;\$length -le \$maximumPrefixLength/.test(createSource), "Login allocation must start with one first-name letter and extend the prefix on collisions.");
    assert.ok(/for\(\$number=2;\$number -le 9999/.test(createSource), "Login allocation must have a numeric collision fallback.");
    assert.ok(/MYSCRIPTS_AD_USER_LOCATIONS_JSON/.test(createSource), "AD account creation must enforce the configured OU allowlist.");
    assert.ok(/Set-ADAccountPassword/.test(resetSource) && /Unlock-ADAccount/.test(resetSource) && /ChangePasswordAtLogon/.test(resetSource));
    assert.ok(createSource.indexOf('Konto w domenie $($env:MYSCRIPTS_AD_DOMAIN) zostało utworzone. Tymczasowe hasło:`r`n`r`n$password') >= 0,
        "Create-account SMS must contain the configured AD domain, a blank line and the temporary password.");
    assert.ok(resetSource.indexOf('Hasło w domenie $($env:MYSCRIPTS_AD_DOMAIN) zostało zmienione. Tymczasowe hasło:`r`n`r`n$password') >= 0,
        "Reset SMS must contain the configured AD domain, a blank line and the temporary password.");
    assert.ok(createSource.split(/\r?\n/).filter(function (line) { return /\$smsText\s*=/.test(line); })[0].indexOf("$upn") < 0,
        "Create-account SMS text must not expose the generated login/UPN.");
    assert.ok(resetSource.split(/\r?\n/).filter(function (line) { return /\$smsText\s*=/.test(line); })[0].indexOf("$AdUser") < 0,
        "Reset SMS text must not expose the account login.");
    assert.strictEqual(createSource.indexOf("UÅ"), -1);
    assert.strictEqual(resetSource.indexOf("UÅ"), -1);
    assert.ok(/RandomNumberGenerator/.test(sharedSource) && !/Get-Random/.test(sharedSource), "Passwords must use a cryptographic random-number generator.");

    var automationSource = fs.readFileSync(path.join(root, "server", "modules", "automation", "index.js"), "utf8");
    assert.ok(/createAdDirectoryService\(\{ context: context, jiraAssets: jiraAssets \}\)/.test(automationSource), "Automation must inject the canonical Jira cache owner into the AD directory owner.");
    var adOptionsBlock = automationSource.slice(automationSource.indexOf('variable.optionSource === "ad-users"'), automationSource.indexOf('variable.optionSource === "ad-user-locations"'));
    assert.ok(/hasSystemCredential\(optionScript\.path, "ad"\)/.test(adOptionsBlock) && /hasSystemCredential\(optionScript\.path, "jira"\)/.test(adOptionsBlock),
        "Jira-backed AD user options must require both explicitly assigned AD and Jira system credentials.");

    var parameterDialogSource = fs.readFileSync(path.join(root, "public", "shared", "ui", "parameter-dialog.js"), "utf8");
    var filterBlock = parameterDialogSource.slice(parameterDialogSource.indexOf("function onFilterChanged"), parameterDialogSource.indexOf("function onChecklistChanged"));
    assert.ok(/applyUserFilter/.test(filterBlock) && filterBlock.indexOf("provider(") < 0 && filterBlock.indexOf("loadDynamic(") < 0,
        "Typing in the shared Search field must filter the already loaded list locally without backend requests.");

    console.log("SMSAPI, Jira-cache/AD UPN matching, searchable localized account workflows: OK");
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

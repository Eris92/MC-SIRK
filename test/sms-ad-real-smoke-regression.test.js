"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var adDirectoryFactory = require("../server/core/ad-directory-service.js");

var root = path.resolve(__dirname, "..");
var queryScriptPath = path.join(root, "server", "core", "ad-directory-query.ps1");

function context() {
    return {
        nativePath: path,
        integrations: {
            get: function (key) {
                return key === "ad" ? { domain: "example.test", login: "svc-ad", password: "secret" } : {};
            },
            readSettings: function () { return { ad: { userLocations: [] } }; }
        }
    };
}

function jiraUsers(count) {
    var result = [];
    for (var index = 0; index < count; index++) {
        result.push({
            value: "jira-" + index,
            label: "User " + index + " (user" + index + "@example.test)",
            displayName: "User " + index,
            emailAddress: "user" + index + "@example.test",
            active: true
        });
    }
    return result;
}

(async function () {
    var users = jiraUsers(700);
    var execCalls = 0;
    var execArgs = null;
    var execOptions = null;
    var stdinPayload = "";
    var directory = adDirectoryFactory.createAdDirectoryService({
        context: context(),
        jiraAssets: {
            listUsers: function (force, includeInactive) {
                assert.strictEqual(force, false);
                assert.strictEqual(includeInactive, false);
                return Promise.resolve({ items: users });
            }
        },
        queryScriptPath: queryScriptPath,
        execFile: function (file, args, options, callback) {
            execCalls++;
            execArgs = args;
            execOptions = options;
            return {
                stdin: {
                    on: function () {},
                    end: function (payload) {
                        stdinPayload = String(payload || "");
                        callback(null, JSON.stringify({ ok: true, rows: [
                            { value: "user42", label: "AD User 42 (user42)", displayName: "AD User 42", email: "user42@example.test", upn: "USER42@EXAMPLE.TEST", active: true }
                        ] }), "");
                    }
                }
            };
        }
    });

    var result = await directory.listUsers();
    assert.strictEqual(execCalls, 1, "Opening the reset selector must use one bounded PowerShell process, not one process per Jira user.");
    assert.ok(execArgs.indexOf("-File") >= 0, "AD selector must execute the maintained machine-readable bridge file.");
    assert.strictEqual(execArgs[execArgs.indexOf("-File") + 1], queryScriptPath);
    assert.strictEqual(execArgs.indexOf("-EncodedCommand"), -1, "AD selector must not rebuild an opaque inline ActiveDirectory-module command.");
    assert.strictEqual(execOptions.encoding, "utf8");
    assert.strictEqual(execOptions.timeout, 15000, "Jira-backed selector work must remain bounded instead of waiting on a long AD module import.");
    assert.strictEqual(execOptions.env.SIRK_AD_MATCH_MODE, "upn", "Jira-backed reset loading must select the bounded UPN match path.");
    assert.strictEqual(execOptions.env.SIRK_AD_UPNS_JSON, "", "Large Jira user sets must use stdin instead of risking the Windows environment-size limit.");
    var postedUpns = JSON.parse(stdinPayload);
    assert.strictEqual(postedUpns.length, users.length);
    assert.strictEqual(postedUpns[42], "user42@example.test");
    assert.deepStrictEqual(result.map(function (item) { return item.value; }), ["user42"]);
    assert.strictEqual(result[0].label, users[42].label);

    var bridgeSource = fs.readFileSync(queryScriptPath, "utf8");
    assert.strictEqual(bridgeSource.indexOf("Import-Module ActiveDirectory"), -1, "The selector hot path must not import the AD PowerShell provider/default drive.");
    assert.strictEqual(bridgeSource.indexOf("Get-ADUser"), -1, "The selector hot path must not depend on the ActiveDirectory cmdlet module.");
    assert.ok(/System\.DirectoryServices\.DirectoryEntry/.test(bridgeSource));
    assert.ok(/System\.DirectoryServices\.DirectorySearcher/.test(bridgeSource));
    assert.ok(/\$ProgressPreference\s*=\s*'SilentlyContinue'/.test(bridgeSource), "Machine-readable selector bridge must suppress PowerShell progress output.");
    assert.ok(/OpenStandardOutput/.test(bridgeSource) && /Encoding\]::UTF8\.GetBytes/.test(bridgeSource), "Bridge JSON must be written as explicit UTF-8 bytes.");
    assert.ok(/\$chunkSize\s*=\s*1000/.test(bridgeSource), "Requested UPN matching must remain bounded in LDAP chunks.");

    var noAdCalls = 0;
    var emptyDirectory = adDirectoryFactory.createAdDirectoryService({
        context: context(),
        jiraAssets: {
            listUsers: function () {
                return Promise.resolve({ items: [{ value: "jira-no-mail", label: "No mail", emailAddress: "", active: true }] });
            }
        },
        queryScriptPath: queryScriptPath,
        execFile: function () { noAdCalls++; throw new Error("AD must not run without a Jira UPN to match."); }
    });
    assert.deepStrictEqual(await emptyDirectory.listUsers(), []);
    assert.strictEqual(noAdCalls, 0, "No Jira e-mail identities means no AD directory query.");

    var timeoutDirectory = adDirectoryFactory.createAdDirectoryService({
        context: context(),
        jiraAssets: { listUsers: function () { return Promise.resolve({ items: users }); } },
        queryScriptPath: queryScriptPath,
        execFile: function (file, args, options, callback) {
            return {
                stdin: {
                    on: function () {},
                    end: function () {
                        var error = new Error("Command failed after timeout");
                        error.killed = true;
                        error.signal = "SIGTERM";
                        callback(error, "", "#< CLIXML <AV>\ufffdadowanie modu\ufffdu us\ufffdugi Active Directory</AV>");
                    }
                }
            };
        }
    });
    await assert.rejects(timeoutDirectory.listUsers(), function (error) {
        assert.strictEqual(error.message, "Active Directory user lookup timed out.");
        assert.strictEqual(error.message.indexOf("CLIXML"), -1, "Raw PowerShell serialization must never leak into the native dialog.");
        assert.strictEqual(error.message.indexOf("\ufffd"), -1, "Mojibake from a redirected PowerShell stream must never reach the user.");
        return true;
    });

    var localizedFailure = adDirectoryFactory.createAdDirectoryService({
        context: context(),
        jiraAssets: { listUsers: function () { return Promise.resolve({ items: jiraUsers(1) }); } },
        queryScriptPath: queryScriptPath,
        execFile: function (file, args, options, callback) {
            var error = new Error("exit 1");
            error.code = 1;
            callback(error, JSON.stringify({ ok: false, error: "Błąd połączenia z domeną." }), "#< CLIXML ignored");
            return { stdin: { on: function () {}, end: function () {} } };
        }
    });
    await assert.rejects(localizedFailure.listUsers(), function (error) {
        assert.strictEqual(error.message, "Błąd połączenia z domeną.", "UTF-8 machine-readable bridge errors must preserve Polish characters.");
        return true;
    });

    var smsSource = fs.readFileSync(path.join(root, "seed", "MyScripts", "_shared", "Sirk-AdSms.ps1"), "utf8");
    assert.ok(/function ConvertTo-SirkSmsFormBody/.test(smsSource));
    assert.ok(/\[Uri\]::EscapeDataString\(\$Text\)/.test(smsSource), "AD SMS text must be percent-encoded from Unicode before Windows PowerShell sends the form.");
    assert.ok(/\$encoding\s*=\s*'utf-8'/.test(smsSource) && /'encoding='\s*\+\s*\$encoding/.test(smsSource));
    assert.ok(/-Body \$body/.test(smsSource), "The outbound AD SMS request must use the already percent-encoded ASCII-safe form body.");

    console.log("Real-smoke regression: AD selector avoids AD module CLIXML/timeout path and SMS form stays UTF-8 safe: OK");
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

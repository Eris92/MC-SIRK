"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var adDirectoryFactory = require("../server/core/ad-directory-service.js");

var root = path.resolve(__dirname, "..");
var queryScriptPath = path.join(root, "server", "core", "ad-directory-query.ps1");
var resetScriptPath = path.join(root, "seed", "MyScripts", "Active Directory", "Reset user password and SMS.ps1");

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
        execFile: function () {
            execCalls++;
            throw new Error("Opening the reset selector must not start PowerShell/AD work.");
        }
    });

    var result = await directory.listUsers();
    assert.strictEqual(execCalls, 0, "Opening the reset selector must return the canonical Jira cache without waiting on Active Directory.");
    assert.strictEqual(result.length, users.length);
    assert.strictEqual(result[0].value, "user0@example.test");
    assert.strictEqual(result[42].value, "user42@example.test");
    assert.strictEqual(result[42].label, users[42].label);

    var noAdCalls = 0;
    var emptyDirectory = adDirectoryFactory.createAdDirectoryService({
        context: context(),
        jiraAssets: {
            listUsers: function () {
                return Promise.resolve({ items: [{ value: "jira-no-mail", label: "No mail", emailAddress: "", active: true }] });
            }
        },
        queryScriptPath: queryScriptPath,
        execFile: function () { noAdCalls++; throw new Error("AD must not run while opening the cache-first selector."); }
    });
    await assert.rejects(emptyDirectory.listUsers(), function (error) {
        assert.strictEqual(error.message, "Jira user cache contains no selectable users with a usable UPN/e-mail.");
        return true;
    });
    assert.strictEqual(noAdCalls, 0, "A Jira cache without UPN/e-mail identities must fail explicitly without querying AD.");

    var bridgeSource = fs.readFileSync(queryScriptPath, "utf8");
    assert.strictEqual(bridgeSource.indexOf("Import-Module ActiveDirectory"), -1, "The maintained fallback bridge must not import the AD PowerShell provider/default drive.");
    assert.strictEqual(bridgeSource.indexOf("Get-ADUser"), -1, "The maintained fallback bridge must not depend on the ActiveDirectory cmdlet module.");
    assert.ok(/System\.DirectoryServices\.DirectoryEntry/.test(bridgeSource));
    assert.ok(/System\.DirectoryServices\.DirectorySearcher/.test(bridgeSource));
    assert.ok(/\$ProgressPreference\s*=\s*'SilentlyContinue'/.test(bridgeSource), "Machine-readable AD bridge must suppress PowerShell progress output.");
    assert.ok(/OpenStandardOutput/.test(bridgeSource) && /Encoding\]::UTF8\.GetBytes/.test(bridgeSource), "Bridge JSON must be written as explicit UTF-8 bytes.");
    assert.ok(/\$chunkSize\s*=\s*1000/.test(bridgeSource), "Requested UPN matching support must remain bounded in LDAP chunks.");

    var timeoutDirectory = adDirectoryFactory.createAdDirectoryService({
        context: context(),
        queryScriptPath: queryScriptPath,
        execFile: function (file, args, options, callback) {
            var error = new Error("Command failed after timeout");
            error.killed = true;
            error.signal = "SIGTERM";
            callback(error, "", "#< CLIXML <AV>\ufffdadowanie modu\ufffdu us\ufffdugi Active Directory</AV>");
            return { stdin: { on: function () {}, end: function () {} } };
        }
    });
    await assert.rejects(timeoutDirectory.listUsers(), function (error) {
        assert.strictEqual(error.message, "Active Directory user lookup timed out.");
        assert.strictEqual(error.message.indexOf("CLIXML"), -1, "Raw PowerShell serialization must never leak from the fallback bridge.");
        assert.strictEqual(error.message.indexOf("\ufffd"), -1, "Mojibake from a redirected PowerShell stream must never reach the user.");
        return true;
    });

    var localizedFailure = adDirectoryFactory.createAdDirectoryService({
        context: context(),
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

    var resetSource = fs.readFileSync(resetScriptPath, "utf8");
    assert.ok(/\$selectedUpn\s*=\s*\(\[string\]\$AdUser\)\.Trim\(\)/.test(resetSource), "Reset execution must treat the selected value as a Jira UPN identity.");
    assert.ok(/Get-ADUser\s+-LDAPFilter\s+"\(userPrincipalName=\$selectedUpn\)"/.test(resetSource), "Only the selected UPN should be resolved against AD at execution time.");
    assert.ok(/Select-Object\s+-First\s+2/.test(resetSource) && /\$matches\.Count\s+-ne\s+1/.test(resetSource), "Selected UPN resolution must be bounded and fail closed unless exactly one AD account matches.");
    assert.strictEqual(/Get-ADUser\s+-Identity\s+\$AdUser/.test(resetSource), false);

    var smsSource = fs.readFileSync(path.join(root, "seed", "MyScripts", "_shared", "Sirk-AdSms.ps1"), "utf8");
    assert.ok(/function ConvertTo-SirkSmsFormBody/.test(smsSource));
    assert.ok(/\[Uri\]::EscapeDataString\(\$Text\)/.test(smsSource), "AD SMS text must be percent-encoded from Unicode before Windows PowerShell sends the form.");
    assert.ok(/\$encoding\s*=\s*'utf-8'/.test(smsSource) && /'encoding='\s*\+\s*\$encoding/.test(smsSource));
    assert.ok(/-Body \$body/.test(smsSource), "The outbound AD SMS request must use the already percent-encoded ASCII-safe form body.");

    console.log("Real-smoke regression: reset users load cache-first and selected UPN is matched to AD only at execution: OK");
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

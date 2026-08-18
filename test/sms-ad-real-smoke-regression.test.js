"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var adDirectoryFactory = require("../server/core/ad-directory-service.js");

var root = path.resolve(__dirname, "..");

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

(async function () {
    var jiraUsers = [];
    for (var index = 0; index < 700; index++) {
        jiraUsers.push({
            value: "jira-" + index,
            label: "User " + index + " (user" + index + "@example.test)",
            displayName: "User " + index,
            emailAddress: "user" + index + "@example.test",
            active: true
        });
    }

    var execCalls = 0;
    var encodedCommand = "";
    var execOptions = null;
    var stdinPayload = "";
    var directory = adDirectoryFactory.createAdDirectoryService({
        context: context(),
        jiraAssets: {
            listUsers: function (force, includeInactive) {
                assert.strictEqual(force, false);
                assert.strictEqual(includeInactive, false);
                return Promise.resolve({ items: jiraUsers });
            }
        },
        execFile: function (file, args, options, callback) {
            execCalls++;
            encodedCommand = Buffer.from(args[3], "base64").toString("utf16le");
            execOptions = options;
            return {
                stdin: {
                    on: function () {},
                    end: function (payload) {
                        stdinPayload = String(payload || "");
                        callback(null, JSON.stringify([
                            { value: "user42", label: "AD User 42 (user42)", displayName: "AD User 42", email: "user42@example.test", upn: "USER42@EXAMPLE.TEST", active: true }
                        ]), "");
                    }
                }
            };
        }
    });

    var result = await directory.listUsers();
    assert.strictEqual(execCalls, 1, "Opening the reset selector must use one PowerShell process, not one process per Jira user.");
    assert.strictEqual(execOptions.env.SIRK_AD_MATCH_MODE, "upn", "Jira-backed reset loading must select the bounded UPN match path.");
    assert.strictEqual(execOptions.env.SIRK_AD_UPNS_JSON, "", "Large Jira user sets must use stdin instead of risking the Windows environment-size limit.");
    var postedUpns = JSON.parse(stdinPayload);
    assert.strictEqual(postedUpns.length, jiraUsers.length);
    assert.strictEqual(postedUpns[42], "user42@example.test");
    assert.ok(/-LDAPFilter \$ldap/.test(encodedCommand), "AD matching must use a server-side LDAP UPN filter.");
    var filteredBlock = encodedCommand.slice(encodedCommand.indexOf("if($env:SIRK_AD_MATCH_MODE -eq 'upn')"), encodedCommand.indexOf("}else{"));
    assert.strictEqual(filteredBlock.indexOf("-Filter *"), -1, "The Jira-backed hot path must not enumerate the full Active Directory.");
    assert.ok(/\$chunkSize=500/.test(filteredBlock), "Large UPN sets must be queried in bounded LDAP chunks.");
    assert.deepStrictEqual(result.map(function (item) { return item.value; }), ["user42"]);
    assert.strictEqual(result[0].label, jiraUsers[42].label);

    var noAdCalls = 0;
    var emptyDirectory = adDirectoryFactory.createAdDirectoryService({
        context: context(),
        jiraAssets: {
            listUsers: function () {
                return Promise.resolve({ items: [{ value: "jira-no-mail", label: "No mail", emailAddress: "", active: true }] });
            }
        },
        execFile: function () { noAdCalls++; throw new Error("AD must not run without a Jira UPN to match."); }
    });
    assert.deepStrictEqual(await emptyDirectory.listUsers(), []);
    assert.strictEqual(noAdCalls, 0, "No Jira e-mail identities means no AD directory scan.");

    var smsSource = fs.readFileSync(path.join(root, "seed", "MyScripts", "_shared", "Sirk-AdSms.ps1"), "utf8");
    assert.ok(/function ConvertTo-SirkSmsFormBody/.test(smsSource));
    assert.ok(/\[Uri\]::EscapeDataString\(\$Text\)/.test(smsSource), "AD SMS text must be percent-encoded from Unicode before Windows PowerShell sends the form.");
    assert.ok(/\$encoding\s*=\s*'utf-8'/.test(smsSource) && /'encoding='\s*\+\s*\$encoding/.test(smsSource));
    assert.ok(/-Body \$body/.test(smsSource), "The outbound AD SMS request must use the already percent-encoded ASCII-safe form body.");

    console.log("Real-smoke regression: bounded Jira-UPN/AD matching and ASCII-safe UTF-8 SMS form transport: OK");
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

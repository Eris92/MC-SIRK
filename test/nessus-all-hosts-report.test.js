"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var relativeScript = "Security/Nessus - All Hosts.ps1";
var scriptSource = fs.readFileSync(path.join(root, "seed", "MyScripts", relativeScript), "utf8");
var adminSource = fs.readFileSync(path.join(root, "admin.js"), "utf8");
var resultsSource = fs.readFileSync(path.join(root, "public", "shared", "ui", "results.js"), "utf8");

// Editable bundled script: metadata, data feed and no Nessus credentials.
assert.ok(/^# SirkDataFeed: Nessus$/m.test(scriptSource), "script declares the read-only Nessus data feed");
assert.ok(scriptSource.indexOf("SIRK_NESSUS_SNAPSHOT") >= 0 && !/Invoke-RestMethod|Invoke-WebRequest|accessKey|secretKey/i.test(scriptSource),
    "script reads only the server-provided snapshot and never calls Nessus");
assert.ok(scriptSource.indexOf("_siteadmin-reports") >= 0 && scriptSource.indexOf("[guid]::NewGuid()") >= 0,
    "CSV is unique per execution and written below the Site Admin-only download folder");
assert.ok(scriptSource.indexOf("Move-Item -LiteralPath $temporaryPath") >= 0 &&
    scriptSource.indexOf('Write-Output "CSV_DOWNLOAD: $csvPath"') > scriptSource.indexOf("Move-Item -LiteralPath $temporaryPath"),
    "download marker is printed only after the complete file is published");
assert.ok(scriptSource.indexOf("Protect-CsvCell") >= 0 && /\[=\+\\-@\]/.test(scriptSource), "CSV formula cells are neutralized");

var temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-nessus-report-"));
var admin = { _id: "user/domain/admin", name: "admin", siteadmin: 0xFFFFFFFF };
var operator = { _id: "user/domain/operator", name: "operator", links: {} };
var group = "ugrp/domain/ops";
operator.links[group] = { rights: 1 };
var web = { users: {}, userGroups: {} };
web.userGroups[group] = { _id: group, name: "Ops" };
web.users[admin._id] = admin; web.users[operator._id] = operator;
var parent = { fs: fs, path: path, pluginPath: root, parent: { datapath: temporary, webserver: web } };
var runtime = require(path.join(root, "server/core/runtime.js")).createRuntime({ parent: parent, pluginRoot: root, source: {} });
runtime.settings.updateSync(function (current) {
    current.modules.myscripts.accessGroupIds = [group];
    current.modules.myscripts.folderPermissions = { Security: { enabled: true, allowAll: true, groupIds: [] } };
    return current;
});
var automation = runtime.modules.myscripts;

function call(method, asset, user, body, query) {
    return new Promise(function (resolve) {
        var res = { setHeader: function () {}, end: function (value) { resolve({ status: res.statusCode, body: JSON.parse(value) }); } };
        runtime.request(method, "myscripts", asset, { body: body || {}, query: query || {} }, res, user);
    });
}

call("GET", "script", admin, {}, { path: relativeScript }).then(function (result) {
    assert.strictEqual(result.status, 200, JSON.stringify(result.body));
    var names = (result.body.script.variables || []).map(function (variable) { return variable.name; });
    ["HostFilter", "Risk", "Plugin", "Exploit", "Category", "Authentication"].forEach(function (name) {
        assert.ok(names.indexOf(name) >= 0, "filter variable " + name + " is declared as an ordinary script variable");
    });
    var risk = result.body.script.variables.filter(function (variable) { return variable.name === "Risk"; })[0];
    assert.deepStrictEqual(risk.options.map(function (option) { return option.value; }), ["All", "Critical", "High", "Medium", "Low"]);
    return call("POST", "request", operator, { scriptPath: relativeScript, variableValues: { Risk: "All", Exploit: "All" } });
}).then(function (result) {
    assert.ok(result.status >= 400, "a non-Site Admin with folder access cannot request the all-host report");
    assert.match(result.body.error, /Site Admin/);
    // Direct provider execution (e.g. after an approval) re-checks the requester.
    var executorModule = require(path.join(root, "server/core/server-script-executor.js"));
    var captured = null;
    var executor = executorModule.createServerScriptExecutor({
        context: runtime.context,
        admin: { secretValues: function () { return {}; }, systemProfiles: function () { return []; } },
        library: { getScript: function () { return { path: relativeScript, hash: "h", shell: "cmd", extraHeaders: ["SirkDataFeed: Nessus"], variables: [] }; } },
        dataFeeds: { nessus: function () { captured = true; return { SIRK_NESSUS_SNAPSHOT: runtime.context.vulnerabilities.snapshotPath }; } }
    });
    assert.strictEqual(executor.dataFeedName({ extraHeaders: ["SirkDataFeed: Nessus"] }), "nessus");
    assert.strictEqual(executor.dataFeedName({ extraHeaders: ["SirkSystemCredential: AD"] }), "");
    return executor.execute({ scriptPath: relativeScript, variableValues: {} }, { requester: { id: admin._id } }).then(function () {}, function (error) { if (captured !== true) console.error("executor error:", error.message); }).then(function () {
        assert.strictEqual(captured, true, "the executor injects the feed environment for declared scripts");
        assert.ok(runtime.context.vulnerabilities.snapshotPath.indexOf(path.join("sirk-platform-data", "nessus", "snapshot.json")) >= 0);
        var failing = executorModule.createServerScriptExecutor({
            context: runtime.context,
            admin: { secretValues: function () { return {}; }, systemProfiles: function () { return []; } },
            library: { getScript: function () { return { path: "x.ps1", hash: "h", shell: "cmd", extraHeaders: ["SirkDataFeed: Unknown"], variables: [] }; } }
        });
        return failing.execute({ scriptPath: "x.ps1" }, { requester: { id: admin._id } }).then(function () {
            assert.fail("unknown data feeds must fail closed");
        }, function (error) { assert.match(error.message, /not available/); });
    });
}).then(function () {
    // Download: `_siteadmin-reports` CSVs are Site Admin only.
    assert.ok(adminSource.indexOf('"_siteadmin-reports"') >= 0 && /_siteadmin-reports[\s\S]{0,200}isSiteAdmin\(user\)/.test(adminSource));
    var adminPlugin = require(path.join(root, "admin.js"));
    assert.ok(adminPlugin, "admin entry loads");

    // Results keep a meshTable next to Download CSV.
    var sandbox = { window: {}, document: {}, navigator: {}, setTimeout: setTimeout, clearTimeout: clearTimeout, console: console };
    vm.runInNewContext(resultsSource, sandbox);
    var table = JSON.stringify({ meshTable: true, title: "Nessus", columns: ["Host"], rows: [{ Host: "pc01" }] });
    var parsed = sandbox.window.SharedResultsView.parseDownloadResult("Wygenerowano raport CSV: C:\\x\\a.csv\nLiczba rekordow: 3\nCSV_DOWNLOAD: C:\\x\\a.csv\n" + table);
    assert.strictEqual(parsed.downloadPath, "C:\\x\\a.csv");
    assert.ok(sandbox.window.SharedResultsView.parseStructured(parsed.visible).table, "structured report table survives the CSV marker");
    var plain = sandbox.window.SharedResultsView.parseDownloadResult("noise, more\nWygenerowano raport CSV: C:\\x\\b.csv\nLiczba rekordow: 3\nCSV_DOWNLOAD: C:\\x\\b.csv");
    assert.strictEqual(plain.visible, "Wygenerowano raport CSV: b.csv\nLiczba rekordow: 3", "plain CSV outputs keep the existing compact contract");
    fs.rmSync(temporary, { recursive: true, force: true });
    console.log("Nessus all-host My Script: metadata filters, Site Admin feed authorization, executor feed and download contract: OK");
}).catch(function (error) {
    console.error(error);
    process.exit(1);
});

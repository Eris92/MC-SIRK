"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var clock = require("../server/modules/commands/server-time-sync.js");
var commandsFactory = require("../server/modules/commands/index.js");

var WIN_ID = "Central European Standard Time";
if (process.argv.indexOf("--print-script") >= 0) {
    process.stdout.write(clock.buildPowerShell(clock.snapshot(new Date("2026-03-29T01:30:00.000Z"), "Europe/Warsaw")));
    process.exit(0);
}

assert.strictEqual(clock.windowsZone("Europe/Warsaw"), WIN_ID);
assert.strictEqual(clock.windowsZone("Europe/Berlin"), "W. Europe Standard Time");
assert.strictEqual(clock.windowsZone("Europe/Kyiv"), "FLE Standard Time");
assert.strictEqual(clock.windowsZone("Asia/Kolkata"), "India Standard Time");
assert.strictEqual(clock.windowsZone("America/New_York"), "Eastern Standard Time");
assert.strictEqual(clock.windowsZone("UTC"), "UTC");
assert.strictEqual(clock.windowsZone(WIN_ID), WIN_ID, "Windows server time-zone IDs must be supported.");
assert.throws(function () { clock.windowsZone("Mars/Unknown"); }, /No safe Windows time-zone mapping/);
assert.throws(function () { clock.windowsZone(""); }, /invalid/);
assert.throws(function () { clock.snapshot(new Date(NaN), "UTC"); }, /invalid/);
assert.throws(function () { clock.snapshot(new Date(), "Mars/Unknown"); }, /mapping/);
assert.throws(function () { clock.rejectClientValues({ variableValues: { serverUtc: "2000-01-01" } }); }, /does not accept/);
assert.throws(function () { clock.rejectClientValues({ variableValues: { timeZone: "UTC" } }); }, /does not accept/);
assert.doesNotThrow(function () { clock.rejectClientValues({ variableValues: {} }); });

var winter = clock.snapshot(new Date("2026-01-15T12:00:00.000Z"), "Europe/Warsaw");
var summer = clock.snapshot(new Date("2026-07-15T12:00:00.000Z"), "Europe/Warsaw");
assert.strictEqual(winter.windowsZone, summer.windowsZone, "DST must use a rule-based zone ID, not a current offset.");
var winterScript = clock.buildPowerShell(winter);
var summerScript = clock.buildPowerShell(summer);
assert.ok(winterScript.indexOf("'2026-01-15T12:00:00.000Z'") >= 0);
assert.ok(summerScript.indexOf("'2026-07-15T12:00:00.000Z'") >= 0);
assert.ok(winterScript.indexOf("Set-TimeZone -Id $windowsZoneId") >= 0);
assert.ok(winterScript.indexOf("SetSystemTime([ref]$native)") >= 0, "UTC-native clock setting avoids ambiguous DST local time.");
assert.ok(winterScript.indexOf("Get-SirkClockState") >= 0 && winterScript.indexOf("Get-Date -ErrorAction Stop") >= 0);
assert.ok(winterScript.indexOf("partial-failure") >= 0 && winterScript.indexOf("readAfterWriteDeltaSeconds") >= 0);
assert.ok(winterScript.indexOf("Get-TimeZone") >= 0 && winterScript.indexOf("transport") >= 0);
assert.ok(winterScript.indexOf("w32tm /config") < 0 && winterScript.indexOf("Set-Date") < 0);
assert.throws(function () {
    clock.buildPowerShell({ utc: "2000-01-01", serverZone: "UTC", windowsZone: "UTC" });
}, /Invalid server UTC/);
assert.throws(function () {
    clock.buildPowerShell({ utc: "2026-01-01T12:00:00.000Z", serverZone: "Europe/Warsaw", windowsZone: "UTC" });
}, /mapping mismatch/);
clock.requireWindowsTarget({ agent: { id: 4 }, osdesc: "Microsoft Windows Server 2022" });
assert.throws(function () { clock.requireWindowsTarget({ agent: { id: 6 }, osdesc: "Linux" }); }, /Windows MeshAgent/);
assert.throws(function () { clock.requireWindowsTarget({ agent: { id: 4 }, osdesc: "Ubuntu Linux" }); }, /not Windows/);

var tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-clock-sync-"));
var user = { _id: "user/test/admin", name: "admin", siteadmin: 0xFFFFFFFF };
var delivered = [], audited = 0, resolveTarget = null, sentError = null;
var windowsNode = { nodeId: "node/test/win", node: { name: "WinServer", osdesc: "Microsoft Windows Server 2022", agent: { id: 4 } } };
var context = {
    fs: fs,
    path: path,
    pluginRoot: path.resolve(__dirname, ".."),
    dataRoot: tmp,
    parent: { webserver: { users: { "user/test/admin": user } } },
    settings: { read: function () { return { modules: { mycommands: {} } }; } },
    device: {
        resolveNode: function () { return new Promise(function (resolve, reject) { resolveTarget = { resolve: resolve, reject: reject }; }); },
        sendRunCommands: function (node, command) {
            delivered.push({ node: node, command: command });
            return sentError ? Promise.reject(sentError) : Promise.resolve({ state: "sent" });
        },
        auditCommand: function () { audited += 1; }
    }
};
var originalClock = clock.readServerSnapshot;
var clockReads = 0;
clock.readServerSnapshot = function () {
    clockReads += 1;
    return clock.snapshot(new Date("2026-03-29T01:30:" + String(clockReads).padStart(2, "0") + ".000Z"), "Europe/Warsaw");
};
var mod = commandsFactory.createModule(context);
var catalog = mod.apiGet("catalog", { query: {} }, user).catalog;
var items = catalog.reduce(function (all, category) { return all.concat(category.commands); }, []);
var matches = items.filter(function (item) { return item.id === "sync-server-date-time"; });
assert.strictEqual(matches.length, 1, "Exactly one Windows clock-sync command must be catalogued.");
assert.strictEqual(items.filter(function (item) { return item.id === "odbc-32"; }).length, 1, "ODBC #460 must survive.");
assert.strictEqual(matches[0].runAsUser, 0);
assert.strictEqual(matches[0].showOnDesktop, true);
assert.strictEqual(matches[0].showWithoutDesktop, false);
assert.strictEqual(matches[0].confirmExecution, true);
assert.strictEqual(matches[0].locales.pl.label, "Ustaw datę, czas i strefę z serwera");
assert.strictEqual(matches[0].locales.en.label, "Set date, time & time zone from server");
assert.strictEqual(clockReads, 0, "Listing the catalog must never sample a server timestamp.");

async function run(value, node) {
    var result = mod.apiPost("execute", { body: Object.assign({
        nodeId: "node/test/win", commandId: "sync-server-date-time", confirmedExecution: true
    }, value || {}) }, user);
    if (!resolveTarget) return result;
    resolveTarget.resolve(node || windowsNode);
    resolveTarget = null;
    return result;
}

(async function () {
    try {
        var first = mod.apiPost("execute", { body: {
            nodeId: "node/test/win", commandId: "sync-server-date-time", confirmedExecution: true,
            serverUtc: "1990-01-01T00:00:00.000Z", timeZone: "UTC", command: "Set-Date -Date 1990", type: 1, runAsUser: 2
        } }, user);
        assert.strictEqual(clockReads, 0, "Timestamp may not be captured before rights resolution.");
        resolveTarget.resolve(windowsNode); resolveTarget = null;
        await first;
        assert.strictEqual(delivered.length, 1);
        assert.strictEqual(delivered[0].command.type, 2);
        assert.strictEqual(delivered[0].command.runAsUser, 0);
        assert.ok(delivered[0].command.cmd.indexOf("2026-03-29T01:30:01.000Z") >= 0);
        assert.ok(delivered[0].command.cmd.indexOf("1990-01-01T00:00:00.000Z") < 0);
        assert.strictEqual(clockReads, 1);
        await run({});
        assert.strictEqual(clockReads, 2, "Each dispatch must sample the server clock separately.");
        assert.ok(delivered[1].command.cmd.indexOf("2026-03-29T01:30:02.000Z") >= 0);
        assert.strictEqual(audited, 2);

        await assert.rejects(run({ variableValues: { utc: "1970-01-01" } }), /does not accept/);
        assert.strictEqual(clockReads, 2, "Client-side timestamp spoofing must not sample or dispatch.");
        await assert.rejects(run({ confirmedExecution: false }), /confirmation is required/i);
        assert.strictEqual(clockReads, 2);
        await assert.rejects((function () {
            var pending = mod.apiPost("execute", { body: { nodeId: "node/test/win", commandId: "sync-server-date-time", confirmedExecution: true } }, user);
            resolveTarget.reject(new Error("You do not have permission to run commands on this device."));
            resolveTarget = null;
            return pending;
        }()), /permission to run commands/);
        assert.strictEqual(clockReads, 2, "Unauthorized host must never yield a timestamp or a command.");

        await assert.rejects(run({}, { nodeId: "node/test/linux", node: { osdesc: "Debian Linux", agent: { id: 6 } } }), /Windows MeshAgent/);
        assert.strictEqual(clockReads, 2);
        var savedRead = clock.readServerSnapshot;
        clock.readServerSnapshot = function () { return clock.snapshot(new Date(), "Mars/Unknown"); };
        await assert.rejects(run({}), /No safe Windows time-zone mapping/);
        clock.readServerSnapshot = savedRead;
        assert.strictEqual(delivered.length, 2, "Fail-closed validation may not dispatch.");

        sentError = new Error("Device agent is not connected.");
        await assert.rejects(run({}), /Device agent is not connected/);
        assert.strictEqual(delivered.length, 3);
        assert.strictEqual(audited, 2, "Failed dispatch must not emit a success audit.");
        console.log("Server-owned Windows clock sync, CLDR/DST, late dispatch, rights, spoofing and offline: OK");
    } finally {
        clock.readServerSnapshot = originalClock;
        fs.rmSync(tmp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    clock.readServerSnapshot = originalClock;
    fs.rmSync(tmp, { recursive: true, force: true });
    console.error(error.stack || error);
    process.exitCode = 1;
});

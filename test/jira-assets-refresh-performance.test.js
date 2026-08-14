"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var factory = require(path.join(root, "server/core/jira-asset-service.js"));

function integration() {
    return {
        get: function () {
            return {
                url: "https://example.atlassian.net",
                email: "service@example.invalid",
                token: "SECRET",
                cloudId: "cloud-1",
                workspaceId: "workspace-1",
                verifyTls: true
            };
        }
    };
}

function page(startAt, count, realTotal) {
    return {
        values: Array.from({ length: count }, function (_, index) {
            var id = startAt + index;
            return {
                id: String(id),
                objectKey: "KEY-" + id,
                label: "Asset-" + id,
                objectType: { id: "type-device", name: "Device" },
                attributes: [{
                    objectTypeAttributeId: "hostname",
                    objectAttributeValues: [{ displayValue: "Asset-" + id }]
                }]
            };
        }),
        objectTypeAttributes: [{ id: "hostname", name: "Nazwa_sieciowa" }],
        totalFilterCount: Math.min(1000, realTotal),
        hasMoreResults: startAt + count < realTotal,
        isLast: startAt + count >= realTotal
    };
}

(async function () {
    var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-assets-refresh-"));
    try {
        var active = 0;
        var maxActive = 0;
        var starts = [];
        var totalCountCalls = 0;
        var realTotal = 2000;
        var service = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: temp,
            integrations: integration(),
            requestJson: function (options) {
                if (options.url.indexOf("/object/aql/totalcount") >= 0) {
                    totalCountCalls++;
                    return Promise.resolve({ totalCount: realTotal });
                }
                if (options.url.indexOf("/object/aql") < 0) {
                    return Promise.reject(new Error("Unexpected request: " + options.url));
                }
                var startAt = Number(new URL(options.url).searchParams.get("startAt"));
                starts.push(startAt);
                if (startAt === 0) return Promise.resolve(page(0, 500, realTotal));
                active++;
                maxActive = Math.max(maxActive, active);
                return new Promise(function (resolve) {
                    setImmediate(function () {
                        active--;
                        resolve(page(startAt, 500, realTotal));
                    });
                });
            }
        });

        var result = await service.listAssets("", {
            control: "asset",
            jiraAsset: {
                aql: "Key is not EMPTY",
                labelAttribute: "Nazwa_sieciowa",
                maxResults: 5000,
                userVariable: ""
            }
        }, true);

        assert.strictEqual(result.items.length, realTotal,
            "Forced cache refresh must retain the complete bounded workspace result.");
        assert.strictEqual(result.sourceCount, realTotal,
            "Cache workflow count must reflect the complete source snapshot rather than the 5000 option ceiling.");
        assert.strictEqual(totalCountCalls, 1,
            "Capped Jira pagination must resolve the authoritative total once before scheduling remaining pages.");
        assert.deepStrictEqual(starts.slice().sort(function (a, b) { return a - b; }), [0, 500, 1000, 1500],
            "Authoritative total must fetch each required page exactly once and stop at the real end.");
        assert.ok(maxActive >= 2,
            "Known Jira pages must execute concurrently instead of one slow request at a time.");
        assert.ok(maxActive <= 3,
            "Jira Assets page concurrency must stay bounded.");

        var persisted = JSON.parse(fs.readFileSync(service.assetCachePath, "utf8"));
        var entries = persisted.queries["Key is not EMPTY"].entries;
        assert.strictEqual(persisted.version, 4);
        assert.strictEqual(entries.length, realTotal);
        assert.strictEqual(Object.prototype.hasOwnProperty.call(entries[0].attributes[0], "objectAttributeValues"), false,
            "Fetched Jira pages must be compacted before the shared snapshot is retained.");

        console.log("Jira Assets refresh uses authoritative count and bounded concurrent pages: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

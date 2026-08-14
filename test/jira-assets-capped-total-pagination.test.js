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

// Reproduces current Jira Assets behavior: totalFilterCount is capped at 1000,
// while the dedicated totalcount endpoint returns the authoritative result size.
var REPORTED_TOTAL = 1000;
var REAL_TOTAL = 1200;

function page(startAt, count) {
    var hasMore = startAt + count < REAL_TOTAL;
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
        totalFilterCount: REPORTED_TOTAL,
        hasMoreResults: hasMore,
        isLast: !hasMore
    };
}

(async function () {
    var temp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-assets-capped-total-"));
    try {
        var starts = [];
        var totalCountCalls = 0;
        var service = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: temp,
            integrations: integration(),
            requestJson: function (options) {
                if (options.url.indexOf("/object/aql/totalcount") >= 0) {
                    totalCountCalls++;
                    assert.strictEqual(options.method, "POST");
                    assert.strictEqual(options.json.qlQuery, "Key is not EMPTY");
                    return Promise.resolve({ totalCount: REAL_TOTAL });
                }
                if (options.url.indexOf("/object/aql") < 0) {
                    return Promise.reject(new Error("Unexpected request: " + options.url));
                }
                var startAt = Number(new URL(options.url).searchParams.get("startAt"));
                starts.push(startAt);
                var count = Math.min(500, REAL_TOTAL - startAt);
                return Promise.resolve(page(startAt, count));
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

        assert.strictEqual(result.items.length, REAL_TOTAL,
            "Authoritative Jira total count must not truncate the fetched snapshot at the capped page total.");
        assert.strictEqual(result.sourceCount, REAL_TOTAL,
            "The cache owner must expose the actual fetched snapshot count independently from UI option limits.");
        assert.strictEqual(totalCountCalls, 1,
            "A capped Jira page total must use the dedicated authoritative totalcount endpoint exactly once.");
        assert.deepStrictEqual(starts.slice().sort(function (a, b) { return a - b; }), [0, 500, 1000],
            "Authoritative total count must bound page requests to the real result size.");
        assert.strictEqual(result.truncated, false,
            "A snapshot that reached the authoritative real end must not be reported as truncated.");

        console.log("Jira Assets authoritative total count bounds capped pagination: OK");
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

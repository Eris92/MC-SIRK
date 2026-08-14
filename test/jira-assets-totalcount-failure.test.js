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

function page(startAt, count, total) {
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
        totalFilterCount: 1000,
        hasMoreResults: startAt + count < total,
        isLast: startAt + count >= total
    };
}

function variable() {
    return {
        control: "asset",
        jiraAsset: {
            aql: "Key is not EMPTY",
            labelAttribute: "Nazwa_sieciowa",
            maxResults: 5000,
            userVariable: ""
        }
    };
}

(async function () {
    var fallbackTemp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-totalcount-fallback-"));
    try {
        var starts = [];
        var realTotal = 1200;
        var fallbackService = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: fallbackTemp,
            integrations: integration(),
            requestJson: function (options) {
                if (options.url.indexOf("/object/aql/totalcount") >= 0) {
                    return Promise.reject(new Error("totalcount unavailable"));
                }
                var startAt = Number(new URL(options.url).searchParams.get("startAt"));
                starts.push(startAt);
                return Promise.resolve(page(startAt, Math.min(500, realTotal - startAt), realTotal));
            }
        });
        var fallbackResult = await fallbackService.listAssets("", variable(), true);
        assert.strictEqual(fallbackResult.sourceCount, realTotal,
            "If the authoritative total endpoint is unavailable, bounded hasMoreResults pagination must still reach the real end.");
        assert.deepStrictEqual(starts, [0, 500, 1000],
            "Total-count failure fallback must remain sequential and bounded without restarting the first page.");
    } finally {
        fs.rmSync(fallbackTemp, { recursive: true, force: true });
    }

    var pageFailureTemp = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-jira-totalcount-page-failure-"));
    try {
        var page500Calls = 0;
        var pageFailureService = factory.createJiraAssetService({
            fs: fs,
            path: path,
            dataRoot: pageFailureTemp,
            integrations: integration(),
            requestJson: function (options) {
                if (options.url.indexOf("/object/aql/totalcount") >= 0) return Promise.resolve({ totalCount: 1200 });
                var startAt = Number(new URL(options.url).searchParams.get("startAt"));
                if (startAt === 0) return Promise.resolve(page(0, 500, 1200));
                if (startAt === 500) {
                    page500Calls++;
                    return Promise.reject(new Error("Jira page failed"));
                }
                return Promise.resolve(page(startAt, Math.min(500, 1200 - startAt), 1200));
            }
        });
        await assert.rejects(function () {
            return pageFailureService.listAssets("", variable(), true);
        }, /Jira page failed/,
        "A page failure after a successful authoritative count must fail the refresh instead of silently restarting and mixing partial pages.");
        assert.strictEqual(page500Calls, 1,
            "A failed page must not be retried through the total-count fallback path after partial concurrent results were already collected.");
    } finally {
        fs.rmSync(pageFailureTemp, { recursive: true, force: true });
    }

    console.log("Jira Assets total-count fallback and page-failure boundaries: OK");
}()).catch(function (error) {
    console.error(error && error.stack || error);
    process.exit(1);
});

"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var approvalFactory = require(path.join(root, "server/core/approval-service.js"));
var approvalModuleSource = fs.readFileSync(path.join(root, "server/modules/approval-center/index.js"), "utf8");
var approvalClientSource = fs.readFileSync(path.join(root, "public/modules/approvals/index.js"), "utf8");
var statusSource = fs.readFileSync(path.join(root, "public/shared/ui/status-nav.js"), "utf8");

var temp = fs.mkdtempSync(path.join(os.tmpdir(), "mc-sirk-requester-confirmation-"));
var databasePath = path.join(temp, "requests.json");
var settings = {
    read: function () {
        return {
            modules: {
                approvals: {
                    providers: {
                        confirmtest: { enabled: true, levels: {} },
                        pendingtest: { enabled: true, levels: { 1: [] } }
                    }
                }
            }
        };
    },
    isModuleEnabled: function () { return true; }
};
var service = approvalFactory.createApprovalService({
    fs: fs,
    path: path,
    parent: {},
    settings: settings,
    databasePath: databasePath,
    fallbackDatabasePath: path.join(temp, "fallback.json")
});
var confirmCalls = 0;

service.registerProvider({
    type: "confirmtest",
    title: "Confirm test",
    getApprovalLevels: function () { return []; },
    canSubmit: function () { return true; },
    execute: function (payload) {
        return { message: "prepared:" + String(payload.key || ""), prepared: true };
    },
    requiresRequesterConfirmation: function () { return true; },
    confirmRequester: function (result, request) {
        confirmCalls++;
        if (request.payload && request.payload.failConfirmation) return Promise.reject(new Error("final step failed"));
        return Promise.resolve(Object.assign({}, result, { finalized: true }));
    }
});

service.registerProvider({
    type: "pendingtest",
    title: "Pending test",
    getApprovalLevels: function () { return [1]; },
    canSubmit: function () { return true; },
    execute: function () { return { message: "done" }; }
});

var requester = { _id: "user/domain/requester", name: "Requester", siteadmin: false };
var other = { _id: "user/domain/other", name: "Other", siteadmin: false };
var siteAdmin = { _id: "user/domain/admin", name: "Site Admin", siteadmin: true };

function rows() {
    var parsed = JSON.parse(fs.readFileSync(databasePath, "utf8"));
    return parsed.requests || [];
}

(async function () {
    await service.initialize();

    var pending = await service.submit("pendingtest", requester, { key: "approval" }, "");
    assert.strictEqual(pending.status, "pending");
    assert.strictEqual(service.getRequest(requester, pending.id).canDecide, false,
        "Requester must still be unable to approve the ordinary pending phase.");
    assert.strictEqual(service.getRequest(siteAdmin, pending.id).canDecide, true,
        "Site Admin fallback must retain ordinary pending approval authority.");

    var prepared = await service.submit("confirmtest", requester, { key: "one" }, "");
    assert.strictEqual(prepared.status, "awaiting_confirmation");
    assert.strictEqual(prepared.result.prepared, true);
    assert.strictEqual(service.getRequest(requester, prepared.id).canConfirm, true,
        "Original requester must be able to confirm the prepared final step.");
    assert.strictEqual(service.getRequest(siteAdmin, prepared.id).canConfirm, true,
        "Site Admin must be able to act as confirmation fallback.");
    assert.throws(function () { service.getRequest(other, prepared.id); }, /Approval request not found/,
        "Unrelated users must not even see requester-confirmation requests.");
    await assert.rejects(function () { return service.confirm(other, prepared.id, ""); }, /Permission denied/);

    var actionable = await service.list(requester, { status: "actionable", page: 1, perPage: 50 });
    assert.ok(actionable.rows.some(function (row) { return row.id === pending.id; }));
    assert.ok(actionable.rows.some(function (row) { return row.id === prepared.id; }),
        "Approval Center actionable query must include awaiting_confirmation beside pending.");

    var concurrent = await Promise.all([
        service.confirm(requester, prepared.id, "signed"),
        service.confirm(requester, prepared.id, "signed duplicate")
    ]);
    assert.strictEqual(confirmCalls, 1, "Concurrent/replayed requester confirmation must execute the provider final step exactly once.");
    assert.strictEqual(service.getRequest(requester, prepared.id).status, "completed");
    assert.strictEqual(service.getRequest(requester, prepared.id).result.finalized, true);
    assert.ok(concurrent.some(function (row) { return row.status === "completed"; }));
    assert.strictEqual((rows().find(function (row) { return row.id === prepared.id; }).confirmation || {}).user.id, requester._id);

    var replay = await service.confirm(requester, prepared.id, "again");
    assert.strictEqual(replay.status, "completed");
    assert.strictEqual(confirmCalls, 1, "Completed confirmation replay must not execute the provider again.");

    var adminPrepared = await service.submit("confirmtest", requester, { key: "admin" }, "");
    var adminConfirmed = await service.confirm(siteAdmin, adminPrepared.id, "fallback");
    assert.strictEqual(adminConfirmed.status, "completed");
    assert.strictEqual(adminConfirmed.confirmation.user.id, siteAdmin._id);

    var failedPrepared = await service.submit("confirmtest", requester, { key: "failure", failConfirmation: true }, "");
    var failed = await service.confirm(requester, failedPrepared.id, "");
    assert.strictEqual(failed.status, "failed");
    assert.strictEqual(failed.result.message, "prepared:failure",
        "A final-step failure must preserve the already prepared result/artifacts contract.");
    assert.match(failed.confirmationError, /final step failed/);
    var callsAfterFailure = confirmCalls;
    await service.confirm(requester, failedPrepared.id, "retry");
    assert.strictEqual(confirmCalls, callsAfterFailure, "Failed finalization must never be replayed automatically.");

    var restartPrepared = await service.submit("confirmtest", requester, { key: "restart-awaiting" }, "");
    await service.initialize();
    assert.strictEqual(service.getRequest(requester, restartPrepared.id).status, "awaiting_confirmation",
        "Awaiting confirmation must survive a server restart unchanged.");

    var stored = JSON.parse(fs.readFileSync(databasePath, "utf8"));
    var interrupted = stored.requests.find(function (row) { return row.id === restartPrepared.id; });
    interrupted.status = "confirming";
    interrupted.confirmation = { user: { id: requester._id, name: requester.name }, confirmedAt: Date.now() };
    fs.writeFileSync(databasePath, JSON.stringify(stored, null, 2), "utf8");
    await service.initialize();
    var afterRestart = service.getRequest(requester, restartPrepared.id);
    assert.strictEqual(afterRestart.status, "failed");
    assert.match(afterRestart.confirmationError, /interrupted by server restart/,
        "Interrupted finalization must fail closed because an external write may already have happened.");

    assert.ok(approvalModuleSource.indexOf('asset === "confirm"') >= 0 && approvalModuleSource.indexOf("context.approval.confirm") >= 0,
        "Approval Center backend must expose the shared requester confirmation owner.");
    assert.ok(approvalClientSource.indexOf("openConfirmationDialog") >= 0 &&
        approvalClientSource.indexOf('asset: "confirm"') >= 0 &&
        approvalClientSource.indexOf("shell.post(definition.asset") >= 0,
        "Approval Center must reuse the native MeshCentral confirmation dialog before posting confirmation.");
    assert.ok(approvalClientSource.indexOf('status: "actionable"') >= 0,
        "Approval overview must surface both pending approvals and requester confirmations in one bounded request.");
    assert.ok(statusSource.indexOf('key: "awaiting_confirmation"') >= 0,
        "Shared status navigation must expose awaiting_confirmation.");

    console.log("Requester-only post-execution confirmation lifecycle, authorization and replay safety: OK");
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
}).then(function () {
    fs.rmSync(temp, { recursive: true, force: true });
});

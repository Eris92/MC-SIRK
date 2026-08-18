"use strict";

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.join(__dirname, "..");
var approvalFactory = require(path.join(root, "server/core/approval-service.js"));
var approvalCenterFactory = require(path.join(root, "server/modules/approval-center/index.js"));
var approvalClientSource = fs.readFileSync(path.join(root, "public/modules/approvals/index.js"), "utf8");

var temp = fs.mkdtempSync(path.join(os.tmpdir(), "mc-sirk-requester-cancellation-"));
var databasePath = path.join(temp, "requests.json");
var settings = {
    read: function () {
        return {
            modules: {
                approvals: {
                    providers: {
                        canceltest: { enabled: true, levels: {} }
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
var finalizerCalls = 0;

service.registerProvider({
    type: "canceltest",
    title: "Cancel test",
    getApprovalLevels: function () { return []; },
    canSubmit: function () { return true; },
    execute: function (payload) {
        return { message: "prepared:" + String(payload.key || ""), prepared: true };
    },
    requiresRequesterConfirmation: function () { return true; },
    confirmRequester: function (result) {
        finalizerCalls++;
        return Promise.resolve(Object.assign({}, result, { finalized: true }));
    }
});

var approvalCenter = approvalCenterFactory.createModule({
    approval: service,
    settings: settings
});
var requester = { _id: "user/domain/requester", name: "Requester", siteadmin: false };
var other = { _id: "user/domain/other", name: "Other", siteadmin: false };
var siteAdmin = { _id: "user/domain/admin", name: "Site Admin", siteadmin: true };

(async function () {
    await service.initialize();

    var prepared = await service.submit("canceltest", requester, { key: "requester" }, "");
    assert.strictEqual(prepared.status, "awaiting_confirmation");
    assert.strictEqual(service.getRequest(requester, prepared.id).canConfirm, true);
    assert.strictEqual(service.getRequest(requester, prepared.id).canCancelConfirmation, true,
        "Requester must receive the cancellation capability beside confirmation.");
    assert.strictEqual(service.getRequest(siteAdmin, prepared.id).canCancelConfirmation, true,
        "Site Admin fallback must receive the same cancellation capability.");
    await assert.rejects(function () {
        return approvalCenter.apiPost("cancel-confirmation", { body: { id: prepared.id, note: "forged" } }, other);
    }, /Permission denied/,
    "An unrelated user must not cancel requester confirmation with a forged POST.");

    var callsBeforeCancellation = finalizerCalls;
    var cancelledResponse = await approvalCenter.apiPost("cancel-confirmation", {
        body: { id: prepared.id, note: "not signed" }
    }, requester);
    var cancelled = cancelledResponse.request;
    assert.strictEqual(cancelled.status, "rejected");
    assert.strictEqual(cancelled.requesterCancellation.user.id, requester._id);
    assert.strictEqual(cancelled.requesterCancellation.note, "not signed");
    assert.ok(Number(cancelled.requesterCancellation.cancelledAt) > 0);
    assert.strictEqual(cancelled.canConfirm, false);
    assert.strictEqual(cancelled.canCancelConfirmation, false);
    assert.strictEqual(finalizerCalls, callsBeforeCancellation,
        "Cancellation must not execute the provider finalizer.");

    await assert.rejects(function () {
        return service.confirm(requester, prepared.id, "late confirmation");
    }, /Permission denied/,
    "Confirmation after cancellation must fail closed.");
    assert.strictEqual(finalizerCalls, callsBeforeCancellation,
        "A late confirmation must not execute the provider finalizer.");

    var replay = await service.cancelConfirmation(requester, prepared.id, "replacement note");
    assert.strictEqual(replay.status, "rejected");
    assert.strictEqual(replay.requesterCancellation.note, "not signed",
        "Cancellation replay must preserve the original audit record.");
    assert.strictEqual(finalizerCalls, callsBeforeCancellation,
        "Cancellation replay must have no provider side effects.");

    var adminPrepared = await service.submit("canceltest", requester, { key: "admin" }, "");
    var adminCancelled = await service.cancelConfirmation(siteAdmin, adminPrepared.id, "fallback cancellation");
    assert.strictEqual(adminCancelled.status, "rejected");
    assert.strictEqual(adminCancelled.requesterCancellation.user.id, siteAdmin._id);
    assert.strictEqual(finalizerCalls, callsBeforeCancellation,
        "Site Admin cancellation must not execute the provider finalizer.");

    var racePrepared = await service.submit("canceltest", requester, { key: "race-cancel" }, "");
    var cancelRace = await Promise.allSettled([
        service.cancelConfirmation(requester, racePrepared.id, "cancel wins"),
        service.confirm(requester, racePrepared.id, "late")
    ]);
    assert.strictEqual(cancelRace[0].status, "fulfilled");
    assert.strictEqual(cancelRace[0].value.status, "rejected");
    assert.strictEqual(cancelRace[1].status, "rejected");
    assert.match(String(cancelRace[1].reason && cancelRace[1].reason.message), /Permission denied/);
    assert.strictEqual(finalizerCalls, callsBeforeCancellation,
        "Serialized cancel/confirm race must not execute finalization when cancellation wins.");

    var confirmPrepared = await service.submit("canceltest", requester, { key: "race-confirm" }, "");
    var callsBeforeConfirmation = finalizerCalls;
    var confirmRace = await Promise.allSettled([
        service.confirm(requester, confirmPrepared.id, "confirm wins"),
        service.cancelConfirmation(requester, confirmPrepared.id, "too late")
    ]);
    assert.strictEqual(confirmRace[0].status, "fulfilled");
    assert.strictEqual(confirmRace[0].value.status, "completed");
    assert.strictEqual(confirmRace[1].status, "rejected");
    assert.match(String(confirmRace[1].reason && confirmRace[1].reason.message), /Permission denied/);
    assert.strictEqual(finalizerCalls, callsBeforeConfirmation + 1,
        "Serialized confirm/cancel race must execute the provider finalizer exactly once when confirmation wins.");

    assert.ok(approvalClientSource.indexOf("request.canCancelConfirmation") >= 0,
        "Approval Center must render cancellation from the backend capability.");
    assert.ok(approvalClientSource.indexOf('title: "Confirm"') >= 0 &&
        approvalClientSource.indexOf('title: "Cancel"') >= 0,
        "Awaiting confirmation must expose both Confirm and Cancel actions.");
    assert.ok(approvalClientSource.indexOf('asset: "confirm"') >= 0 &&
        approvalClientSource.indexOf('asset: "cancel-confirmation"') >= 0,
        "Both requester actions must post through the Approval Center API owner.");
    assert.ok(approvalClientSource.indexOf("openConfirmationDialog") >= 0 &&
        approvalClientSource.indexOf("btn-danger sirk-action-cancel") >= 0,
        "Cancellation must reuse the native confirmation dialog and native danger button styling.");

    console.log("Requester confirmation cancellation authorization, audit, race safety and UI contract: OK");
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
}).then(function () {
    fs.rmSync(temp, { recursive: true, force: true });
});

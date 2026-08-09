"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/shared/ui/results.js"), "utf8");

assert.ok(source.indexOf('function hostDialogManager()') >= 0,
    "Shared Results must have one bounded host-dialog detector inside the existing renderer owner.");
assert.ok(source.indexOf('typeof window.setModalContent === "function"') >= 0 &&
    source.indexOf('typeof window.showModal === "function"') >= 0 &&
    source.indexOf('document.getElementById("xxAddAgentModal")') >= 0 &&
    source.indexOf('document.getElementById("xxAddAgentModalConf")') >= 0 &&
    source.indexOf('document.getElementById("dialog2")') >= 0,
    "Modern Results viewer must use the same bounded MeshCentral modal manager contract as Move Request.");
assert.ok(source.indexOf('manager.setContent("xxAddAgent", title, contentHtml, "extra-large")') >= 0 &&
    source.indexOf('manager.show("xxAddAgentModal", "idx_dlgOkButton")') >= 0,
    "Modern Results viewer must provide MeshCentral's required OK-button id so showModal returns and live result mounting can continue.");
assert.strictEqual(source.indexOf('manager.show("xxAddAgentModal");'), -1,
    "The dev.34 incomplete showModal call that throws after showing an empty modal must not return.");
assert.ok(source.indexOf('typeof window.setDialogMode === "function"') >= 0 &&
    source.indexOf('document.getElementById("dialog")') >= 0 &&
    source.indexOf('document.getElementById("id_dialogOptions")') >= 0 &&
    source.indexOf('manager.show(2, title, 1, null, contentHtml)') >= 0,
    "Classic Results viewer must use native mode-2 dialog content with one host OK/close button.");
assert.ok(source.indexOf('id="\' + hostId + \'" class="mc-results-viewer"') >= 0 &&
    source.indexOf('appendResult(host, raw, options)') >= 0,
    "Results content must be mounted as live DOM after the native host creates the dialog body so Copy/Download/Debug handlers survive.");
assert.ok(source.indexOf('function escapeHtml(value)') >= 0 &&
    source.indexOf('var title = escapeHtml(options.dialogTitle || row.title || "Result")') >= 0,
    "Dynamic viewer titles must be escaped before entering the host HTML dialog API.");
assert.strictEqual(source.indexOf('mc-results-viewer-overlay'), -1,
    "Results runtime must not recreate the transparent plugin-owned overlay/modal tree.");
assert.strictEqual(source.indexOf('style.background'), -1,
    "Results viewer fix must not introduce a private hardcoded surface palette.");

console.log("Results viewer completes the native Modern/Classic MeshCentral dialog contract before mounting output: OK");

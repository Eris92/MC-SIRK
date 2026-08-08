"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");

assert.ok(source.indexOf('typeof window.setModalContent === "function"') >= 0 && source.indexOf('typeof window.showModal === "function"') >= 0,
    "Move Request must detect the Modern MeshCentral modal manager.");
assert.ok(source.indexOf('document.getElementById("xxAddAgentModal")') >= 0 && source.indexOf('document.getElementById("dialog2")') >= 0,
    "Modern routing must be bounded to the actual Modern modal DOM/content target.");
assert.ok(source.indexOf('dialogManager.setContent("xxAddAgent", "Move Request", content.innerHTML)') >= 0,
    "Modern Move Request must populate the native xxAddAgent modal through setModalContent.");
assert.ok(source.indexOf('dialogManager.show("xxAddAgentModal", "idx_dlgOkButton", submitRequest)') >= 0,
    "Modern Move Request must open the native modal through showModal and reuse its OK control.");
assert.ok(source.indexOf('return false;') >= 0,
    "Native Modern submit callback must return false so pending/success/error remains visible in the open modal.");
assert.ok(source.indexOf('document.getElementById("dialog")') >= 0 && source.indexOf('document.getElementById("id_dialogOptions")') >= 0,
    "Classic setDialogMode routing must be bounded to Classic dialog DOM targets.");
assert.ok(source.indexOf('else dialogManager.show(2, "Move Request", 3, null, content.innerHTML)') >= 0,
    "Classic may continue using setDialogMode only through the Classic manager branch.");
assert.strictEqual(source.indexOf('mc-move-dialog-overlay'), -1,
    "Move Request runtime must not restore the plugin-built overlay/modal tree.");
console.log("Move Request routes to native Modern/Classic dialog managers: OK");

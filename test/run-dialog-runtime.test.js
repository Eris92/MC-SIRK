"use strict";

// Quick vulnerability Fix/Undo dialog (live smoke 2026-11-04): one native modal goes
// confirm -> spinner -> agent result -> OK, and stays open until OK/close.
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(path.resolve(__dirname, "../public/shared/ui/parameter-dialog.js"), "utf8");

function makeElement(tag) {
    var node = {
        tagName: tag, children: [], attributes: {}, listeners: {}, hidden: false, disabled: false,
        className: "", textContent: "", style: {}, id: "",
        appendChild: function (child) { this.children.push(child); child.parentNode = this; return child; },
        removeChild: function (child) { this.children.splice(this.children.indexOf(child), 1); },
        setAttribute: function (name, value) { this.attributes[name] = String(value); },
        addEventListener: function (name, fn) { (this.listeners[name] = this.listeners[name] || []).push(fn); },
        removeEventListener: function (name, fn) { this.listeners[name] = (this.listeners[name] || []).filter(function (f) { return f !== fn; }); },
        fire: function (name) { (this.listeners[name] || []).slice().forEach(function (fn) { fn({}); }); },
        focus: function () {}
    };
    Object.defineProperty(node, "firstChild", { get: function () { return this.children[0] || null; } });
    Object.defineProperty(node, "innerHTML", { get: function () { return "<html>"; } });
    return node;
}
function allText(node) {
    return (node.textContent || "") + node.children.map(allText).join(" ");
}
function find(node, cls) {
    if (String(node.className).split(" ").indexOf(cls) >= 0) return node;
    for (var i = 0; i < node.children.length; i++) { var hit = find(node.children[i], cls); if (hit) return hit; }
    return null;
}

var ok = makeElement("button"); ok.textContent = "OK";
var cancel = makeElement("button");
var modal = makeElement("div");
var status = makeElement("div"); status.hidden = true; // the real DOM gets it from the serialized hidden attribute
var okHandler = null, hidden = 0, shown = 0;
var elements = { idx_dlgOkButton: ok, idx_dlgCancelButton: cancel, xxAddAgentModal: modal, xxAddAgentModalConf: makeElement("div"), dialog2: makeElement("div"), mcRunDialogStatus: status };
var document = {
    activeElement: null,
    documentElement: { lang: "pl" },
    createElement: makeElement,
    getElementById: function (id) { return elements[id] || null; }
};
var window = {
    SharedScriptTools: {},
    localStorage: { getItem: function () { return "pl"; } },
    setModalContent: function () {},
    showModal: function (id, okId, callback) {
        shown++;
        okHandler = function () { if (callback() !== false) { hidden++; modal.fire("hidden.bs.modal"); } };
    }
};
vm.runInNewContext(source, { window: window, document: document, Promise: Promise, String: String, Number: Number, Array: Array, Object: Object, Error: Error });
var tools = window.SharedScriptTools;
assert.strictEqual(typeof tools.openRunDialog, "function");

var finishRun;
var openFlag = null;
var closed = tools.openRunDialog({
    title: "Napraw", message: "Uruchomić?", primaryLabel: "Uruchom", runningText: "Wykonywanie…", closeLabel: "OK",
    item: { rebootRequired: true },
    run: function (isOpen) { openFlag = isOpen; return new Promise(function (resolve) { finishRun = resolve; }); }
});
assert.strictEqual(shown, 1);
assert.strictEqual(ok.textContent, "Uruchom", "confirm phase shows the run label");
assert.ok(status.hidden, "no status before confirmation");

okHandler();
assert.strictEqual(hidden, 0, "confirming keeps the modal open");
assert.ok(ok.disabled, "OK is disabled while running");
assert.strictEqual(cancel.style.display, "none", "cancel hidden while running");

setImmediate(function () {
    assert.ok(find(status, "mc-run-dialog-spinner"), "spinner shown while running");
    assert.ok(allText(status).indexOf("Wykonywanie") >= 0);
    okHandler();
    assert.strictEqual(hidden, 0, "OK while running does nothing");
    assert.strictEqual(openFlag(), true);
    finishRun({ label: "Polecenie zostało wykonane.", output: "TLS 1.0 disabled" });
    setImmediate(function () {
        assert.ok(!find(status, "mc-run-dialog-spinner"), "spinner replaced by the result");
        assert.ok(/is-done/.test(status.className));
        assert.ok(allText(status).indexOf("TLS 1.0 disabled") >= 0, "agent output shown");
        assert.strictEqual(ok.textContent, "OK");
        assert.strictEqual(ok.disabled, false);
        okHandler();
        assert.strictEqual(hidden, 1, "OK closes after the result");
        closed.then(function (result) {
            assert.strictEqual(result.output, "TLS 1.0 disabled");
            assert.strictEqual(openFlag(), false, "isOpen() turns false after close");
            assert.strictEqual(ok.textContent, "OK", "original OK label restored");
            assert.notStrictEqual(cancel.style.display, "none", "cancel restored");
            console.log("Run dialog: confirm, spinner, result and OK in one native modal: OK");
        }).catch(function (error) { console.error(error); process.exit(1); });
    });
});

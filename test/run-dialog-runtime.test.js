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
        // A real <button> exposes value "" (live smoke 2026-11-04: labels were written to
        // .value, so Modern showed MeshCentral's own "Delete"/"Usuń" on the Restart button).
        value: tag === "button" ? "" : undefined,
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

var ok = makeElement("BUTTON"); ok.tagName = "BUTTON"; ok.value = ""; ok.textContent = "OK";
var cancel = makeElement("button");
var danger = makeElement("button"); danger.textContent = "Delete"; danger.style.display = "none";
cancel.click = function () { hidden++; modal.fire("hidden.bs.modal"); };
var modal = makeElement("div");
var status = makeElement("div"); status.hidden = true; // the real DOM gets it from the serialized hidden attribute
var okHandler = null, hidden = 0, shown = 0;
var elements = { idx_dlgOkButton: ok, idx_dlgCancelButton: cancel, idx_dlgDeleteButton: danger, xxAddAgentModal: modal, xxAddAgentModalConf: makeElement("div"), dialog2: makeElement("div"), mcRunDialogStatus: status };
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
var progressFn = null;
var closed = tools.openRunDialog({
    title: "Napraw", message: "Uruchomić?", primaryLabel: "Uruchom", runningText: "Wykonywanie…", closeLabel: "OK",
    item: { rebootRequired: true },
    backgroundLabel: "Zamknij",
    run: function (isOpen, progress) { openFlag = isOpen; progressFn = progress; return new Promise(function (resolve) { finishRun = resolve; }); }
});
assert.strictEqual(shown, 1);
assert.strictEqual(ok.textContent, "Uruchom", "confirm phase shows the run label");
assert.ok(status.hidden, "no status before confirmation");

okHandler();
assert.strictEqual(hidden, 0, "confirming keeps the modal open");
assert.strictEqual(ok.textContent, "Zamknij", "while running OK closes the dialog and leaves the command running");
assert.strictEqual(cancel.style.display, "none", "cancel hidden while running");

setImmediate(function () {
    assert.ok(find(status, "mc-run-dialog-spinner"), "spinner shown while running");
    assert.ok(allText(status).indexOf("Wykonywanie") >= 0);
    progressFn("(12 s, wysłano do agenta)");
    assert.ok(allText(status).indexOf("12 s, wysłano do agenta") >= 0 && find(status, "mc-run-dialog-spinner"), "progress shows elapsed time and server status");
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
            assert.strictEqual(danger.style.display, "none", "no Restart button without an extra action");
        runBackgroundCase();
        runRestartCase();
        console.log("Run dialog: confirm, spinner, result and OK in one native modal: OK");
        }).catch(function (error) { console.error(error); process.exit(1); });
    });
});

function runBackgroundCase() {
    var isOpenFn;
    var done = tools.openRunDialog({ primaryLabel: "Uruchom", backgroundLabel: "Zamknij", run: function (isOpen) { isOpenFn = isOpen; return new Promise(function () {}); } });
    okHandler();
    var before = hidden;
    okHandler();
    assert.strictEqual(hidden, before + 1, "Zamknij during a run closes the dialog");
    return done.then(function () { assert.strictEqual(isOpenFn(), false, "polling stops after closing"); });
}

function runRestartCase() {
    var restarted = 0, finish;
    var done = tools.openRunDialog({
        primaryLabel: "Uruchom", item: { rebootRequired: true },
        extraAction: { label: "Restart", run: function () { restarted++; return true; } },
        run: function () { return new Promise(function (resolve) { finish = resolve; }); }
    });
    okHandler();
    assert.strictEqual(danger.style.display, "none", "Restart is hidden while running");
    setImmediate(function () { finish({ label: "OK", output: "done" }); setImmediate(afterFinish); });
    function afterFinish() {
        assert.strictEqual(danger.style.display, "", "Restart appears after a successful run");
        assert.strictEqual(danger.textContent, "Restart");
        var before = hidden;
        danger.fire("click");
        assert.strictEqual(restarted, 1, "Restart runs the power action once");
        assert.strictEqual(hidden, before + 1, "Restart also closes the dialog");
        done.then(function (result) {
            assert.strictEqual(result.extraAction, true);
            assert.strictEqual(danger.style.display, "none", "danger button hidden again");
            assert.strictEqual(danger.textContent, "Delete", "original label restored");
            var failedFinish;
            tools.openRunDialog({ extraAction: { run: function () {} }, run: function () { return new Promise(function (r) { failedFinish = r; }); } });
            okHandler();
            setImmediate(function () { failedFinish({ failed: true, output: "x" }); setImmediate(afterFailed); });
            function afterFailed() {
                assert.strictEqual(danger.style.display, "none", "no Restart after a failed run");
                okHandler();
                console.log("Run dialog Restart button: OK");
            }
        }).catch(function (error) { console.error(error); process.exit(1); });
    }
}

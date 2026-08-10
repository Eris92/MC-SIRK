"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/shared/ui/results.js"), "utf8");

function Element(tagName) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.children = [];
    this.className = "";
    this.textContent = "";
    this.value = "";
    this.style = {};
    this.isConnected = false;
}
Element.prototype.appendChild = function (child) {
    this.children.push(child);
    child.parentNode = this;
    child.isConnected = true;
    return child;
};
Element.prototype.remove = function () {
    if (!this.parentNode) return;
    var index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.isConnected = false;
};
Element.prototype.focus = function () { this.focused = true; };
Element.prototype.select = function () {};
Element.prototype.insertRow = function () {
    var row = new Element("tr");
    row.insertCell = function () { var cell = new Element("td"); row.appendChild(cell); return cell; };
    this.appendChild(row);
    return row;
};
Element.prototype.createTHead = function () { var head = new Element("thead"); this.appendChild(head); return head; };
Element.prototype.createTBody = function () { var body = new Element("tbody"); this.appendChild(body); return body; };
Object.defineProperty(Element.prototype, "innerHTML", {
    get: function () { return ""; },
    set: function () { this.children = []; }
});

function find(rootNode, predicate) {
    if (!rootNode) return null;
    if (predicate(rootNode)) return rootNode;
    for (var index = 0; index < rootNode.children.length; index++) {
        var found = find(rootNode.children[index], predicate);
        if (found) return found;
    }
    return null;
}

var nodes = Object.create(null);
["xxAddAgentModal", "xxAddAgentModalConf", "dialog2", "idx_dlgOkButton"].forEach(function (id) {
    nodes[id] = new Element("div");
    nodes[id].isConnected = true;
});
var document = {
    body: new Element("body"),
    createElement: function (tagName) { return new Element(tagName); },
    getElementById: function (id) { return nodes[id] || null; },
    execCommand: function () { return true; }
};
var sequence = [];
var window = {
    setModalContent: function (modalId, title, html) {
        sequence.push("setContent");
        assert.strictEqual(modalId, "xxAddAgent");
        assert.ok(html.indexOf('id="SirkResultsViewerNativeHost"') >= 0);
        nodes.SirkResultsViewerNativeHost = new Element("div");
        nodes.SirkResultsViewerNativeHost.className = "mc-results-viewer";
        nodes.SirkResultsViewerNativeHost.isConnected = true;
    },
    showModal: function (modalId, okButtonId) {
        sequence.push("show");
        assert.strictEqual(modalId, "xxAddAgentModal");
        assert.strictEqual(okButtonId, "idx_dlgOkButton");
        var host = nodes.SirkResultsViewerNativeHost;
        assert.ok(find(host, function (node) { return node.tagName === "TABLE"; }),
            "The parsed result table must already exist before the native Modern modal is shown.");
        var debug = find(host, function (node) { return node.tagName === "DETAILS" && node.className === "mc-results-debug"; });
        assert.ok(debug, "Expandable Debug/raw output must already exist before first paint.");
        var raw = find(debug, function (node) { return node.tagName === "PRE"; });
        assert.ok(raw && raw.textContent.indexOf("CSV_DOWNLOAD:C:\\Temp\\asset.csv") >= 0,
            "Debug must preserve the untouched generated-download marker.");
        assert.ok(raw.textContent.indexOf("__MYCOMMANDS_PROGRESS__working") >= 0,
            "Debug must preserve the untouched progress marker.");
        assert.ok(raw.textContent.indexOf("Run as: SYSTEM") >= 0,
            "Debug must preserve the untouched run-as line.");
    },
    MeshThemeAdapter: {
        refresh: function (host) {
            sequence.push("refresh");
            assert.ok(find(host, function (node) { return node.tagName === "TABLE"; }),
                "Theme refresh must receive the final parsed content tree.");
        }
    },
    SirkPlatformCore: { assetUrl: function () { return "/download"; } },
    location: {}
};
var context = {
    window: window,
    document: document,
    navigator: {},
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    Promise: Promise,
    Uint8Array: Uint8Array,
    decodeURIComponent: decodeURIComponent
};
vm.runInNewContext(source, context, { filename: "results.js" });

var rawPayload = [
    "CSV_DOWNLOAD:C:\\Temp\\asset.csv",
    "__MYCOMMANDS_PROGRESS__working",
    "Run as: SYSTEM",
    '{"title":"Local asset report","rows":[{"Value":"DELL K","Property":"Host name"}]}'
].join("\n");
var row = { title: "Local asset report", status: "completed", result: { output: rawPayload } };

assert.strictEqual(window.SharedResultsView.rawResult(row),
    '{"title":"Local asset report","rows":[{"Value":"DELL K","Property":"Host name"}]}',
    "Normal Results cells must keep the cleaned user-facing output instead of exposing diagnostic markers.");
window.SharedResultsView.openViewer(row, { dialogTitle: "Local asset report" });
assert.deepStrictEqual(sequence, ["setContent", "refresh", "show"],
    "Modern Results must build and theme one final content tree before the native modal first paint.");

console.log("Results viewer first paint is final, structured output is tabular and Debug preserves full raw output: OK");

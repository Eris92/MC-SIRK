"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.resolve(__dirname, "..");
var catalogSource = fs.readFileSync(path.join(root, "public/shared/ui/catalog.js"), "utf8");
var commandsSource = fs.readFileSync(path.join(root, "public/modules/commands/index.js"), "utf8");

function ClassList(owner) { this.owner = owner; }
ClassList.prototype._items = function () { return String(this.owner.className || "").split(/\s+/).filter(Boolean); };
ClassList.prototype.add = function () { var items = this._items(); Array.prototype.forEach.call(arguments, function (name) { if (items.indexOf(name) < 0) items.push(name); }); this.owner.className = items.join(" "); };
ClassList.prototype.remove = function () { var removed = Array.prototype.slice.call(arguments); this.owner.className = this._items().filter(function (name) { return removed.indexOf(name) < 0; }).join(" "); };
ClassList.prototype.toggle = function (name, enabled) { if (enabled) this.add(name); else this.remove(name); };
ClassList.prototype.contains = function (name) { return this._items().indexOf(name) >= 0; };

function Element(tagName) {
    this.kind = "element"; this.parentNode = null;
    this.tagName = String(tagName || "div").toUpperCase();
    this.className = ""; this.classList = new ClassList(this);
    this.childNodes = []; this.attributes = Object.create(null); this.listeners = Object.create(null);
    this.textContent = ""; this.onclick = null; this.disabled = false; this.innerHTMLWrites = [];
}
Object.defineProperty(Element.prototype, "children", { get: function () { return this.childNodes.filter(function (node) { return node.kind === "element"; }); } });
Object.defineProperty(Element.prototype, "innerHTML", {
    get: function () { return ""; },
    set: function (value) { this.innerHTMLWrites.push(String(value)); this.childNodes.forEach(function (node) { node.parentNode = null; }); this.childNodes = []; }
});
Element.prototype.setAttribute = function (name, value) { this.attributes[name] = String(value); };
Element.prototype.getAttribute = function (name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; };
Element.prototype.addEventListener = function (type, handler, capture) { (this.listeners[type] = this.listeners[type] || []).push({ handler: handler, capture: capture === true }); };
Element.prototype.click = function () {
    var event = { type: "click", preventDefault: function () {}, stopPropagation: function () {} };
    (this.listeners.click || []).forEach(function (entry) { entry.handler.call(this, event); }, this);
    if (typeof this.onclick === "function") this.onclick.call(this, event);
};
Element.prototype.appendChild = function (node) { if (node.parentNode) node.parentNode.removeChild(node); this.childNodes.push(node); node.parentNode = this; return node; };
Element.prototype.insertBefore = function (node, reference) {
    if (node.parentNode) node.parentNode.removeChild(node);
    var index = this.childNodes.indexOf(reference); if (index < 0) return this.appendChild(node);
    this.childNodes.splice(index, 0, node); node.parentNode = this; return node;
};
Element.prototype.removeChild = function (node) { var index = this.childNodes.indexOf(node); if (index >= 0) this.childNodes.splice(index, 1); node.parentNode = null; return node; };
Element.prototype.querySelector = function () { return null; };
function text(node) { return [node.textContent || ""].concat(node.childNodes.map(text)).join(" "); }

var document = {
    createElement: function (name) { return new Element(name); },
    createComment: function (value) { return { kind: "comment", textContent: value, parentNode: null }; },
    activeElement: null
};

var mountedTables = [];
var mountedStatus = [];
var definition = null;
var window = {
    localStorage: null,
    setTimeout: function (callback) { callback(); return 1; },
    addEventListener: function () {},
    SirkPlatformRuntime: { state: { nodeId: "" } },
    SirkPlatformModules: {},
    SharedDirectoryTree: {
        mount: function (options) { options.rootsContainer.innerHTML = ""; var root = new Element("button"); root.textContent = "Scripts"; options.rootsContainer.appendChild(root); return {}; },
        find: function () { return null; }
    },
    SharedResultsView: {
        mountStatus: function (host, options) { mountedStatus.push(options); },
        mountTable: function (host, options) { mountedTables.push(options); }
    },
    SharedScriptTools: {
        create: function () {
            return { state: { favoritesOnly: false, favorites: [], editMode: false }, restoreTreeState: function () {}, saveTreeState: function () {}, syncToolbar: function () {}, applyDeepLink: function () {}, filterScript: function () { return true; }, scriptActions: function () { return []; } };
        }
    },
    SirkPlatformModuleShell: { create: function (value) { definition = value; return { api: null }; } }
};
var context = { window: window, document: document, localStorage: { getItem: function () { return "en"; } }, console: console, JSON: JSON, Object: Object, Array: Array, String: String, Number: Number, Math: Math, Date: Date, isNaN: isNaN, Promise: Promise, Error: Error };
vm.runInNewContext(catalogSource, context);
vm.runInNewContext(commandsSource, context);
assert.ok(definition && typeof definition.render === "function", "Commands renderer must register through the module shell.");

// Catalog: Vulnerabilities is directly below Results and mutually exclusive with it.
var catalogHost = new Element("div");
window.SharedCatalogView.mount({ primaryContainer: catalogHost, tree: {}, state: {}, resultsActive: false, extraItems: [{ key: "vulnerabilities", label: "Vulnerabilities", active: true }] });
var labels = catalogHost.children.map(function (item) { return item.getAttribute("data-sirk-catalog-item") || (item.classList.contains("mc-catalog-results") ? "results" : item.textContent); });
assert.deepStrictEqual(labels, ["results", "vulnerabilities", "Scripts"]);
assert.strictEqual(catalogHost.children[1].getAttribute("aria-selected"), "true");
assert.strictEqual(catalogHost.children[0].getAttribute("aria-selected"), "false");

// Renderer: device switch rejects a late response for the previous host.
var pending = [];
var apiCalls = [];
var shell = {
    state: { nodeId: "node/d/A", search: "", bootstrap: { access: { siteAdmin: false } }, page: { primary: new Element("div"), secondary: new Element("div"), details: new Element("div"), toolbar: null } },
    api: function (asset, params) {
        apiCalls.push({ asset: asset, params: params });
        if (asset === "scripts") return Promise.resolve({ tree: { children: [] }, catalog: [] });
        return new Promise(function (resolve, reject) { pending.push({ params: params, resolve: resolve, reject: reject }); });
    },
    post: function () { return Promise.resolve({}); },
    render: function () { return definition.render(shell); },
    card: function (title, message) { var card = new Element("div"); card.textContent = title + " " + message; return card; },
    element: function (tag, className, value) { var item = new Element(tag); item.className = className || ""; if (value != null) item.textContent = value; return item; },
    error: function (host, error) { throw error; }
};
var lastCatalog = null;
var originalMount = window.SharedCatalogView.mount;
window.SharedCatalogView.mount = function (options) { lastCatalog = options; return originalMount(options); };
function flush() { return new Promise(function (resolve) { setImmediate(resolve); }); }
function finding(name, risk) { return { risk: risk, score: 9, exploit: true, occurrences: 1, fields: { "Plugin ID": "1", "Plugin Name": name } }; }

definition.render(shell).then(function () {
    lastCatalog.extraItems[0].onClick();
    return flush();
}).then(function () {
    var vulnCalls = apiCalls.filter(function (call) { return call.asset === "vulnerabilities"; });
    assert.strictEqual(vulnCalls.length, 1, "entering Vulnerabilities performs one node-scoped read");
    assert.deepStrictEqual(JSON.parse(JSON.stringify(vulnCalls[0].params)), { nodeId: "node/d/A", detail: "1" }, "only the nodeId is sent; no hostname");
    shell.state.nodeId = "node/d/B";
    return shell.render();
}).then(flush).then(function () {
    assert.strictEqual(pending.length, 2);
    assert.strictEqual(pending[1].params.nodeId, "node/d/B");
    pending[0].resolve({ ok: true, status: "available", nodeId: "node/d/A", host: { host: "a.local", counts: { critical: 1 }, findingsCount: 1, findings: [finding("<b>A-only</b>", "critical")] } });
    return flush();
}).then(function () {
    assert.ok(!text(shell.state.page.details).match(/A-only|a\.local/), "a delayed response of the previous host must be discarded");
    pending[1].resolve({ ok: true, status: "available", nodeId: "node/d/B", import: { importedAt: "2026-11-03T10:00:00Z" }, host: { host: "b.local", generationDate: "2026-11-02", generatedAt: "2026-11-02T00:00:00Z", counts: { high: 1, low: 1 }, findingsCount: 2, findings: [finding("Low thing", "low"), finding("High thing", "high")] } });
    return flush();
}).then(function () {
    assert.ok(text(shell.state.page.details).indexOf("b.local") >= 0);
    var table = mountedTables[mountedTables.length - 1];
    assert.deepStrictEqual(Array.from(table.rows).map(function (row) { return row.fields["Plugin Name"]; }), ["High thing", "Low thing"], "severity sort");
    assert.deepStrictEqual(Array.from(table.columns).map(function (column) { return column.title; }), ["Risk", "Plugin Name", "Plugin ID", "Score", "Exploit"]);
    var details = JSON.parse(table.resultValue(table.rows[0]));
    assert.strictEqual(details.meshTable, true, "full CSV fields open in the shared structured viewer");
    var status = mountedStatus[mountedStatus.length - 1];
    status.onSelect("low");
    return flush();
}).then(function () {
    var table = mountedTables[mountedTables.length - 1];
    assert.deepStrictEqual(Array.from(table.rows).map(function (row) { return row.fields["Plugin Name"]; }), ["Low thing"], "severity filter");
    assert.strictEqual(apiCalls.filter(function (call) { return call.asset === "vulnerabilities"; }).length, 2, "re-render and filters do not refetch");
    // No findings / unknown states never render a table.
    shell.state.nodeId = "node/d/C";
    mountedStatus[mountedStatus.length - 1].onSelect("");
    return flush();
}).then(function () {
    var before = mountedTables.length;
    pending[2].resolve({ ok: true, status: "host_unmatched", nodeId: "node/d/C", host: null, import: {} });
    return flush().then(function () {
        assert.strictEqual(mountedTables.length, before, "unknown host state must not render an empty findings table");
        assert.ok(/not found/.test(text(shell.state.page.details)), "unmatched state is explicit");
    });
}).then(function () {
    assert.ok(!/setInterval/.test(commandsSource), "no polling");
    console.log("Commands Vulnerabilities view: placement, node-scoped read, stale response guard and filters: OK");
}).catch(function (error) {
    console.error(error);
    process.exit(1);
});

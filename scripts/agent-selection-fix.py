from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    data = p.read_text(encoding="utf-8")
    if old not in data:
        raise SystemExit("missing patch target in %s: %s" % (path, old[:140]))
    p.write_text(data.replace(old, new, 1), encoding="utf-8")


replace(
    "public/shared/ui/tree.js",
    '''    function applyButton(button) {\n        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.button === "function") {\n            window.MeshThemeAdapter.button(button);\n        }\n    }\n\n    function createButton(options) {''',
    '''    function applyButton(button) {\n        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.button === "function") {\n            window.MeshThemeAdapter.button(button);\n        }\n    }\n\n    function connectedSelectionHost(button) {\n        var current = button;\n        var outermost = button;\n        while (current) {\n            outermost = current;\n            if (current.classList && current.classList.contains("mc-shared-secondary")) return current;\n            current = current.parentNode;\n        }\n        return outermost;\n    }\n\n    function collectScriptButtons(node, output) {\n        output = output || [];\n        var children = node && node.children || [];\n        for (var index = 0; index < children.length; index++) {\n            var child = children[index];\n            if (child.classList && child.classList.contains("mc-tree-script")) output.push(child);\n            collectScriptButtons(child, output);\n        }\n        return output;\n    }\n\n    function syncScriptSelection(button) {\n        if (!button) return;\n        collectScriptButtons(connectedSelectionHost(button)).forEach(function (candidate) {\n            var selected = candidate === button;\n            candidate.classList.toggle("active", selected);\n            candidate.classList.toggle("is-active", selected);\n            candidate.setAttribute("aria-selected", selected ? "true" : "false");\n            var row = candidate.parentNode;\n            if (row && row.classList && row.classList.contains("mc-tree-script-row")) {\n                row.classList.toggle("active", selected);\n            }\n            applyNav(candidate);\n        });\n    }\n\n    function createButton(options) {'''
)

replace(
    "public/shared/ui/tree.js",
    '''            active: text(options.selectedScript) === text(script.path),\n            onClick: function () { options.onScript(script); }\n        });''',
    '''            active: text(options.selectedScript) === text(script.path),\n            onClick: function () { options.onScript(script, button); }\n        });'''
)

replace(
    "public/shared/ui/tree.js",
    '''                onScript: function (script) {\n                    state.selectedScript = script.path;\n                    if (typeof options.onScript === "function") options.onScript(script);\n                    window.SharedDirectoryTree.mount(options);\n                }''',
    '''                onScript: function (script, button) {\n                    state.selectedScript = script.path;\n                    syncScriptSelection(button);\n                    if (typeof options.onScript === "function") options.onScript(script);\n                }'''
)

Path("test/shared-tree-connected-selection.test.js").write_text(r'''"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(path.resolve(__dirname, "../public/shared/ui/tree.js"), "utf8");

function ClassList(owner) { this.owner = owner; }
ClassList.prototype._items = function () {
    return String(this.owner.className || "").split(/\s+/).filter(Boolean);
};
ClassList.prototype.add = function () {
    var items = this._items();
    Array.prototype.forEach.call(arguments, function (name) {
        if (items.indexOf(name) < 0) items.push(name);
    });
    this.owner.className = items.join(" ");
};
ClassList.prototype.remove = function () {
    var removed = Array.prototype.slice.call(arguments);
    this.owner.className = this._items().filter(function (name) {
        return removed.indexOf(name) < 0;
    }).join(" ");
};
ClassList.prototype.toggle = function (name, enabled) {
    if (enabled) this.add(name); else this.remove(name);
};
ClassList.prototype.contains = function (name) {
    return this._items().indexOf(name) >= 0;
};

function Element(tagName) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.className = "";
    this.classList = new ClassList(this);
    this.childNodes = [];
    this.parentNode = null;
    this.attributes = Object.create(null);
    this.textContent = "";
    this.hidden = false;
    this.onclick = null;
    this.disabled = false;
}
Object.defineProperty(Element.prototype, "children", {
    get: function () { return this.childNodes.slice(); }
});
Object.defineProperty(Element.prototype, "innerHTML", {
    get: function () { return ""; },
    set: function () {
        this.childNodes.forEach(function (node) { node.parentNode = null; });
        this.childNodes = [];
    }
});
Element.prototype.appendChild = function (node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    this.childNodes.push(node);
    node.parentNode = this;
    return node;
};
Element.prototype.removeChild = function (node) {
    var index = this.childNodes.indexOf(node);
    if (index >= 0) this.childNodes.splice(index, 1);
    node.parentNode = null;
    return node;
};
Element.prototype.setAttribute = function (name, value) { this.attributes[name] = String(value); };
Element.prototype.getAttribute = function (name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
};
Element.prototype.click = function () {
    if (typeof this.onclick === "function") this.onclick({ preventDefault: function () {}, stopPropagation: function () {} });
};

var document = { createElement: function (name) { return new Element(name); } };
var navCalls = 0;
var window = {
    MeshThemeAdapter: {
        nav: function () { navCalls += 1; },
        button: function () {}
    }
};

vm.runInNewContext(source, {
    window: window,
    document: document,
    String: String,
    Array: Array,
    Object: Object,
    Error: Error
});

function collectByClass(node, className, output) {
    output = output || [];
    (node && node.children || []).forEach(function (child) {
        if (child.classList && child.classList.contains(className)) output.push(child);
        collectByClass(child, className, output);
    });
    return output;
}

var roots = new Element("section");
var staging = new Element("section");
staging.className = "mc-shared-secondary";
var real = new Element("section");
real.className = "mc-shared-secondary";
var state = {
    selectedRoot: "@menu/network",
    selectedScript: "@command/network/one",
    expanded: {}
};
var callbacks = 0;
var tree = {
    type: "directory",
    path: "",
    children: [{
        type: "directory",
        name: "Network",
        path: "@menu/network",
        children: [
            { type: "script", name: "One", label: "One", path: "@command/network/one" },
            { type: "script", name: "Two", label: "Two", path: "@command/network/two" }
        ]
    }]
};

window.SharedDirectoryTree.mount({
    rootsContainer: roots,
    treeContainer: staging,
    tree: tree,
    state: state,
    onScript: function () { callbacks += 1; }
});

var initial = collectByClass(staging, "mc-tree-script");
assert.strictEqual(initial.length, 2, "The regression fixture must render both script rows.");
assert.ok(initial[0].classList.contains("active") && initial[0].classList.contains("is-active"),
    "The initial selected script must start active in staging DOM.");
assert.strictEqual(initial[1].getAttribute("aria-selected"), "false");

while (staging.childNodes.length) real.appendChild(staging.childNodes[0]);
var committed = collectByClass(real, "mc-tree-script");
assert.strictEqual(committed[0], initial[0], "Atomic commit must move, not recreate, the rendered script node.");
assert.strictEqual(committed[1], initial[1], "Atomic commit must preserve the second rendered script node.");
assert.strictEqual(staging.childNodes.length, 0, "The staging tree must be empty after atomic commit.");

var beforeClickNavCalls = navCalls;
committed[1].click();

assert.strictEqual(state.selectedScript, "@command/network/two",
    "Clicking the committed row must update the single selectedScript owner.");
assert.strictEqual(callbacks, 1, "Script selection must call the consumer exactly once.");
assert.strictEqual(staging.childNodes.length, 0,
    "Selection must not remount into the stale detached staging container.");
assert.strictEqual(collectByClass(real, "mc-tree-script")[0], committed[0],
    "Selection must reuse the committed DOM instead of remounting the tree.");
assert.strictEqual(committed[0].classList.contains("active"), false,
    "Previous script must lose active state immediately in connected DOM.");
assert.strictEqual(committed[0].classList.contains("is-active"), false,
    "Previous script must lose is-active state immediately in connected DOM.");
assert.strictEqual(committed[0].getAttribute("aria-selected"), "false",
    "Previous script must expose aria-selected=false immediately.");
assert.ok(committed[1].classList.contains("active") && committed[1].classList.contains("is-active"),
    "Clicked script must gain visible selected markers immediately in connected DOM.");
assert.strictEqual(committed[1].getAttribute("aria-selected"), "true",
    "Clicked script must expose aria-selected=true immediately.");
assert.strictEqual(committed[0].parentNode.classList.contains("active"), false,
    "Previous script row must lose its row-level active marker.");
assert.strictEqual(committed[1].parentNode.classList.contains("active"), true,
    "Clicked script row must gain its row-level active marker.");
assert.ok(navCalls >= beforeClickNavCalls + 2,
    "Native theme mapping must be refreshed for both previous and newly selected rows.");

console.log("Shared tree selection updates connected atomic-render DOM without stale remount: OK");
''', encoding="utf-8")

"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var source = fs.readFileSync(path.join(__dirname, "..", "public/modules/approvals/index.js"), "utf8");
var toolbarCss = fs.readFileSync(path.join(__dirname, "..", "public/shared/ui/toolbar.css"), "utf8");

function ClassList() { this.values = []; }
ClassList.prototype.add = function (name) { if (this.values.indexOf(name) < 0) this.values.push(name); };
ClassList.prototype.contains = function (name) { return this.values.indexOf(name) >= 0; };
ClassList.prototype.toggle = function (name, enabled) {
    var index = this.values.indexOf(name);
    if (enabled && index < 0) this.values.push(name);
    if (!enabled && index >= 0) this.values.splice(index, 1);
};
function Element(tag) {
    this.tagName = String(tag || "div").toUpperCase();
    this.children = [];
    this.classList = new ClassList();
    this.attributes = {};
    this.textContent = "";
    this.parentNode = null;
    this.onclick = null;
    this._innerHTML = "";
}
Object.defineProperty(Element.prototype, "className", {
    get: function () { return this.classList.values.join(" "); },
    set: function (value) { this.classList.values = String(value || "").split(/\s+/).filter(Boolean); }
});
Object.defineProperty(Element.prototype, "innerHTML", {
    get: function () { return this._innerHTML; },
    set: function (value) { this._innerHTML = String(value || ""); if (!value) this.children = []; }
});
Element.prototype.setAttribute = function (name, value) { this.attributes[name] = String(value); };
Element.prototype.getAttribute = function (name) { return this.attributes[name] || null; };
Element.prototype.appendChild = function (child) { child.parentNode = this; this.children.push(child); return child; };
Element.prototype.classActive = function () { return this.classList.contains("active") && this.classList.contains("is-active"); };

var moduleDefinition;
var document = {
    createElement: function (tag) { return new Element(tag); },
    createTextNode: function (value) { var node = new Element("#text"); node.textContent = String(value); return node; }
};
var context = {
    console: console,
    document: document,
    window: {
        document: document,
        SirkPlatformModules: {},
        MeshThemeAdapter: { nav: function (button) { button.attributes["data-themed"] = "1"; return button; } },
        SharedStatusNav: { list: function () { return [
            { key: "", title: "All", icon: "<svg></svg>" },
            { key: "pending", title: "Pending", icon: "<svg></svg>" },
            { key: "completed", title: "Completed", icon: "<svg></svg>" }
        ]; } },
        SharedResultsView: { mountTable: function () {} },
        SirkPlatformModuleShell: { create: function (definition) { moduleDefinition = definition; return definition; } }
    }
};
context.window.window = context.window;
vm.runInNewContext(source, context, { filename: "approvals/index.js" });
assert.ok(moduleDefinition && typeof moduleDefinition.render === "function", "Approval module render must be captured.");

var page = { root: new Element("div"), primary: new Element("div"), secondary: new Element("div"), details: new Element("div") };
var shell = {
    state: { page: page, search: "" },
    api: function (action) {
        if (action === "providers") return Promise.resolve({ providers: [
            { type: "moverequests", title: "Move Requests" },
            { type: "mycommands", title: "Commands" },
            { type: "myscripts", title: "Scripts" }
        ] });
        return Promise.resolve({ rows: [] });
    },
    element: function (tag, className, value) { var el = new Element(tag); el.className = className || ""; el.textContent = value || ""; return el; },
    card: function (title) { var el = new Element("div"); el.textContent = title || ""; return el; },
    post: function () { return Promise.resolve({}); },
    error: function () {}
};
var lastRender = null;
shell.render = function () { lastRender = moduleDefinition.render(shell); return lastRender; };

function selected(host) { return host.children.filter(function (item) { return item.classActive(); }); }
function assertOne(host, title) {
    var active = selected(host);
    assert.strictEqual(active.length, 1, title + " must have exactly one active item.");
    host.children.forEach(function (item) {
        assert.strictEqual(item.getAttribute("aria-selected"), item.classActive() ? "true" : "false",
            title + " aria-selected must match visible active state.");
        assert.strictEqual(item.getAttribute("data-themed"), "1", title + " rows must enter native nav mapping immediately.");
    });
    return active[0];
}

(async function () {
    await shell.render();
    assert.strictEqual(assertOne(page.primary, "Approval primary").title, "Overview");
    assertOne(page.secondary, "Approval overview filters");

    page.primary.children[2].onclick();
    await lastRender;
    assertOne(page.primary, "Approval provider primary");
    assertOne(page.secondary, "Approval provider statuses");
    assert.ok(page.primary.children[2].classActive(), "Commands provider must be selected after click.");

    page.secondary.children[1].onclick();
    await lastRender;
    assertOne(page.secondary, "Approval changed status");
    assert.ok(page.secondary.children[1].classActive(), "Pending status must be selected after click.");

    page.primary.children[0].onclick();
    await lastRender;
    assertOne(page.primary, "Approval returned Overview");
    assertOne(page.secondary, "Approval returned overview filter");
    assert.ok(page.primary.children[0].classActive(), "Overview must be the only selected primary item after return.");

    assert.ok(toolbarCss.indexOf('.mc-shared-page :is(.sirk-shared-list-item,.mc-shared-nav-item):is(.active,.is-active)') >= 0,
        "Shared selected-state fallback must cover Approval nav items, including collapsed icon-only primary.");
    console.log("Approval navigation keeps exactly one visible aria-selected item per active column: OK");
}()).catch(function (error) { console.error(error); process.exitCode = 1; });

"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
var pageSource = fs.readFileSync(path.join(root, "public", "shared", "ui", "page.js"), "utf8");
var approval = fs.readFileSync(path.join(root, "public", "native", "approval.css"), "utf8");
var automation = fs.readFileSync(path.join(root, "public", "modules", "automation", "style.css"), "utf8");
var main = fs.readFileSync(path.join(root, "public", "shared", "styles", "main.css"), "utf8");
var toolbar = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.css"), "utf8");
var layout = fs.readFileSync(path.join(root, "public", "shared", "ui", "layout.js"), "utf8");
var sharedUi = fs.readFileSync(path.join(root, "public", "shared", "ui", "shared-ui.css"), "utf8");

assert.ok(
    pageSource.indexOf("installNativeWorkspaceTitleContract") >= 0,
    "The shared page layer must replace the legacy workspace title implementation before modules mount."
);
assert.strictEqual(
    pageSource.indexOf('document.createElement("h1")'),
    -1,
    "Plugin workspaces must never create their own heading element."
);
assert.strictEqual(
    pageSource.indexOf("while (titleHost.firstChild)"),
    -1,
    "Plugin workspaces must never clear or rebuild the native MeshCentral title host."
);
assert.ok(
    pageSource.indexOf('titleHost.querySelector("h1") || titleHost') >= 0 &&
    pageSource.indexOf("binding.textNode.nodeValue") >= 0,
    "Workspace titles must update only the text node inside the existing native heading."
);

function classList(initial) {
    var values = Object.create(null);
    (initial || []).forEach(function (name) { values[name] = true; });
    return {
        contains: function (name) { return values[name] === true; },
        add: function (name) { values[name] = true; },
        remove: function (name) { delete values[name]; }
    };
}

function styleStore() {
    var values = Object.create(null);
    return {
        cssText: "",
        setProperty: function (name, value) { values[name] = value; },
        removeProperty: function (name) { delete values[name]; }
    };
}

function TextNode(value) {
    this.nodeType = 3;
    this.nodeValue = value;
    this.parentNode = null;
}

function Element(tag, id) {
    this.nodeType = 1;
    this.tagName = String(tag || "div").toUpperCase();
    this.id = id || "";
    this.className = "";
    this.classList = classList([]);
    this.childNodes = [];
    this.parentNode = null;
    this.hidden = false;
    this.style = styleStore();
}
Element.prototype.appendChild = function (node) {
    if (node.parentNode) node.parentNode.removeChild(node);
    node.parentNode = this;
    this.childNodes.push(node);
    return node;
};
Element.prototype.insertBefore = function (node, reference) {
    if (!reference) return this.appendChild(node);
    if (node.parentNode) node.parentNode.removeChild(node);
    var index = this.childNodes.indexOf(reference);
    if (index < 0) return this.appendChild(node);
    node.parentNode = this;
    this.childNodes.splice(index, 0, node);
    return node;
};
Element.prototype.removeChild = function (node) {
    var index = this.childNodes.indexOf(node);
    if (index >= 0) this.childNodes.splice(index, 1);
    node.parentNode = null;
    return node;
};
Element.prototype.contains = function (node) {
    for (var current = node; current; current = current.parentNode) {
        if (current === this) return true;
    }
    return false;
};
Element.prototype.querySelector = function (selector) {
    selector = String(selector || "").toLowerCase();
    var wantedTag = selector === "h1" ? "H1" : "";
    if (!wantedTag) return null;
    var queue = this.childNodes.slice();
    while (queue.length) {
        var node = queue.shift();
        if (node.nodeType === 1 && node.tagName === wantedTag) return node;
        if (node.childNodes) queue = queue.concat(node.childNodes);
    }
    return null;
};
Element.prototype.setAttribute = function () {};
Object.defineProperty(Element.prototype, "firstChild", {
    get: function () { return this.childNodes[0] || null; }
});
Object.defineProperty(Element.prototype, "firstElementChild", {
    get: function () {
        return this.childNodes.filter(function (node) { return node.nodeType === 1; })[0] || null;
    }
});
Object.defineProperty(Element.prototype, "nextElementSibling", {
    get: function () {
        if (!this.parentNode) return null;
        var siblings = this.parentNode.childNodes.filter(function (node) { return node.nodeType === 1; });
        var index = siblings.indexOf(this);
        return index >= 0 ? siblings[index + 1] || null : null;
    }
});

var page = new Element("div", "p1");
var titleHost = new Element("div", "p1title");
var nativeHeading = new Element("h1");
nativeHeading.className = "native-meshcentral-page-title custom-theme-heading";
var nativeText = new TextNode("Moje Urządzenia");
var nativeControl = new Element("button");
nativeControl.className = "native-heading-action";
nativeControl.appendChild(new TextNode("Akcje"));
nativeHeading.appendChild(nativeText);
nativeHeading.appendChild(nativeControl);
titleHost.appendChild(nativeHeading);
var nativeContent = new Element("div", "native-device-content");
page.appendChild(titleHost);
page.appendChild(nativeContent);

var ids = {
    p1: page,
    p1title: titleHost,
    "native-device-content": nativeContent
};
var documentElement = new Element("html");
var context = {
    console: console,
    Number: Number,
    String: String,
    document: {
        documentElement: documentElement,
        getElementById: function (id) { return ids[id] || null; },
        querySelector: function () { return null; },
        createElement: function (tag) {
            var element = new Element(tag);
            Object.defineProperty(element, "id", {
                configurable: true,
                get: function () { return this.__id || ""; },
                set: function (value) {
                    this.__id = String(value || "");
                    if (this.__id) ids[this.__id] = this;
                }
            });
            return element;
        },
        createTextNode: function (value) { return new TextNode(value); }
    },
    window: {
        SirkPlatformCore: { workspaceState: null },
        SharedLayout: { mount: function () {} },
        SharedToolbar: { mount: function () {} },
        SharedTabs: { mount: function () {} }
    }
};
context.window.window = context.window;
vm.runInNewContext(pageSource, context, { filename: "page.js" });

var core = context.window.SirkPlatformCore;
var headingIdentity = nativeHeading;
var controlIdentity = nativeControl;
var originalHeadingClass = nativeHeading.className;
var renderedHosts = [];

assert.strictEqual(core.showWorkspace("My Scripts", 101, function (host) {
    renderedHosts.push(host);
    host.appendChild(new Element("div"));
}), true, "My Scripts workspace must mount.");
assert.strictEqual(nativeHeading, headingIdentity,
    "My Scripts must retain the exact native heading element.");
assert.strictEqual(nativeControl, controlIdentity,
    "My Scripts must retain native controls and their event-owner identity.");
assert.strictEqual(nativeHeading.className, originalHeadingClass,
    "My Scripts must inherit every native and custom theme class unchanged.");
assert.strictEqual(nativeText.nodeValue, "My Scripts",
    "My Scripts must replace only the native title text node.");
assert.strictEqual(nativeContent.hidden, true,
    "The native device content must be hidden while the workspace is active.");

core.showWorkspace("Approval Center", 105, function (host) {
    renderedHosts.push(host);
});
assert.strictEqual(nativeHeading, headingIdentity,
    "Approval Center must reuse the same native heading element as My Scripts.");
assert.strictEqual(nativeControl, controlIdentity,
    "Approval Center must not recreate native heading controls.");
assert.strictEqual(nativeHeading.className, originalHeadingClass,
    "Approval Center must inherit the same native and custom heading classes.");
assert.strictEqual(nativeText.nodeValue, "Approval Center",
    "Approval Center must update the same native text node.");
assert.strictEqual(renderedHosts[0], renderedHosts[1],
    "Workspace navigation must reuse the same workspace host.");

var replacementHost = new Element("div", "p1title");
var replacementHeading = new Element("h1");
replacementHeading.className = "native-title-after-meshcentral-refresh";
var replacementText = new TextNode("Moje Urządzenia po odświeżeniu");
replacementHeading.appendChild(replacementText);
replacementHost.appendChild(replacementHeading);
page.removeChild(titleHost);
page.insertBefore(replacementHost, page.firstChild);
ids.p1title = replacementHost;

core.showWorkspace("My Scripts", 101, function () {});
assert.strictEqual(nativeText.nodeValue, "Moje Urządzenia",
    "Replacing p1title must restore the previous native heading text.");
assert.strictEqual(replacementText.nodeValue, "My Scripts",
    "A MeshCentral title-host replacement must be captured without creating a plugin heading.");
assert.strictEqual(replacementHeading.className, "native-title-after-meshcentral-refresh",
    "A refreshed native heading must keep its current theme class.");

core.restoreWorkspace();
assert.strictEqual(replacementText.nodeValue, "Moje Urządzenia po odświeżeniu",
    "Leaving the plugin workspace must restore the exact native title text.");
assert.strictEqual(replacementHeading.className, "native-title-after-meshcentral-refresh",
    "Leaving the workspace must not alter native heading classes.");
assert.strictEqual(nativeContent.hidden, false,
    "Leaving the workspace must restore native content visibility.");

assert.strictEqual(
    automation.indexOf("#p1title"),
    -1,
    "My Scripts must not own or imitate the native MeshCentral page title style."
);
assert.strictEqual(
    automation.indexOf("#SirkPlatformWorkspace"),
    -1,
    "My Scripts must not own the shared workspace geometry."
);
assert.strictEqual(
    approval.indexOf(".mc-shared-toolbar"),
    -1,
    "Approval Center must inherit SharedToolbar instead of overriding it."
);
assert.strictEqual(
    approval.indexOf(".mc-shared-layout"),
    -1,
    "Approval Center must inherit SharedLayout instead of defining separate columns."
);
assert.strictEqual(
    main.indexOf(".mc-module-approvalcenter .mc-shared-layout"),
    -1,
    "Global styles must not contain an Approval-only layout exception."
);
assert.ok(
    toolbar.indexOf(".mc-shared-toolbar{") >= 0 &&
    sharedUi.indexOf(".mc-shared-layout{") >= 0,
    "Both modules must receive toolbar geometry from toolbar.css and canonical workspace geometry from shared-ui.css."
);
assert.ok(
    layout.indexOf('root.className = "mc-shared-layout"') >= 0 &&
    layout.indexOf('primary.className = "mc-shared-primary"') >= 0 &&
    layout.indexOf('secondary.className = "mc-shared-secondary"') >= 0 &&
    layout.indexOf('details.className = "mc-shared-details"') >= 0,
    "SharedLayout JavaScript must own only canonical workspace structure/state classes."
);
assert.strictEqual(
    layout.indexOf("grid-template-columns:"),
    -1,
    "SharedLayout JavaScript must not own CSS geometry."
);
assert.strictEqual(
    /(^|})\.mc-shared-layout\{grid-template-columns:/.test(toolbar),
    false,
    "Toolbar CSS must not own a second global shared layout definition."
);
assert.ok(
    toolbar.indexOf(".mc-shared-page.is-edit-mode .mc-shared-layout{grid-template-columns:") >= 0 &&
    toolbar.indexOf(".mc-shared-page.is-multi-mode .mc-shared-layout{grid-template-columns:") >= 0,
    "Toolbar CSS may own only explicit Edit/Multi layout exceptions needed for their measured mode geometry."
);
assert.ok(
    sharedUi.indexOf("--sirk-shared-primary-track:minmax(165px,205px)") >= 0 &&
    sharedUi.indexOf("--sirk-shared-secondary-track:minmax(285px,340px)") >= 0,
    "The shared stylesheet must own the one canonical desktop column geometry."
);
assert.ok(
    sharedUi.indexOf(".mc-approval-card-grid") >= 0 &&
    sharedUi.indexOf(".mc-approval-request-actions") >= 0,
    "Approval-specific content semantics must remain in the shared UI stylesheet."
);

console.log("Native MeshCentral title node identity and canonical shared module inheritance: OK");

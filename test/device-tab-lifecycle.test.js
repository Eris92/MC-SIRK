"use strict";

var assert = require("assert");
var fs = require("fs");
var vm = require("vm");
var path = require("path");

var root = path.resolve(__dirname, "..");

function ClassList(initial) {
    this.values = Object.create(null);
    String(initial || "").split(/\s+/).filter(Boolean).forEach(function (value) { this.values[value] = true; }, this);
}
ClassList.prototype.add = function () {
    for (var index = 0; index < arguments.length; index += 1) this.values[arguments[index]] = true;
};
ClassList.prototype.remove = function () {
    for (var index = 0; index < arguments.length; index += 1) delete this.values[arguments[index]];
};
ClassList.prototype.contains = function (value) { return this.values[value] === true; };
ClassList.prototype.toggle = function (value, force) {
    if (force === true) { this.add(value); return true; }
    if (force === false) { this.remove(value); return false; }
    if (this.contains(value)) { this.remove(value); return false; }
    this.add(value); return true;
};

function Style() { this.values = Object.create(null); this.display = ""; }
Style.prototype.setProperty = function (name, value) { this.values[name] = value; if (name === "display") this.display = value; };
Style.prototype.removeProperty = function (name) { delete this.values[name]; if (name === "display") this.display = ""; };

function Element(id, className) {
    this.id = id || "";
    this.className = className || "";
    this.classList = new ClassList(className);
    this.style = new Style();
    this.childNodes = [];
    this.parentNode = null;
    this.listeners = Object.create(null);
    this.innerHTML = "";
    this.textContent = "";
}
Element.prototype.appendChild = function (child) { child.parentNode = this; this.childNodes.push(child); return child; };
Element.prototype.insertBefore = function (child, reference) {
    child.parentNode = this;
    var index = this.childNodes.indexOf(reference);
    if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child);
    return child;
};
Element.prototype.removeChild = function (child) {
    var index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
};
Element.prototype.addEventListener = function (name, handler) {
    if (!this.listeners[name]) this.listeners[name] = [];
    this.listeners[name].push(handler);
};
Element.prototype.dispatch = function (name, event) {
    (this.listeners[name] || []).forEach(function (handler) { handler(event || {}); });
};

function Store() { this.values = Object.create(null); }
Store.prototype.getItem = function (key) { return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null; };
Store.prototype.setItem = function (key, value) { this.values[key] = String(value); };

function createEnvironment() {
    var elements = Object.create(null);
    var timers = [];
    var timerId = 0;
    var mountCount = 0;
    var mountedHosts = [];

    function add(element) { if (element.id) elements[element.id] = element; return element; }
    function remove(id) { delete elements[id]; }
    function headers() {
        return Object.keys(elements).filter(function (id) { return id.indexOf("p19ph-") === 0; }).map(function (id) { return elements[id]; });
    }

    var topRow = new Element("topRow");
    var plugins = add(new Element("MainDevPlugins", "topbar_td style3x"));
    var terminal = add(new Element("MainDevTerminal", "topbar_td style3x"));
    var desktop = add(new Element("MainDevDesktop", "topbar_td style3sel"));
    topRow.appendChild(plugins);
    topRow.appendChild(terminal);
    topRow.appendChild(desktop);
    add(topRow);

    var p19headers = add(new Element("p19headers"));
    var p19pages = add(new Element("p19pages"));
    var p19title = add(new Element("p19title"));
    var h1 = new Element("");
    h1.childNodes.push({ nodeType: 3, nodeValue: "Plugins" });
    p19title.appendChild(h1);

    var nativeHeader = add(new Element("p19ph-native", "on"));
    var nativePage = add(new Element("native"));
    p19headers.appendChild(nativeHeader);
    p19pages.appendChild(nativePage);

    var document = {
        documentElement: new Element("html"),
        createElement: function () { return new Element(""); },
        getElementById: function (id) {
            if (elements[id]) return elements[id];
            var roots = [topRow, p19headers, p19pages, p19title];
            function find(node) {
                if (!node) return null;
                if (node.id === id) return node;
                for (var index = 0; index < (node.childNodes || []).length; index += 1) {
                    var match = find(node.childNodes[index]);
                    if (match) return match;
                }
                return null;
            }
            for (var index = 0; index < roots.length; index += 1) {
                var match = find(roots[index]);
                if (match) return match;
            }
            return null;
        },
        querySelector: function (selector) {
            if (selector === "#p19headers span.on" || selector === "#p19headers .on") {
                var list = headers();
                for (var index = 0; index < list.length; index += 1) if (list[index].classList.contains("on")) return list[index];
                return null;
            }
            if (selector === "#p19title h1") return h1;
            return null;
        },
        querySelectorAll: function (selector) {
            if (selector === "#p19headers [id^='p19ph-']") return headers();
            return [];
        }
    };

    var localStorage = new Store();
    var sessionStorage = new Store();
    localStorage.setItem("_curPluginPage", "native");

    var pluginHandler = {
        registerPluginTab: function (definition) {
            var headerId = "p19ph-" + definition.tabId;
            if (!elements[headerId]) {
                var header = add(new Element(headerId));
                p19headers.appendChild(header);
            }
            if (!elements[definition.tabId]) {
                var page = add(new Element(definition.tabId));
                p19pages.appendChild(page);
            }
        },
        callPluginPage: function (id, header) {
            headers().forEach(function (item) { item.classList.remove("on"); });
            Object.keys(elements).forEach(function (key) {
                if (key === "native" || key === "sirk-platform-mycommands-device-page") elements[key].style.display = "none";
            });
            header.classList.add("on");
            if (elements[id]) elements[id].style.display = "";
            localStorage.setItem("_curPluginPage", id);
        }
    };

    var core = {
        ensureMenu: function () {},
        setPluginMenuActive: function () {},
        card: function () { return new Element(""); },
        element: function () { return new Element(""); },
        api: function () { return Promise.resolve({}); },
        post: function () { return Promise.resolve({}); },
        activePlugin: null,
        workspaceState: null,
        restoreWorkspace: function () {},
        showWorkspace: function () { return false; },
        clearNativeMenuSelection: function () {}
    };

    var window = {
        SirkPlatformCore: core,
        SharedToolbarConfig: { definitions: { collapse: {} } },
        SharedPage: {
            mount: function (options) {
                mountCount += 1;
                mountedHosts.push(options.container);
                options.container.childNodes = [new Element("")];
                return {
                    toolbar: { buttons: {}, setIcon: function () {}, setTitle: function () {}, clearSearch: function () {} },
                    layout: { isCollapsed: function () { return false; }, toggleCollapsed: function () {}, clear: function () {} },
                    tabs: { select: function () {} },
                    details: new Element(""),
                    primary: new Element(""),
                    secondary: new Element("")
                };
            }
        },
        pluginHandler: pluginHandler,
        localStorage: localStorage,
        sessionStorage: sessionStorage,
        xxcurrentView: 10,
        selectedNode: "node/1",
        __SIRK_CURRENT_NODE_ID__: "node/1",
        location: { href: "https://mesh.example/?gotonode=node%2F1&viewmode=10" },
        history: { replaceState: function () {} },
        navigator: { clipboard: { writeText: function () {} } },
        setTimeout: function (handler) { timerId += 1; timers.push({ id: timerId, handler: handler, cancelled: false }); return timerId; },
        clearTimeout: function (id) { timers.forEach(function (timer) { if (timer.id === id) timer.cancelled = true; }); },
        getstore: function (key, fallback) { var value = localStorage.getItem(key); return value == null ? fallback : value; },
        putstore: function (key, value) { localStorage.setItem(key, value); },
        go: function (view) { window.xxcurrentView = Number(view); }
    };

    function flushTimers(limit) {
        var count = 0;
        while (timers.length && count < (limit || 200)) {
            var timer = timers.shift();
            if (!timer.cancelled) timer.handler();
            count += 1;
        }
        if (count >= (limit || 200)) throw new Error("Timer loop did not settle.");
    }
    function rebuildP19() {
        headers().forEach(function (header) { remove(header.id); });
        remove("native");
        remove("sirk-platform-mycommands-device-page");
        p19headers.childNodes = [];
        p19pages.childNodes = [];
        var replacementNativeHeader = add(new Element("p19ph-native", "on"));
        var replacementNativePage = add(new Element("native"));
        p19headers.appendChild(replacementNativeHeader);
        p19pages.appendChild(replacementNativePage);
        plugins.classList.remove("style3x");
        plugins.classList.add("style3sel");
    }

    return {
        context: { window: window, document: document, URL: URL, Promise: Promise, console: console, navigator: window.navigator },
        window: window,
        document: document,
        localStorage: localStorage,
        pluginHandler: pluginHandler,
        flushTimers: flushTimers,
        rebuildP19: rebuildP19,
        mountCount: function () { return mountCount; },
        mountedHosts: mountedHosts
    };
}

var env = createEnvironment();
vm.runInNewContext(fs.readFileSync(path.join(root, "public", "shared", "module-shell.js"), "utf8"), env.context, { filename: "module-shell.js" });

assert.deepStrictEqual(
    JSON.parse(JSON.stringify(env.window.SirkPlatformModuleShell.routeState(10, "sirk-platform-mycommands-device-page", "sirk-platform-mycommands-device-page", "sirk-platform-mycommands-device-page"))),
    { pluginView: false, commandsRequested: true, commandsActive: false },
    "A remembered nested page must not select Commands outside native view 19."
);

var module = env.window.SirkPlatformModuleShell.create({
    key: "mycommands",
    title: "My Commands",
    menuTitle: "My Commands",
    showInMenu: false,
    deviceTab: {
        title: "Commands",
        pageId: "sirk-platform-mycommands-device-page",
        topTabId: "MainDevSirkPlatform-Commands"
    },
    buttons: {},
    tabs: [],
    render: function () { return Promise.resolve(); }
});
module.initialize({ config: {} });
env.flushTimers();

var commandsTab = env.document.getElementById("MainDevSirkPlatform-Commands");
var nativePluginsTab = env.document.getElementById("MainDevPlugins");
assert.ok(commandsTab, "Commands top tab must be created.");
assert.ok(commandsTab.classList.contains("style3x"), "Commands must start unselected in native view 10.");
assert.ok(nativePluginsTab.classList.contains("style3x"), "SIRK must preserve the initial native Plugins tab style.");
assert.ok(env.document.getElementById("MainDevDesktop").classList.contains("style3sel"), "The native active tab must remain selected.");

env.localStorage.setItem("_curPluginPage", "sirk-platform-mycommands-device-page");
env.pluginHandler.callPluginPage(
    "sirk-platform-mycommands-device-page",
    env.document.getElementById("p19ph-sirk-platform-mycommands-device-page")
);
env.window.xxcurrentView = 10;
module.onNativePageStart(10);
env.flushTimers();

assert.notStrictEqual(env.localStorage.getItem("_curPluginPage"), "sirk-platform-mycommands-device-page", "Leaving view 19 must restore a native plugin page.");
assert.ok(!env.document.getElementById("p19ph-sirk-platform-mycommands-device-page").classList.contains("on"), "The hidden Commands nested header must not stay active.");
assert.ok(commandsTab.classList.contains("style3x"), "Commands must be unselected when another host tab is active.");
assert.ok(nativePluginsTab.classList.contains("style3x"), "Normalizing Commands outside view 19 must not change the native Plugins tab style.");
assert.ok(env.document.getElementById("MainDevDesktop").classList.contains("style3sel"), "Normalizing Commands must not clear the native selected host tab.");

env.window.xxcurrentView = 19;
nativePluginsTab.classList.remove("style3x");
nativePluginsTab.classList.add("style3sel");
env.localStorage.setItem("_curPluginPage", "sirk-platform-mycommands-device-page");
module.onDeviceRefreshEnd("node/1");
env.pluginHandler.callPluginPage(
    "sirk-platform-mycommands-device-page",
    env.document.getElementById("p19ph-sirk-platform-mycommands-device-page")
);
env.flushTimers();

assert.strictEqual(env.mountCount(), 1, "Commands must mount after native view 19 restoration.");
assert.ok(commandsTab.classList.contains("style3sel"), "Commands must select its own custom tab in view 19.");
assert.ok(nativePluginsTab.classList.contains("style3x"), "Commands must clear a stale native Plugins selected state while active.");
assert.ok(!nativePluginsTab.classList.contains("style3sel"), "Commands and Plugins must never remain visually selected together.");

var firstHost = env.document.getElementById("sirk-platform-mycommands-device-page");
env.rebuildP19();
env.localStorage.setItem("_curPluginPage", "sirk-platform-mycommands-device-page");
module.onDeviceRefreshEnd("node/1");
env.pluginHandler.callPluginPage(
    "sirk-platform-mycommands-device-page",
    env.document.getElementById("p19ph-sirk-platform-mycommands-device-page")
);
env.flushTimers();

var secondHost = env.document.getElementById("sirk-platform-mycommands-device-page");
assert.notStrictEqual(secondHost, firstHost, "MeshCentral refresh must replace the nested page host.");
assert.strictEqual(env.mountCount(), 2, "The replacement host created by F5 must be remounted exactly once.");
assert.ok(secondHost.childNodes.length > 0, "The restored Commands page must contain mounted content.");
assert.ok(commandsTab.classList.contains("style3sel"), "Commands must remain selected after F5 restoration.");
assert.ok(nativePluginsTab.classList.contains("style3x"), "F5 reconciliation must clear a native Plugins selection restored by MeshCentral.");
assert.ok(!nativePluginsTab.classList.contains("style3sel"), "F5 must not leave a double-selected Commands/Plugins header.");

env.document.getElementById("MainDevPlugins").dispatch("mousedown", {});
env.flushTimers();
assert.strictEqual(env.localStorage.getItem("_curPluginPage"), "native", "Clicking native Plugins must restore its native nested page.");
assert.ok(env.document.getElementById("p19ph-native").classList.contains("on"), "Native Plugins content must become active even when go(19) would early-return.");
assert.ok(nativePluginsTab.classList.contains("style3sel"), "Native Plugins must become visually selected after its click path wins view 19.");
assert.ok(!nativePluginsTab.classList.contains("style3x"), "Native Plugins must not keep the unselected class while active.");
assert.ok(commandsTab.classList.contains("style3x"), "Commands must be unselected after opening native Plugins.");

commandsTab.onmouseup({});
env.flushTimers();
assert.strictEqual(env.localStorage.getItem("_curPluginPage"), "sirk-platform-mycommands-device-page", "Returning to Commands must restore the Commands nested page.");
assert.ok(commandsTab.classList.contains("style3sel"), "Returning to Commands must reselect the custom tab.");
assert.ok(nativePluginsTab.classList.contains("style3x"), "Returning to Commands must deselect native Plugins again.");
assert.ok(!nativePluginsTab.classList.contains("style3sel"), "The Commands round trip must end with exactly one selected header tab.");

console.log("Commands device lifecycle keeps Commands and native Plugins selection mutually exclusive: OK");

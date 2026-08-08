"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

function ClassList(element) {
    this.element = element;
    this.values = [];
}
ClassList.prototype.add = function () {
    for (var i = 0; i < arguments.length; i += 1) {
        var value = String(arguments[i]);
        if (this.values.indexOf(value) < 0) this.values.push(value);
    }
};
ClassList.prototype.remove = function () {
    for (var i = 0; i < arguments.length; i += 1) {
        var value = String(arguments[i]);
        var index = this.values.indexOf(value);
        if (index >= 0) this.values.splice(index, 1);
    }
};
ClassList.prototype.contains = function (value) { return this.values.indexOf(String(value)) >= 0; };
ClassList.prototype.toggle = function (value, enabled) {
    if (enabled === true) this.add(value);
    else if (enabled === false) this.remove(value);
    else if (this.contains(value)) this.remove(value); else this.add(value);
};
ClassList.prototype.toString = function () { return this.values.join(" "); };

function Style() { this.cssText = ""; this.values = {}; }
Style.prototype.setProperty = function (name, value) { this.values[name] = String(value); };
Style.prototype.removeProperty = function (name) { delete this.values[name]; };

function Element(tagName) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.id = "";
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.style = new Style();
    this.hidden = false;
    this.textContent = "";
    this.classList = new ClassList(this);
}
Object.defineProperty(Element.prototype, "className", {
    get: function () { return this.classList.toString(); },
    set: function (value) { this.classList.values = String(value || "").split(/\s+/).filter(Boolean); }
});
Object.defineProperty(Element.prototype, "firstChild", { get: function () { return this.children[0] || null; } });
Object.defineProperty(Element.prototype, "firstElementChild", { get: function () { return this.children[0] || null; } });
Object.defineProperty(Element.prototype, "nextElementSibling", {
    get: function () {
        if (!this.parentNode) return null;
        var index = this.parentNode.children.indexOf(this);
        return index >= 0 ? this.parentNode.children[index + 1] || null : null;
    }
});
Element.prototype.setAttribute = function (name, value) {
    this.attributes[name] = String(value);
    if (name === "id") this.id = String(value);
    if (name === "class") this.className = value;
};
Element.prototype.getAttribute = function (name) {
    if (name === "id") return this.id || null;
    if (name === "class") return this.className || null;
    return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
};
Element.prototype.hasAttribute = function (name) { return this.getAttribute(name) != null; };
Element.prototype.removeAttribute = function (name) {
    delete this.attributes[name];
    if (name === "id") this.id = "";
    if (name === "class") this.className = "";
};
Element.prototype.appendChild = function (child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    this.children.push(child);
    child.parentNode = this;
    return child;
};
Element.prototype.insertBefore = function (child, reference) {
    if (child.parentNode) child.parentNode.removeChild(child);
    var index = reference ? this.children.indexOf(reference) : -1;
    if (index < 0) this.children.push(child); else this.children.splice(index, 0, child);
    child.parentNode = this;
    return child;
};
Element.prototype.removeChild = function (child) {
    var index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
};
Element.prototype.cloneNode = function (deep) {
    var copy = new Element(this.tagName);
    copy.className = this.className;
    copy.style.cssText = this.style.cssText;
    Object.keys(this.style.values).forEach(function (key) { copy.style.values[key] = this.style.values[key]; }, this);
    Object.keys(this.attributes).forEach(function (key) { copy.attributes[key] = this.attributes[key]; }, this);
    if (deep) this.children.forEach(function (child) { copy.appendChild(child.cloneNode(true)); });
    return copy;
};
Element.prototype.querySelectorAll = function (selector) { return queryAll(this, selector); };
Element.prototype.querySelector = function (selector) { return this.querySelectorAll(selector)[0] || null; };

function descendants(root) {
    var result = [];
    (root.children || []).forEach(function walk(child) {
        result.push(child);
        (child.children || []).forEach(walk);
    });
    return result;
}

function matches(element, selector) {
    selector = selector.trim();
    if (!selector) return false;
    if (selector.charAt(0) === ".") return element.classList.contains(selector.slice(1));
    if (selector.charAt(0) === "#") return element.id === selector.slice(1);
    var idPrefix = selector.match(/^\[id\^=['\"]([^'\"]+)['\"]\](?:\[data-sirk-platform-viewmode=['\"]([^'\"]+)['\"]\])?$/);
    if (idPrefix) {
        if (element.id.indexOf(idPrefix[1]) !== 0) return false;
        return idPrefix[2] == null || element.getAttribute("data-sirk-platform-viewmode") === idPrefix[2];
    }
    if (/^[a-z]+$/i.test(selector)) return element.tagName.toLowerCase() === selector.toLowerCase();
    return false;
}

function queryAll(root, selector) {
    var output = [];
    String(selector || "").split(",").forEach(function (part) {
        part = part.trim();
        if (!part) return;
        var space = part.indexOf(" ");
        if (space > 0) {
            var hostSelector = part.slice(0, space);
            var childSelector = part.slice(space + 1);
            var hosts = [root].concat(descendants(root)).filter(function (item) { return matches(item, hostSelector); });
            hosts.forEach(function (host) {
                descendants(host).forEach(function (item) {
                    if (matches(item, childSelector) && output.indexOf(item) < 0) output.push(item);
                });
            });
            return;
        }
        [root].concat(descendants(root)).forEach(function (item) {
            if (matches(item, part) && output.indexOf(item) < 0) output.push(item);
        });
    });
    return output;
}

var html = new Element("html");
var mainHost = new Element("div"); mainHost.id = "MainMenuSpan";
var leftHost = new Element("div"); leftHost.id = "page_leftbar";
var page = new Element("div"); page.id = "p1";
var titleHost = new Element("div"); titleHost.id = "p1title";
var heading = new Element("h1"); heading.textContent = "My Devices"; titleHost.appendChild(heading);
var nativeContent = new Element("div"); nativeContent.id = "NativeDeviceList";
page.appendChild(titleHost); page.appendChild(nativeContent);
html.appendChild(mainHost); html.appendChild(leftHost); html.appendChild(page);

var mainDevices = new Element("div"); mainDevices.id = "MainMenuMyDevices"; mainDevices.className = "fullselect"; mainHost.appendChild(mainDevices);
var leftDevices = new Element("div"); leftDevices.id = "LeftMenuMyDevices"; leftDevices.className = "lbbutton lbbuttonsel";
var devicesIcon = new Element("div"); devicesIcon.className = "lbtg lb2"; leftDevices.appendChild(devicesIcon); leftHost.appendChild(leftDevices);
var thirdParty = new Element("div"); thirdParty.id = "LeftMenuThirdParty"; thirdParty.className = "lbbutton"; leftHost.appendChild(thirdParty);

var document = {
    documentElement: html,
    title: "MeshCentral",
    createElement: function (tag) { return new Element(tag); },
    getElementById: function (id) { return [html].concat(descendants(html)).filter(function (item) { return item.id === id; })[0] || null; },
    querySelectorAll: function (selector) { return queryAll(html, selector); },
    querySelector: function (selector) { return this.querySelectorAll(selector)[0] || null; }
};

var context = {
    console: console,
    document: document,
    navigator: { clipboard: { writeText: function () {} } },
    URL: URL,
    URLSearchParams: URLSearchParams,
    Promise: Promise,
    setTimeout: function (fn) { fn(); return 1; },
    clearTimeout: function () {},
    window: {
        document: document,
        location: { href: "https://mesh.example.test/" },
        history: { replaceState: function (_state, _title, url) { this.lastUrl = url; } },
        xxcurrentView: 1,
        SharedToolbarConfig: { definitions: { collapse: {} } },
        SharedPage: {
            mount: function (options) {
                var root = options.container;
                var primary = new Element("section");
                var secondary = new Element("section");
                var details = new Element("section");
                primary.className = "mc-shared-primary";
                secondary.className = "mc-shared-secondary";
                details.className = "mc-shared-details";
                root.appendChild(primary);
                root.appendChild(secondary);
                root.appendChild(details);
                return {
                    root: root,
                    primary: primary,
                    secondary: secondary,
                    details: details,
                    layout: { clear: function () {}, isCollapsed: function () { return false; }, toggleCollapsed: function () {} },
                    toolbar: { buttons: {}, setIcon: function () {}, setTitle: function () {}, clearSearch: function () {} },
                    tabs: { select: function () {} },
                    frontend: "meshcentral"
                };
            }
        }
    }
};
context.window.window = context.window;
context.window.URL = URL;
context.window.URLSearchParams = URLSearchParams;
context.window.Promise = Promise;
context.window.setTimeout = context.setTimeout;
context.window.clearTimeout = context.clearTimeout;

var root = path.join(__dirname, "..");
vm.runInNewContext(fs.readFileSync(path.join(root, "public", "shared", "core.js"), "utf8"), context);
vm.runInNewContext(fs.readFileSync(path.join(root, "public", "shared", "module-shell.js"), "utf8"), context);

var shell = context.window.SirkPlatformModuleShell;
var approval = shell.create({ key: "approvalcenter", title: "Approval Center", viewMode: 105, render: function () {} });
var scripts = shell.create({ key: "myscripts", title: "My Scripts", viewMode: 101, render: function () {} });
var modules = [approval, scripts];

context.window.go = function (view) {
    modules.forEach(function (module) { module.onNativePageStart(view); });
    mainDevices.classList.remove("fullselect", "semiselect", "active");
    leftDevices.classList.remove("lbbuttonsel", "lbbuttonsel2", "active");
    thirdParty.classList.remove("lbbuttonsel", "lbbuttonsel2", "active");
    if (Number(view) === 1) {
        mainDevices.classList.add("fullselect");
        leftDevices.classList.add("lbbuttonsel");
    }
    context.window.xxcurrentView = Number(view);
    modules.forEach(function (module) { module.onNativePageEnd(view); });
};

approval.initialize({ config: {} });
scripts.initialize({ config: {} });

approval.open();
var approvalLeft = document.getElementById("LeftMenuSirkPlatform-approvalcenter");
var scriptsLeft = document.getElementById("LeftMenuSirkPlatform-myscripts");
assert.ok(approvalLeft.classList.contains("lbbuttonsel"), "Approval Center must become the selected native Classic left-menu entry.");
assert.ok(!leftDevices.classList.contains("lbbuttonsel"), "Devices must lose Classic selection after Approval Center opens.");
assert.strictEqual(context.window.SirkPlatformCore.activePlugin, approval, "Approval Center must own the shared workspace.");

scripts.open();
assert.ok(scriptsLeft.classList.contains("lbbuttonsel"), "My Scripts must become selected when switching directly from Approval Center.");
assert.ok(!approvalLeft.classList.contains("lbbuttonsel"), "Approval Center must be unselected after switching to My Scripts.");
assert.ok(!leftDevices.classList.contains("lbbuttonsel"), "Devices must remain unselected while My Scripts is active.");
assert.strictEqual(context.window.SirkPlatformCore.activePlugin, scripts, "My Scripts must replace Approval Center as workspace owner.");

context.window.go(1);
assert.ok(leftDevices.classList.contains("lbbuttonsel"), "Native Classic Devices must be restored after leaving SIRK.");
assert.ok(!scriptsLeft.classList.contains("lbbuttonsel"), "My Scripts must be unselected after native navigation.");
assert.strictEqual(context.window.SirkPlatformCore.activePlugin, null, "No SIRK module may stay active after native navigation.");

approval.open();
context.window.go(1);
thirdParty.classList.add("lbbuttonsel2");
modules.forEach(function (module) { module.onNativePageEnd(901); });
assert.ok(thirdParty.classList.contains("lbbuttonsel2"), "Inactive SIRK modules must not clear another plugin's selected menu entry.");
assert.ok(!approvalLeft.classList.contains("lbbuttonsel"), "Approval Center must remain inactive after another plugin opens.");

console.log("Functional SIRK/native/third-party Classic menu lifecycle: OK");

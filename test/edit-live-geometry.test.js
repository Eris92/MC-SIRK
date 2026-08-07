"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var source = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "toolbar-api.js"),
    "utf8"
);
var toolbarCss = fs.readFileSync(
    path.join(__dirname, "..", "public", "shared", "ui", "toolbar.css"),
    "utf8"
);

function classList(initial) {
    var values = Object.create(null);
    (initial || []).forEach(function (name) { values[name] = true; });
    return {
        contains: function (name) { return values[name] === true; },
        toggle: function (name, force) {
            if (force === true) values[name] = true;
            else if (force === false) delete values[name];
            else if (values[name]) delete values[name];
            else values[name] = true;
            return values[name] === true;
        }
    };
}

function styleStore() {
    var values = Object.create(null);
    return {
        values: values,
        setProperty: function (name, value) { values[name] = value; },
        removeProperty: function (name) { delete values[name]; }
    };
}

var primaryWidth = 218;
var secondaryWidth = 306;
var layout = { classList: classList([]) };
var primary = {
    getBoundingClientRect: function () { return { width: primaryWidth }; }
};
function actionButton() {
    return { getBoundingClientRect: function () { return { width: 36 }; } };
}
var actionGroup = { children: [actionButton(), actionButton(), actionButton(), actionButton()] };
var secondary = {
    getBoundingClientRect: function () { return { width: secondaryWidth }; },
    querySelector: function () { return null; }
};
var pageStyle = styleStore();
var page = {
    classList: classList(["mc-shared-page", "mc-shared-page-mycommands"]),
    style: pageStyle,
    querySelector: function (selector) {
        if (selector === ".mc-shared-layout") return layout;
        if (selector === ".mc-shared-primary") return primary;
        if (selector === ".mc-shared-secondary") return secondary;
        return null;
    },
    querySelectorAll: function (selector) {
        return selector === ".mc-tree-script-actions" ? [actionGroup] : [];
    }
};
function toolbarButton() {
    return {
        classList: classList([]),
        setAttribute: function () {},
        querySelector: function () { return null; }
    };
}
var manageButton = toolbarButton();
var multiButton = toolbarButton();
var toolbarRoot = {
    closest: function (selector) { return selector === ".mc-shared-page" ? page : null; }
};
var appendedStyles = [];
var frameQueue = [];
var context = {
    Math: Math,
    Number: Number,
    String: String,
    parseFloat: parseFloat,
    isFinite: isFinite,
    console: console,
    document: {
        getElementById: function () { return null; },
        createElement: function () { return {}; },
        head: { appendChild: function (node) { appendedStyles.push(node); } },
        documentElement: { appendChild: function (node) { appendedStyles.push(node); } }
    },
    window: {
        requestAnimationFrame: function (callback) {
            frameQueue.push(callback);
            return frameQueue.length;
        },
        getComputedStyle: function () { return { columnGap: "4px", gap: "4px" }; }
    }
};
context.window.window = context.window;

function flushFrames() {
    while (frameQueue.length) frameQueue.shift()();
}

vm.runInNewContext(source, context, { filename: "toolbar-api.js" });

var api = context.window.SharedToolbarApi.create({
    root: toolbarRoot,
    buttons: { manage: manageButton, multi: multiButton },
    groups: {},
    state: {},
    searchInput: {},
    searchWrap: {}
});

api.setActive("manage", true);
flushFrames();
assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], "218px",
    "Edit must retain the exact rendered first-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], "306px",
    "Edit must retain the pre-mode second-column width as the non-cumulative baseline.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], "156px",
    "Four 36 px Edit buttons and three 4 px gaps define the exact Edit action track.");
assert.strictEqual(pageStyle.values["--sirk-mode-row-width"], undefined,
    "Edit must not preserve a separate old row width that pushes actions outside the second column.");
assert.strictEqual(page.classList.contains("is-edit-mode"), true,
    "Edit class must be active after geometry capture.");

primaryWidth = 300;
secondaryWidth = 620;
api.setActive("manage", true);
flushFrames();
assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], "218px",
    "Repeated toolbar synchronization must not recapture expanded geometry.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], "306px",
    "Repeated toolbar synchronization must keep the original second-column baseline without cumulative growth.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], "156px",
    "Repeated action measurement must remain stable.");

api.setActive("manage", false);
assert.strictEqual(page.classList.contains("is-edit-mode"), false,
    "Closing Edit must remove the mode class.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], undefined,
    "Closing Edit must release action geometry.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], undefined,
    "Closing Edit must release the captured secondary baseline so the normal layout is restored.");

primaryWidth = 218;
secondaryWidth = 306;
actionGroup.children = [actionButton()];
api.setActive("multi", true);
flushFrames();
assert.strictEqual(page.classList.contains("is-multi-mode"), true,
    "Multi must activate normally.");
assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], "218px",
    "Multi must preserve the normal first-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], "306px",
    "Multi must preserve the normal second-column width.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], "36px",
    "One 36 px Multi action defines the exact Multi action track without consuming text width.");
api.setActive("multi", false);

layout.classList.toggle("is-collapsed", true);
actionGroup.children = [actionButton(), actionButton(), actionButton(), actionButton()];
api.setActive("manage", true);
flushFrames();
assert.strictEqual(page.classList.contains("is-edit-mode"), true,
    "Edit must activate while the first column is already collapsed.");
assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], undefined,
    "Collapsed Edit must keep the canonical collapsed first-column track instead of capturing a fake expanded width.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], "306px",
    "Collapsed Edit must preserve the same baseline before CSS adds the action rail.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], "156px",
    "Collapsed Edit must still expose all action icons within the second column.");
api.setActive("manage", false);

assert.ok(toolbarCss.indexOf(".mc-shared-page:is(.is-edit-mode,.is-multi-mode) .mc-shared-layout{grid-template-columns:var(--sirk-mode-primary-width,220px) calc(var(--sirk-mode-secondary-width,340px) + var(--sirk-actions-width) + var(--sirk-actions-column-gap)) var(--sirk-edit-details-track)") >= 0,
    "Edit and Multi must expand outside the captured text track by the exact action track plus column gap.");
assert.ok(toolbarCss.indexOf("grid-template-columns:minmax(0,1fr) var(--sirk-actions-width)") >= 0,
    "Action icons must consume space inside the existing second-column row.");
assert.ok(toolbarCss.indexOf("calc(var(--sirk-mode-secondary-width,340px) + var(--sirk-actions-width) + var(--sirk-actions-column-gap))") >= 0,
    "Both action modes must preserve the captured text width by adding action track and its column gap outside it.");
assert.strictEqual(appendedStyles.length, 0,
    "Toolbar geometry must not inject a runtime stylesheet.");

console.log("Edit and Multi preserve text width while reserving exact external action tracks: OK");

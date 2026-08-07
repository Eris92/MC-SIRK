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

var rowWidth = 282;
var primaryWidth = 218;
var secondaryWidth = 306;
var row = {
    getBoundingClientRect: function () { return { width: rowWidth }; }
};
var layout = {
    classList: classList([])
};
var primary = {
    getBoundingClientRect: function () { return { width: primaryWidth }; }
};
function actionButton() {
    return {
        getBoundingClientRect: function () { return { width: 36 }; }
    };
}
var actionGroup = {
    children: [actionButton(), actionButton(), actionButton(), actionButton()]
};
var secondary = {
    getBoundingClientRect: function () { return { width: secondaryWidth }; },
    querySelector: function (selector) {
        return selector === ".mc-tree-script-row" ? row : null;
    }
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
    closest: function (selector) {
        return selector === ".mc-shared-page" ? page : null;
    }
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
        getComputedStyle: function () {
            return { columnGap: "4px", gap: "4px" };
        }
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
    "Edit must retain the exact rendered normal second-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-row-width"], "282px",
    "Edit must retain the exact rendered script-row width so wrapping does not change.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], "172px",
    "Four 36 px Edit buttons, three 4 px gaps and the safety gutter must fit without clipping.");
assert.strictEqual(page.classList.contains("is-edit-mode"), true,
    "Edit class must be added after the normal geometry is captured.");
assert.strictEqual(page.__sirkModeGeometryCaptured, true,
    "The captured normal geometry must not be overwritten by later Edit rerenders.");

primaryWidth = 300;
secondaryWidth = 620;
rowWidth = 430;
api.setActive("manage", true);
flushFrames();
assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], "218px",
    "Repeated toolbar synchronization must not recapture the already expanded Edit layout.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], "306px",
    "Repeated toolbar synchronization must keep the original normal second-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-row-width"], "282px",
    "Repeated toolbar synchronization must keep the original normal text width.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], "172px",
    "Repeated Edit action measurement must remain stable.");

api.setActive("manage", false);
assert.strictEqual(page.classList.contains("is-edit-mode"), false,
    "Closing Edit must remove the mode class.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], undefined,
    "Closing Edit must release the measured action width.");

primaryWidth = 218;
secondaryWidth = 306;
rowWidth = 282;
actionGroup.children = [actionButton()];
api.setActive("multi", true);
flushFrames();

assert.strictEqual(page.classList.contains("is-multi-mode"), true,
    "Multi class must be added after the normal geometry is captured.");
assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], "218px",
    "Multi must keep the exact same first-column width as normal mode.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], "306px",
    "Multi must keep the exact normal second-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-row-width"], "282px",
    "Multi must keep script label wrapping identical to normal mode.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], "52px",
    "One 36 px Multi button and the 16 px safety gutter must fit without changing text width.");

api.setActive("multi", false);
assert.strictEqual(page.classList.contains("is-multi-mode"), false,
    "Closing Multi must remove the mode class.");
assert.strictEqual(pageStyle.values["--sirk-mode-primary-width"], undefined,
    "Closing the last active mode must release the captured first-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-secondary-width"], undefined,
    "Closing the last active mode must release the captured second-column width.");
assert.strictEqual(pageStyle.values["--sirk-mode-row-width"], undefined,
    "Closing the last active mode must release the captured text width.");
assert.strictEqual(pageStyle.values["--sirk-actions-width"], undefined,
    "Closing Multi must release the measured action width.");

assert.ok(toolbarCss.indexOf(".mc-shared-page:is(.is-edit-mode,.is-multi-mode) .mc-tree-script-actions button") >= 0 &&
    toolbarCss.indexOf("box-sizing:border-box") >= 0,
    "Static toolbar CSS must keep Edit and Multi button borders and padding inside the reserved width.");
assert.strictEqual(appendedStyles.length, 0,
    "Toolbar geometry must not inject a runtime stylesheet; Edit and Multi styles are static assets.");
console.log("Edit and Multi live geometry with measured action widths: OK");

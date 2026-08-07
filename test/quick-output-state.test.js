"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var pluginMain = fs.readFileSync(path.join(root, "plugin-main.js"), "utf8");
var desktop = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");
var css = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.css"), "utf8");

assert.ok(pluginMain.indexOf('["sirk-platform-desktop-commands", "desktop-commands.js"]') >= 0,
    "The canonical Quick renderer must load during native startup.");
assert.strictEqual(pluginMain.indexOf("quick-output-state.js"), -1,
    "Startup must not load a second Quick output-state controller.");

assert.ok(desktop.indexOf('PREFERENCES_KEY = "sirkPlatform.mycommands.preferences"') >= 0 &&
    desktop.indexOf('detailsCollapsed: preferences.quickDetailsCollapsed === true') >= 0,
    "Quick output visibility must live in the shared My Commands preference store.");
assert.strictEqual(desktop.indexOf("quickOutputAttention"), -1,
    "Unseen-result attention must remain transient runtime state rather than a persisted preference.");
assert.ok(desktop.indexOf('outputAttention: false') >= 0 && desktop.indexOf('outputPending: false') >= 0,
    "The canonical renderer must keep explicit transient output attention and pending state.");

assert.ok(desktop.indexOf('function writeDetailsCollapsed(value)') >= 0 &&
    desktop.indexOf('writePreferences({ quickDetailsCollapsed: state.detailsCollapsed })') >= 0 &&
    desktop.indexOf('if (!state.detailsCollapsed) state.outputAttention = false') >= 0,
    "The one output visibility mutator must persist collapse state and acknowledge output when opened.");
assert.ok(desktop.indexOf('function setOutput(panel, value, isError)') >= 0 &&
    desktop.indexOf('if (state.detailsCollapsed && (state.outputPending || changed)) state.outputAttention = true') >= 0,
    "Completed output must raise attention only when the details pane is hidden.");
assert.ok(desktop.indexOf('function transientOutput(value)') >= 0 &&
    desktop.indexOf('else if (transientOutput(next))') >= 0 &&
    desktop.indexOf('state.outputPending = true') >= 0 &&
    desktop.indexOf('state.outputPending = false') >= 0,
    "Loading/submission messages must mark output as pending and only final output may clear pending and raise unseen-result attention.");
assert.ok(desktop.indexOf('button.classList.toggle("has-output-attention", state.outputAttention === true)') >= 0,
    "The canonical details button must render unseen-output attention directly from renderer state.");

var renderStart = desktop.indexOf("function render(panel)");
var renderEnd = desktop.indexOf("function load(panel)", renderStart);
var render = desktop.slice(renderStart, renderEnd);
assert.ok(render.indexOf('browser.classList.toggle("is-details-collapsed", state.detailsCollapsed)') >= 0 &&
    render.indexOf('panel.appendChild(browser)') > render.indexOf('browser.classList.toggle("is-details-collapsed", state.detailsCollapsed)'),
    "Persisted output visibility must be applied before the browser reaches the live DOM.");
assert.ok(css.indexOf('.sirk-quick-command-browser.is-details-collapsed .sirk-quick-command-details{display:none!important}') >= 0,
    "Static Quick CSS must hide the details pane from the canonical collapsed class.");

assert.ok(desktop.indexOf('function syncAvailability(wrapper)') >= 0 &&
    desktop.indexOf('if (!connected && panel) panel.hidden = true') >= 0 &&
    desktop.indexOf('if (!connected && button) button.setAttribute("aria-expanded", "false")') >= 0,
    "Leaving an active Desktop session must close Quick without a second navigation observer.");
assert.ok(desktop.indexOf('window.SirkDesktopCommands = { refresh: refreshLifecycle }') >= 0,
    "Native lifecycle refresh must remain the only external Quick lifecycle entrypoint.");

assert.strictEqual(desktop.indexOf("__sirkStableOutputPending"), -1,
    "Compatibility pending-state markers must not return.");
assert.strictEqual(desktop.indexOf("mc-sirk-quickcommands-output-hidden-v2"), -1,
    "Legacy standalone output visibility preferences must not return.");
assert.strictEqual(desktop.indexOf("data-sirk-output-hidden"), -1,
    "Renderer state/classes must be the sole output visibility contract in JavaScript.");
assert.strictEqual(desktop.indexOf("MutationObserver"), -1,
    "Quick output state must not depend on DOM or navigation observers.");

console.log("Canonical Quick output state machine: OK");

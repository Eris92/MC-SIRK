"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var desktopCss = read("public/native/desktop-commands.css");
var outputState = read("public/native/quick-output-state.js");
var lifecycle = read("public/shared/ui/settings.js");
var adapter = read("public/shared/ui/toolbar-config.js");

assert.ok(/button\.classList\.toggle\("has-output-attention", hidden && attention\(\)\)/.test(outputState),
    "Attention must only be shown while the output is hidden.");
assert.ok(outputState.indexOf('button.classList.toggle("is-active", !hidden)') >= 0 &&
    outputState.indexOf('button.setAttribute("aria-pressed", hidden ? "false" : "true")') >= 0,
    "The logical output state must remain available for behavior and accessibility.");

assert.ok(lifecycle.indexOf('button.classList.contains("sirk-quick-command-output-toggle")') >= 0 &&
    lifecycle.indexOf('button.classList.remove("is-active")') >= 0 &&
    lifecycle.indexOf('button.setAttribute("aria-pressed", "false")') >= 0,
    "The native theme lifecycle must apply a neutral visual class to Show/Hide output.");
assert.ok(lifecycle.indexOf("if (outputActive) button.classList.add(\"is-active\")") >= 0 &&
    lifecycle.indexOf('button.setAttribute("aria-pressed", outputPressed == null ? "false" : outputPressed)') >= 0,
    "Neutral styling must not destroy the logical output state.");
assert.ok(lifecycle.indexOf('button.classList.toggle("text-danger", modern && attention)') >= 0 &&
    lifecycle.indexOf('button.classList.toggle("border-danger", modern && attention)') >= 0,
    "Modern output attention must use MeshCentral's native danger classes.");
assert.ok(lifecycle.indexOf("sirk-quick-output-state-style") >= 0 &&
    lifecycle.indexOf("sirk-quick-command-output-toggle\\.has-output-attention") >= 0,
    "Historical hard-coded output attention colors must be removed from generated styles.");
assert.ok(adapter.indexOf('syncOwnedClasses(element, ["btn", "btn-" +') >= 0 &&
    adapter.indexOf('syncOwnedClasses(element, [selected ? "style10s" : "style10"])') >= 0,
    "Output actions must return to native Modern or Classic button styling.");
assert.ok(adapter.indexOf("function syncOwnedClasses(element, desired)") >= 0,
    "Output action styling must not reset valid native classes and trigger repaint loops.");

[
    [desktopCss, "--sdc-focus", "Quick-owned focus palette"],
    [desktopCss, "has-output-attention{", "Quick-owned attention colors"],
    [desktopCss, "box-shadow:inset 3px", "Quick-only active stripe"],
    [desktopCss, "outline:1px solid currentColor", "plugin-owned active outline"]
].forEach(function (entry) {
    assert.strictEqual(entry[0].indexOf(entry[1]), -1,
        "Native Quick output contract forbids " + entry[2] + ".");
});

console.log("Quick output neutral native state and semantic attention precedence: OK");

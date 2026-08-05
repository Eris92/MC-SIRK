"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.join(__dirname, "..");
var pluginMain = fs.readFileSync(path.join(root, "plugin-main.js"), "utf8");
var controller = fs.readFileSync(path.join(root, "public", "native", "quick-output-state.js"), "utf8");

var desktopIndex = pluginMain.indexOf('["sirk-platform-desktop-commands", "desktop-commands.js"]');
var controllerIndex = pluginMain.indexOf('["sirk-platform-quick-output-state", "quick-output-state.js"]');
assert.ok(desktopIndex >= 0 && controllerIndex > desktopIndex,
    "The stable output controller must load after the native Quick Commands implementation.");

assert.ok(controller.indexOf('mc-sirk-quickcommands-output-hidden-v2') >= 0 &&
    controller.indexOf('mc-sirk-quickcommands-output-attention-v2') >= 0,
    "Quick output visibility and unseen-result attention must have dedicated state keys.");
assert.ok(controller.indexOf('writeBoolean(OLD_PREFERRED_KEY, false)') >= 0 &&
    controller.indexOf('writeBoolean(OLD_ATTENTION_KEY, false)') >= 0,
    "The conflicting legacy preference controller must be neutralized.");
assert.ok(controller.indexOf('data-sirk-output-hidden') >= 0 &&
    controller.indexOf('transition:none!important') >= 0,
    "A hidden result pane must keep fixed geometry throughout internal renders.");
assert.ok(controller.indexOf('has-output-attention') >= 0 &&
    controller.indexOf('setAttention(true)') >= 0,
    "A completed unseen result must mark the output button.");
assert.ok(controller.indexOf('if (wasHidden)') >= 0 &&
    controller.indexOf('if (actualCollapsed) result = original.call(button, event)') >= 0 &&
    controller.indexOf('if (!actualCollapsed) result = original.call(button, event)') >= 0,
    "Opening and hiding output must call the native toggle only when its internal state actually needs changing.");
assert.ok(controller.indexOf('function clearAttentionForNativeNavigation()') >= 0 &&
    controller.indexOf('setAttention(false)') >= 0 &&
    controller.indexOf('acknowledgeCurrentOutput(panel)') >= 0,
    "Changing a native tab must clear attention and acknowledge the disappearing output.");
assert.ok(controller.indexOf('panel.__sirkStableOutputPending = false') >= 0 &&
    controller.indexOf('runtime.onNativePageStart = function ()') >= 0 &&
    controller.indexOf('original.apply(runtime, arguments)') >= 0,
    "The navigation reset must clear pending state while preserving the original runtime lifecycle.");
assert.ok(controller.indexOf('attributeFilter') < 0 &&
    controller.indexOf('MainDev') < 0 && controller.indexOf('p19') < 0,
    "The controller must not observe style/class changes or touch device-tab routing.");

console.log("Stable Quick output state controller: OK");

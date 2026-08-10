from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, value):
    Path(path).write_text(value, encoding="utf-8")


def replace_once(path, old, new):
    source = read(path)
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one exact match, found {count}")
    write(path, source.replace(old, new, 1))


def sub_once(path, pattern, replacement):
    source = read(path)
    value, count = re.subn(pattern, replacement, source, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex match, found {count}: {pattern[:80]}")
    write(path, value)


replace_once(
    "public/shared/ui/parameter-dialog.js",
    '    function defaultValue(variable) {\n        return text(variable && variable.defaultValue == null ? "" : variable.defaultValue);\n    }',
    '    function defaultValue(variable) {\n        return text(variable && variable.defaultValue != null ? variable.defaultValue : "");\n    }'
)

replace_once(
    "admin.js",
    '        "shared-ui/results.js": ["public/shared/ui/results.js", "text/javascript; charset=utf-8"],\n        "shared-ui/script-tools.js": ["public/shared/ui/script-tools.js", "text/javascript; charset=utf-8"],\n        "shared-ui/page.js": ["public/shared/ui/page.js", "text/javascript; charset=utf-8"],',
    '        "shared-ui/results.js": ["public/shared/ui/results.js", "text/javascript; charset=utf-8"],\n        "shared-ui/script-tools.js": ["public/shared/ui/script-tools.js", "text/javascript; charset=utf-8"],\n        "shared-ui/parameter-dialog.js": ["public/shared/ui/parameter-dialog.js", "text/javascript; charset=utf-8"],\n        "shared-ui/page.js": ["public/shared/ui/page.js", "text/javascript; charset=utf-8"],'
)

replace_once(
    "plugin-main.js",
    '''                var prepareReady = window.SirkPlatformRuntime.prepare(bootstrapReady);\n                var dependenciesReady = Promise.all(deferredScripts.map(function (item) {\n                    return load(item[0], asset(item[1]));\n                }));\n                var initializeReady = window.SirkPlatformRuntime.initialize(dependenciesReady);''',
    '''                var prepareReady = window.SirkPlatformRuntime.prepare(bootstrapReady);\n                var deferredReady = deferredScripts.filter(function (item) {\n                    return item[0] !== "sirk-platform-script-tools" && item[0] !== "sirk-platform-desktop-commands";\n                }).map(function (item) {\n                    return load(item[0], asset(item[1]));\n                });\n                var scriptToolsReady = load("sirk-platform-script-tools", asset("shared-ui/script-tools.js"));\n                var parameterDialogReady = scriptToolsReady.then(function () {\n                    return load("sirk-platform-parameter-dialog", asset("shared-ui/parameter-dialog.js"));\n                });\n                deferredReady.push(parameterDialogReady.then(function () {\n                    return load("sirk-platform-desktop-commands", asset("desktop-commands.js"));\n                }));\n                var dependenciesReady = Promise.all(deferredReady);\n                var initializeReady = window.SirkPlatformRuntime.initialize(dependenciesReady);'''
)

replace_once(
    "public/INDEX.md",
    "public/shared/ui/results.js\npublic/shared/ui/script-tools.js\npublic/shared/ui/tree.js",
    "public/shared/ui/results.js\npublic/shared/ui/script-tools.js\npublic/shared/ui/parameter-dialog.js\npublic/shared/ui/tree.js"
)
replace_once(
    "public/INDEX.md",
    "- `results.js` — render wyników i CSV;\n- `script-tools.js` — Edit/Multi/credentials dla skryptów.",
    "- `results.js` — render wyników i CSV;\n- `script-tools.js` — Edit/Multi/credentials oraz publiczny shared interaction contract dla skryptów;\n- `parameter-dialog.js` — natywny MeshCentral execution-input lifecycle i wspólne controls text/select/switch/user/asset, rozszerzające `SharedScriptTools`."
)

sub_once(
    "public/modules/commands/index.js",
    r"\n    function valueControls\(item, card\) \{.*?\n    \}\n\n    function renderOutput",
    "\n\n    function renderOutput"
)
replace_once(
    "public/modules/commands/index.js",
    '    function confirmExecution(item) { if (!item || item.confirmExecution !== true) return true; return window.confirm(msg("Uruchomić teraz: ", "Run now: ") + (item.label || item.name || item.path) + "?"); }\n    function commandPath(category, command)',
    '''    function confirmExecution(item) { if (!item || item.confirmExecution !== true) return true; return window.confirm(msg("Uruchomić teraz: ", "Run now: ") + (item.label || item.name || item.path) + "?"); }\n    function parameterValues(item, trigger) {\n        if (!Array.isArray(item && item.variables) || !item.variables.length) return Promise.resolve({});\n        if (!tools || typeof tools.openParameterDialog !== "function") return Promise.reject(new Error("Native MeshCentral parameter dialog is unavailable."));\n        return tools.openParameterDialog({\n            item: item, trigger: trigger,\n            primaryLabel: item.requiresApproval ? msg("Poproś o akceptację", "Request") : msg("Uruchom", "Run")\n        });\n    }\n    function commandPath(category, command)'''
)
sub_once(
    "public/modules/commands/index.js",
    r"    function showDefinition\(shell, item, autoExecute\) \{.*?\n    \}\n\n    function show\(shell, item, executeOnSelect\) \{.*?\n    \}",
    '''    function showDefinition(shell, item, autoExecute) {\n        var host = shell.state.page.details; host.innerHTML = "";\n        var card = shell.card(item.label || item.name, item.description || item.path);\n        var button = shell.element("button", "btn btn-primary mc-command-run-button", item.requiresApproval ? msg("Poproś o akceptację", "Request") : "▶ " + msg("Uruchom", "Run")); button.type = "button"; card.appendChild(button);\n        var outputHost = document.createElement("div"); outputHost.className = "mc-command-inline-result";\n        if (outputs[item.path]) renderOutput(outputHost, outputs[item.path]); else renderWaiting(outputHost, autoExecute ? msg("Uruchamianie…", "Starting…") : msg("Wybierz Uruchom, aby zobaczyć wynik.", "Select Run to see the result."));\n        card.appendChild(outputHost);\n        button.onclick = function () {\n            parameterValues(item, button).then(function (values) {\n                if (values == null) return;\n                execute(shell, item, button, values, outputHost);\n            }).catch(function (error) {\n                outputs[item.path] = error.message || String(error);\n                renderWaiting(outputHost, outputs[item.path]);\n                outputHost.classList.add("mc-shared-error");\n            });\n        };\n        host.appendChild(card); sync(shell);\n        if (autoExecute === true) window.setTimeout(function () { button.click(); }, 0);\n    }\n\n    function show(shell, item, executeOnSelect) {\n        pollSequence++;\n        if (item.kind === "command") { showDefinition(shell, item, executeOnSelect === true); return; }\n        shell.api("script", { path: item.path }).then(function (response) {\n            var script = response.script;\n            showDefinition(shell, script, executeOnSelect === true);\n        }).catch(function (error) { shell.error(shell.state.page.details, error); });\n    }'''
)
sub_once(
    "public/modules/commands/index.js",
    r"    function multi\(shell, item\) \{.*?\n    \}\n\n    function openCommandEditor",
    '''    function multi(shell, item) {\n        if (!confirmExecution(item)) return;\n        parameterValues(item, document.activeElement).then(function (values) {\n            if (values == null) return;\n            treeState.selectedScript = item.path;\n            tools.openMultiExecution(shell, item, node(shell), function (ids) {\n                var payload = { nodeIds: ids, label: item.label || item.name, variableValues: values || {}, confirmedExecution: item.confirmExecution === true, note: "" };\n                if (item.kind === "command") payload.commandId = item.commandId; else payload.scriptPath = item.path;\n                return shell.post("multi-execute", payload).then(function (response) {\n                    note(shell, msg("Wynik Multi", "Multi-device result"), JSON.stringify({ total: response.total, submitted: response.submitted, pending: response.pending, failed: response.failed }, null, 2), response.failed > 0);\n                    return response;\n                });\n            });\n        }).catch(function (error) {\n            note(shell, msg("Multi-device execution", "Multi-device execution"), error.message || String(error), true);\n        });\n    }\n\n    function openCommandEditor'''
)

sub_once(
    "public/modules/automation/index.js",
    r"\n    function variableEditor\(script\) \{.*?\n    \}\n\n    function showValidationError",
    "\n\n    function showValidationError"
)
sub_once(
    "public/modules/automation/index.js",
    r"    function submit\(shell, script, button, variables, detailsHost, resultHost, errorHost\) \{.*?\n    \}\n\n    function show\(shell, item, executeOnSelect\) \{.*?\n    \}\n\n    function actions",
    '''    function submit(shell, script, button, values, detailsHost, resultHost, errorHost) {\n        if (!confirmExecution(script)) {\n            if (errorHost) showValidationError(shell, errorHost, new Error("Execution cancelled."));\n            else switchToResult(detailsHost, resultHost, "Execution cancelled.");\n            return;\n        }\n\n        if (button) button.disabled = true;\n        switchToResult(detailsHost, resultHost, "Executing script...");\n\n        shell.post("request", {\n            scriptPath: script.path,\n            variableValues: values || {},\n            confirmedExecution: script.confirmExecution === true,\n            note: ""\n        }).then(function (response) {\n            var request = response.request || {};\n            outputs[script.path] = request;\n            renderResult(resultHost, request);\n        }).catch(function (error) {\n            var request = {\n                status: "failed",\n                title: script.label || script.name,\n                result: { message: error.message || String(error) }\n            };\n            outputs[script.path] = request;\n            renderResult(resultHost, request);\n        }).then(function () {\n            if (button) button.disabled = false;\n            sync(shell);\n        });\n    }\n\n    function show(shell, item, executeOnSelect) {\n        shell.api("script", { path: item.path }).then(function (response) {\n            var script = response.script;\n            var detailsHost = shell.state.page.details;\n            detailsHost.innerHTML = "";\n\n            var previous = outputs[script.path];\n            if (previous && executeOnSelect !== true) {\n                var previousHost = createResultHost();\n                detailsHost.appendChild(previousHost);\n                renderResult(previousHost, previous);\n                sync(shell);\n                return;\n            }\n\n            var hasVariables = Array.isArray(script.variables) && script.variables.length > 0;\n            var resultHost = createResultHost();\n\n            if (executeOnSelect === true && !hasVariables) {\n                detailsHost.appendChild(resultHost);\n                sync(shell);\n                submit(shell, script, null, {}, detailsHost, resultHost, null);\n                return;\n            }\n\n            var card = shell.card(script.label || script.name, script.description || script.path);\n            card.classList.add("mc-script-run-card");\n\n            var button = shell.element(\n                "button",\n                "btn btn-primary",\n                script.requiresApproval ? "Request" : "Run"\n            );\n            button.type = "button";\n            card.appendChild(button);\n\n            var errorHost = document.createElement("div");\n            errorHost.className = "mc-script-run-error";\n            card.appendChild(errorHost);\n            detailsHost.appendChild(card);\n\n            button.onclick = function () {\n                if (!hasVariables) {\n                    submit(shell, script, button, {}, detailsHost, resultHost, errorHost);\n                    return;\n                }\n                if (!tools || typeof tools.openParameterDialog !== "function") {\n                    switchToResult(detailsHost, resultHost, "Native MeshCentral parameter dialog is unavailable.");\n                    resultHost.classList.add("mc-shared-error");\n                    return;\n                }\n                tools.openParameterDialog({\n                    item: script, trigger: button,\n                    primaryLabel: script.requiresApproval ? "Request" : "Run"\n                }).then(function (values) {\n                    if (values == null) return;\n                    submit(shell, script, button, values, detailsHost, resultHost, errorHost);\n                }).catch(function (error) {\n                    switchToResult(detailsHost, resultHost, error.message || String(error));\n                    resultHost.classList.add("mc-shared-error");\n                });\n            };\n            sync(shell);\n            if (executeOnSelect === true && hasVariables) button.click();\n        }).catch(function (error) {\n            shell.error(shell.state.page.details, error);\n        });\n    }\n\n    function actions'''
)

sub_once(
    "public/native/desktop-commands.js",
    r"\n    function variableForm\(host, item\) \{.*?\n    \}\n\n    function submit",
    "\n\n    function submit"
)
sub_once(
    "public/native/desktop-commands.js",
    r"    function submit\(item, collect, button, panel\) \{.*?\n    \}\n\n    function waitForExecution",
    '''    function submit(item, values, button, panel) {\n        if (!desktopConnected()) {\n            setOutput(panel, text("disconnected"), true, false);\n            return;\n        }\n        if (item.confirmExecution && !window.confirm(text("confirm") + ' "' + item.label + '"?')) return;\n        var node = currentNode();\n        var payload = {\n            nodeId: nodeId(), nodeName: node.name || "", variableValues: values || {},\n            confirmedExecution: item.confirmExecution === true, desktopDirect: true, note: ""\n        };\n        if (!payload.nodeId) {\n            setOutput(panel, "Device is not ready.", true, false);\n            return;\n        }\n        if (item.kind === "command") payload.commandId = item.commandId;\n        else payload.scriptPath = item.path;\n        if (button) button.disabled = true;\n        setOutput(panel, text("loading"), false, true);\n        window.SirkPlatformCore.post("mycommands", "execute", payload).then(function (response) {\n            var request = response.request || {};\n            var result = request.result || {};\n            if (request.status === "pending") {\n                setOutput(panel, text("pending"), false, true);\n                return;\n            }\n            setOutput(panel, text("sent"), false, true);\n            if (result.id) waitForExecution(result.id, panel, 0);\n        }).catch(function (error) {\n            setOutput(panel, text("failed") + " " + (error.message || String(error)), true, true);\n        }).then(function () {\n            if (button) button.disabled = false;\n        });\n    }\n\n    function waitForExecution'''
)
sub_once(
    "public/native/desktop-commands.js",
    r"    function selectItem\(panel, item, button\) \{.*?\n    \}\n\n    function closePanel",
    '''    function selectItem(panel, item, button) {\n        function use(value) {\n            state.detail = value;\n            state.output = "";\n            state.outputError = false;\n            state.outputPending = false;\n            state.outputAttention = false;\n            render(panel);\n            if (!(value.variables || []).length) {\n                submit(value, {}, null, panel);\n                return;\n            }\n            if (!window.SharedScriptTools || typeof window.SharedScriptTools.openParameterDialog !== "function") {\n                setOutput(panel, "Native MeshCentral parameter dialog is unavailable.", true, false);\n                return;\n            }\n            window.SharedScriptTools.openParameterDialog({\n                item: value, trigger: button,\n                primaryLabel: value.requiresApproval ? "Request" : text("run")\n            }).then(function (values) {\n                if (values == null) return;\n                submit(value, values, null, panel);\n            }).catch(function (error) {\n                setOutput(panel, error.message || String(error), true, false);\n            });\n        }\n        setOutput(panel, "", false, false);\n        if (item.kind !== "script") {\n            use(item);\n            return;\n        }\n        button.disabled = true;\n        setOutput(panel, text("loading"), false, false);\n        window.SirkPlatformCore.api("mycommands", "script", null, { path: item.path }).then(function (response) {\n            var script = response.script || item;\n            button.disabled = false;\n            use({\n                kind: "script", path: script.path,\n                label: localized(script, "label") || script.label || script.name,\n                description: localized(script, "description") || script.description || "",\n                variables: script.variables || [], requiresApproval: false,\n                confirmExecution: script.confirmExecution === true\n            });\n        }).catch(function (error) {\n            button.disabled = false;\n            setOutput(panel, error.message || String(error), true, false);\n        });\n    }\n\n    function closePanel'''
)
sub_once(
    "public/native/desktop-commands.js",
    r"\n        if \(state\.detail && \(state\.detail\.variables \|\| \[\]\)\.length\) \{.*?\n        \}\n        var status = element\(\"div\", \"sirk-quick-command-status\", state\.output\);",
    '\n        var status = element("div", "sirk-quick-command-status", state.output);'
)

test = r'''"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..");
function source(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var dialog = source("public/shared/ui/parameter-dialog.js");
var commands = source("public/modules/commands/index.js");
var scripts = source("public/modules/automation/index.js");
var quick = source("public/native/desktop-commands.js");
var pluginMain = source("plugin-main.js");
var admin = source("admin.js");
var publicIndex = source("public/INDEX.md");

assert.ok(admin.indexOf('"shared-ui/parameter-dialog.js": ["public/shared/ui/parameter-dialog.js"') >= 0,
    "The parameter dialog must be served by the canonical asset router.");
assert.ok(pluginMain.indexOf('var scriptToolsReady = load("sirk-platform-script-tools", asset("shared-ui/script-tools.js"));') >= 0,
    "The loader must expose the real script-tools readiness dependency.");
assert.ok(pluginMain.indexOf('var parameterDialogReady = scriptToolsReady.then(function ()') >= 0,
    "The parameter dialog must load after SharedScriptTools.");
assert.ok(pluginMain.indexOf('deferredReady.push(parameterDialogReady.then(function ()') >= 0 &&
    pluginMain.indexOf('return load("sirk-platform-desktop-commands", asset("desktop-commands.js"));') >= 0,
    "Quick must load only after the shared parameter dialog is ready.");
assert.ok(publicIndex.indexOf("public/shared/ui/parameter-dialog.js") >= 0,
    "The frontend index must document the shared parameter dialog asset.");

assert.strictEqual(commands.indexOf("function valueControls"), -1,
    "Commands must not keep a module-local runtime-variable renderer.");
assert.strictEqual(scripts.indexOf("function variableEditor"), -1,
    "My Scripts must not keep a module-local runtime-variable renderer.");
assert.strictEqual(quick.indexOf("function variableForm"), -1,
    "Quick must not keep a module-local runtime-variable renderer.");
assert.strictEqual(quick.indexOf("sirk-quick-command-field"), -1,
    "Quick details must no longer render parameter fields inline.");
assert.strictEqual(scripts.indexOf("mc-script-run-variables"), -1,
    "My Scripts must no longer render parameter controls inline.");
assert.strictEqual(commands.indexOf("mc-script-runtime-variables"), -1,
    "Commands must no longer render parameter controls inline.");

[commands, scripts, quick].forEach(function (consumer, index) {
    assert.ok(consumer.indexOf("openParameterDialog") >= 0,
        "Execution consumer " + index + " must use the shared parameter dialog.");
});
assert.ok(commands.indexOf("mc-command-inline-result") >= 0,
    "Commands output must remain in the existing inline result host.");
assert.ok(scripts.indexOf('mc-script-live-result mc-script-result-only') >= 0,
    "My Scripts output must remain in the canonical live result host.");
assert.ok(quick.indexOf("sirk-quick-command-status") >= 0 && quick.indexOf("state.output") >= 0,
    "Quick output state and host must remain owned by Quick.");
assert.ok(commands.indexOf("variableValues: values || {}") >= 0,
    "Commands Multi must forward the values collected once by the shared dialog.");

["text", "select", "switch", "user", "asset"].forEach(function (kind) {
    assert.ok(dialog.indexOf('"' + kind + '"') >= 0, "Shared parameter dialog must support " + kind + " controls.");
});
assert.strictEqual(dialog.indexOf("window.prompt"), -1, "The shared dialog must not use browser prompt input.");
assert.strictEqual(dialog.indexOf("MutationObserver"), -1, "The shared dialog must not add a MutationObserver.");
assert.strictEqual(dialog.indexOf("setInterval("), -1, "The shared dialog must not add polling.");
assert.strictEqual(dialog.indexOf("setTimeout("), -1, "The shared dialog lifecycle must not be timer-driven.");
assert.ok(dialog.indexOf("submitting || settled") >= 0,
    "The primary action must guard against duplicate submit.");
assert.ok(dialog.indexOf("provider(record.variable, currentValues(records), item)") >= 0,
    "Dynamic controls must share one bounded provider hook.");
assert.ok(dialog.indexOf('record.kind === "asset"') >= 0 && dialog.indexOf("onUserChanged") >= 0,
    "Asset controls must be refreshable after a real parent user change.");

var focused = false;
var invalid = false;
function fakeControl(value) {
    return {
        value: value,
        checked: false,
        disabled: false,
        removeAttribute: function () { invalid = false; },
        setAttribute: function (name) { if (name === "aria-invalid") invalid = true; },
        focus: function () { focused = true; }
    };
}
var context = {
    Promise: Promise,
    String: String,
    Array: Array,
    Object: Object,
    console: console,
    document: { documentElement: { lang: "en" } },
    window: {
        SharedScriptTools: {},
        localStorage: { getItem: function () { return "en"; } }
    }
};
context.window.window = context.window;
vm.runInNewContext(dialog, context, { filename: "parameter-dialog.js" });
var contract = context.window.SharedScriptTools.parameterDialogContract;
assert.ok(contract, "The shared parameter dialog must expose a targeted pure contract for regression tests.");
assert.strictEqual(contract.controlKind({ control: "USER" }), "user");
assert.strictEqual(contract.controlKind({ control: "asset" }), "asset");
assert.strictEqual(contract.controlKind({ control: "unknown" }), "text");

var required = fakeControl("");
var flag = fakeControl("");
flag.checked = false;
var records = [
    { variable: { name: "RequiredText", label: "Required text", required: true }, kind: "text", control: required },
    { variable: { name: "Flag", required: true }, kind: "switch", control: flag }
];
var status = { className: "", textContent: "" };
assert.strictEqual(contract.validate(records, status), null, "Required empty text must block submission.");
assert.strictEqual(focused, true, "Required validation must focus the first invalid control.");
assert.strictEqual(invalid, true, "Required validation must expose aria-invalid.");
required.value = "value";
focused = false;
var values = contract.validate(records, status);
assert.strictEqual(values.RequiredText, "value");
assert.strictEqual(values.Flag, false, "Switch values must preserve boolean mapping.");

console.log("Shared native execution parameter dialog, consumers, loader order and validation: OK");
'''
write("test/shared-parameter-dialog.test.js", test)

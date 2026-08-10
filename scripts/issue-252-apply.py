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
        raise SystemExit(f"{path}: expected one regex match, found {count}: {pattern[:100]}")
    write(path, value)


# jira-assets-service: synchronous atomic writes and readable Polish transliteration in raster glyphs.
replace_once(
    "server/core/jira-assets-service.js",
    '''function html(value) {\n    return clean(value, 20000)\n        .replace(/&/g, "&amp;")\n        .replace(/</g, "&lt;")\n        .replace(/>/g, "&gt;")\n        .replace(/\\"/g, "&quot;")\n        .replace(/'/g, "&#39;");\n}\n''',
    '''function html(value) {\n    return clean(value, 20000)\n        .replace(/&/g, "&amp;")\n        .replace(/</g, "&lt;")\n        .replace(/>/g, "&gt;")\n        .replace(/\\"/g, "&quot;")\n        .replace(/'/g, "&#39;");\n}\n\nfunction writeJsonAtomicSync(fs, path, target, value) {\n    fs.mkdirSync(path.dirname(target), { recursive: true });\n    var temporary = target + "." + process.pid + "." + shared.randomId(5) + ".tmp";\n    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\\n", "utf8");\n    fs.renameSync(temporary, target);\n}\n'''
)
replace_once(
    "server/core/jira-assets-service.js",
    '        shared.writeJsonAtomic(fs, path, cachePath, { updatedAt: Date.now(), users: users });',
    '        writeJsonAtomicSync(fs, path, cachePath, { updatedAt: Date.now(), users: users });'
)
replace_once(
    "server/core/jira-assets-service.js",
    '        shared.writeJsonAtomic(fs, path, path.join(directory, "meta.json"), {',
    '        writeJsonAtomicSync(fs, path, path.join(directory, "meta.json"), {'
)
replace_once(
    "server/core/jira-assets-service.js",
    '''function glyph(character) {\n    var upper = String(character || "?").toUpperCase();\n    return FONT[upper] || FONT["?"];\n}''',
    '''function glyph(character) {\n    var upper = String(character || "?").toUpperCase();\n    var transliteration = { "Ą":"A", "Ć":"C", "Ę":"E", "Ł":"L", "Ń":"N", "Ó":"O", "Ś":"S", "Ź":"Z", "Ż":"Z" };\n    upper = transliteration[upper] || upper;\n    return FONT[upper] || FONT["?"];\n}'''
)

# Approval service: opt-in deferred execution for real progress visibility; default behavior unchanged.
replace_once(
    "server/core/approval-service.js",
    '''        }).then(function (result) {\n            if (result.existing || levels.length) return result.request;\n            return execute(result.request.id);\n        });''',
    '''        }).then(function (result) {\n            if (result.existing || levels.length || (submitOptions && submitOptions.deferExecution === true)) return result.request;\n            return execute(result.request.id);\n        });'''
)
replace_once(
    "server/core/approval-service.js",
    '''        decideExternal: decideExternal,\n        getProviderResources: getProviderResources,''',
    '''        decideExternal: decideExternal,\n        execute: execute,\n        getProviderResources: getProviderResources,'''
)

# Server script executor: allow caller-owned non-secret environment enrichment only.
replace_once(
    "server/core/server-script-executor.js",
    '    function run(script, payload, request) {',
    '    function run(script, payload, request, executionOptions) {'
)
replace_once(
    "server/core/server-script-executor.js",
    '''        var environment = Object.assign({}, process.env, systemEnvironment(script.path), {\n            MYSCRIPTS_REQUEST_ID: request.id,''',
    '''        executionOptions = executionOptions || {};\n        var environment = Object.assign({}, process.env, systemEnvironment(script.path), executionOptions.environment || {}, {\n            MYSCRIPTS_REQUEST_ID: request.id,'''
)
replace_once(
    "server/core/server-script-executor.js",
    '    function execute(payload, request) {',
    '    function execute(payload, request, executionOptions) {'
)
replace_once(
    "server/core/server-script-executor.js",
    '                return run(script, normalized, request);',
    '                return run(script, normalized, request, executionOptions);'
)

# My Scripts backend: Jira provider, progress, artifact and deferred protocol execution.
replace_once(
    "server/modules/automation/index.js",
    'var executorFactory = require("../../core/server-script-executor.js");\nvar rootResolver',
    'var executorFactory = require("../../core/server-script-executor.js");\nvar jiraAssetsFactory = require("../../core/jira-assets-service.js");\nvar rootResolver'
)
replace_once(
    "server/modules/automation/index.js",
    '''    var executor = executorFactory.createServerScriptExecutor({ context: context, library: library, admin: admin, assignmentNamespace: "script-secrets.myscripts.system-credentials" });\n    var unregister = null;''',
    '''    var executor = executorFactory.createServerScriptExecutor({ context: context, library: library, admin: admin, assignmentNamespace: "script-secrets.myscripts.system-credentials" });\n    var jiraAssets = jiraAssetsFactory.createJiraAssetsService({ context: context });\n    var unregister = null;'''
)
replace_once(
    "server/modules/automation/index.js",
    '''        execute: function (payload, request) {\n            var requester = shared.findUser(context.parent, request && request.requester && request.requester.id) || { _id: request && request.requester && request.requester.id };\n            requireScriptAccess(requester, payload && payload.scriptPath);\n            return executor.execute(payload, request);\n        }''',
    '''        execute: function (payload, request) {\n            var requester = shared.findUser(context.parent, request && request.requester && request.requester.id) || { _id: request && request.requester && request.requester.id };\n            requireScriptAccess(requester, payload && payload.scriptPath);\n            var script = library.getScript(payload && payload.scriptPath, true);\n            if (script && jiraAssets.isProtocolScript(script)) {\n                return jiraAssets.executeProtocol(payload, request, function (environment) {\n                    return executor.execute(payload, request, { environment: environment });\n                });\n            }\n            return executor.execute(payload, request);\n        }'''
)
replace_once(
    "server/modules/automation/index.js",
    '''        serveIcon: function (req, res) { shared.send(res, 404, "text/plain; charset=utf-8", "Icons are included in the script tree."); },\n        apiGet: function (asset, req, user) {''',
    '''        serveIcon: function (req, res) { shared.send(res, 404, "text/plain; charset=utf-8", "Icons are included in the script tree."); },\n        serveArtifact: function (req, res, user) {\n            if (!allowed(user)) { shared.send(res, 403, "text/plain; charset=utf-8", "Forbidden"); return; }\n            try {\n                var q = req && req.query || {};\n                var request = context.approval.getRequest(user, q.id);\n                var artifact = jiraAssets.resolveArtifact(q.id, q.type || "pdf");\n                requireScriptAccess(user, artifact.meta && artifact.meta.scriptPath);\n                if (String(request.id) !== String(artifact.meta.requestId)) throw new Error("Artifact request mismatch.");\n                var contentTypes = { pdf: "application/pdf", json: "application/json; charset=utf-8", txt: "text/plain; charset=utf-8", html: "text/html; charset=utf-8" };\n                var stat = context.fs.statSync(artifact.path);\n                var disposition = String(q.download || "") === "1" ? "attachment" : "inline";\n                var name = String(artifact.name || "artifact").replace(/[\\r\\n\\"]/g, "_");\n                if (typeof res.setHeader === "function") {\n                    res.setHeader("Content-Type", contentTypes[artifact.type] || "application/octet-stream");\n                    res.setHeader("Content-Disposition", disposition + '; filename="' + name + '"');\n                    res.setHeader("Content-Length", String(stat.size));\n                    res.setHeader("Cache-Control", "no-store");\n                    res.setHeader("X-Content-Type-Options", "nosniff");\n                } else if (typeof res.set === "function") {\n                    res.set("Content-Type", contentTypes[artifact.type] || "application/octet-stream");\n                    res.set("Content-Disposition", disposition + '; filename="' + name + '"');\n                    res.set("Content-Length", String(stat.size));\n                    res.set("Cache-Control", "no-store");\n                    res.set("X-Content-Type-Options", "nosniff");\n                }\n                res.statusCode = 200;\n                var stream = context.fs.createReadStream(artifact.path);\n                stream.on("error", function () { if (typeof res.destroy === "function") res.destroy(); });\n                stream.pipe(res);\n            } catch (error) {\n                shared.send(res, 403, "text/plain; charset=utf-8", "Artifact unavailable");\n            }\n        },\n        apiGet: function (asset, req, user) {'''
)
replace_once(
    "server/modules/automation/index.js",
    '''            if (asset === "system-credentials") { requireScriptAccess(user, q.path); return { ok: true, systemCredentials: admin.getSystemCredentialState(user, q.path) }; }\n            if (asset === "results") {''',
    '''            if (asset === "system-credentials") { requireScriptAccess(user, q.path); return { ok: true, systemCredentials: admin.getSystemCredentialState(user, q.path) }; }\n            if (asset === "variable-options") {\n                requireScriptAccess(user, q.path);\n                var optionScript = library.getScript(q.path, true);\n                if (!optionScript) throw new Error("Script not found.");\n                var optionVariable = (optionScript.variables || []).find(function (item) { return item.name === String(q.variable || ""); });\n                if (!optionVariable) throw new Error("Variable not found.");\n                var currentValues = shared.parseJsonObject(q.values, {});\n                return jiraAssets.variableOptions(optionScript, optionVariable, currentValues).then(function (options) { return { ok: true, options: options }; });\n            }\n            if (asset === "progress") {\n                var progressRequest = context.approval.getRequest(user, q.id);\n                requireScriptAccess(user, progressRequest.payload && progressRequest.payload.scriptPath);\n                return { ok: true, progress: jiraAssets.progress(q.id), request: progressRequest };\n            }\n            if (asset === "results") {'''
)
replace_once(
    "server/modules/automation/index.js",
    '''                return context.approval.submit("myscripts", user, payload, value.note).then(function (request) { return { ok: true, request: request }; });''',
    '''                var protocol = jiraAssets.isProtocolScript(requestedScript);\n                return context.approval.submit("myscripts", user, payload, value.note, { deferExecution: protocol && !levels.length }).then(function (request) {\n                    if (protocol && !levels.length && request && request.status === "approved") {\n                        context.approval.execute(request.id).catch(function () {});\n                    }\n                    return { ok: true, request: request, protocol: protocol };\n                });'''
)

# Admin typed artifact route.
replace_once(
    "admin.js",
    '''        if (moduleName === "myscripts" && asset === "folder-icon") {\n            var automation = plugin.runtime.modules && plugin.runtime.modules.myscripts;\n            if (automation && typeof automation.serveIcon === "function") automation.serveIcon(req, res, user);\n            else shared.send(res, 404, "text/plain; charset=utf-8", "Folder icon unavailable");\n            return;\n        }''',
    '''        if (moduleName === "myscripts" && (asset === "folder-icon" || asset === "artifact")) {\n            var automation = plugin.runtime.modules && plugin.runtime.modules.myscripts;\n            if (asset === "artifact" && automation && typeof automation.serveArtifact === "function") automation.serveArtifact(req, res, user);\n            else if (asset === "folder-icon" && automation && typeof automation.serveIcon === "function") automation.serveIcon(req, res, user);\n            else shared.send(res, 404, "text/plain; charset=utf-8", "My Scripts asset unavailable");\n            return;\n        }'''
)

# Shared parameter dialog: generic allow-custom metadata for selected user variables.
replace_once(
    "public/shared/ui/parameter-dialog.js",
    '''    function controlKind(variable) {\n        var kind = text(variable && variable.control || "text").trim().toLowerCase();\n        return ["select", "switch", "user", "asset"].indexOf(kind) >= 0 ? kind : "text";\n    }''',
    '''    function controlKind(variable) {\n        var kind = text(variable && variable.control || "text").trim().toLowerCase();\n        return ["select", "switch", "user", "asset"].indexOf(kind) >= 0 ? kind : "text";\n    }\n    function allowCustom(item, variable) {\n        var name = text(variable && variable.name).trim().toLowerCase();\n        return (item && Array.isArray(item.extraHeaders) ? item.extraHeaders : []).some(function (header) {\n            var match = /^SirkAllowCustom\\s*:\\s*(.+)$/i.exec(text(header).trim());\n            if (!match) return false;\n            return match[1].split(",").map(function (value) { return value.trim().toLowerCase(); }).indexOf(name) >= 0;\n        });\n    }'''
)
replace_once(
    "public/shared/ui/parameter-dialog.js",
    '''            var control = document.createElement(kind === "select" || kind === "user" || kind === "asset" ? "select" : "input");\n            control.id = prefix + "Control" + index;''',
    '''            var customUser = kind === "user" && allowCustom(item, variable);\n            var control = document.createElement(kind === "select" || kind === "asset" || (kind === "user" && !customUser) ? "select" : "input");\n            control.id = prefix + "Control" + index;'''
)
replace_once(
    "public/shared/ui/parameter-dialog.js",
    '''            } else if (kind === "text") {\n                control.type = "text";\n                control.value = defaultValue(variable);\n                control.autocomplete = "off";\n            } else {\n                setOptions(control, variable.options || [], variable, kind === "user" || kind === "asset" ? "Loading…" : "");\n            }\n            row.appendChild(control);''',
    '''            } else if (kind === "text" || customUser) {\n                control.type = "text";\n                control.value = defaultValue(variable);\n                control.autocomplete = "off";\n                if (customUser) {\n                    var list = document.createElement("datalist");\n                    list.id = control.id + "Options";\n                    control.setAttribute("list", list.id);\n                    row.appendChild(control);\n                    row.appendChild(list);\n                } else row.appendChild(control);\n            } else {\n                setOptions(control, variable.options || [], variable, kind === "user" || kind === "asset" ? "Loading…" : "");\n                row.appendChild(control);\n            }\n            if (!control.parentNode) row.appendChild(control);'''
)
replace_once(
    "public/shared/ui/parameter-dialog.js",
    '''            function loadDynamic(record) {\n                if ((record.kind !== "user" && record.kind !== "asset") || typeof provider !== "function") {''',
    '''            function loadDynamic(record) {\n                if (record.kind === "user" && allowCustom(item, record.variable)) {\n                    if (typeof provider !== "function") return Promise.resolve();\n                    var list = document.getElementById(record.control.getAttribute("list"));\n                    if (!list) return Promise.resolve();\n                    var requestSequence = ++record.loadSequence;\n                    record.loading = true; refreshSubmitState();\n                    return Promise.resolve(provider(record.variable, currentValues(records), item)).then(function (optionsValue) {\n                        if (cleaned || requestSequence !== record.loadSequence) return;\n                        while (list.firstChild) list.removeChild(list.firstChild);\n                        (Array.isArray(optionsValue) ? optionsValue : []).forEach(function (option) {\n                            var node = document.createElement("option"); node.value = optionValue(option);\n                            var label = optionLabel(option); if (label) node.label = label; list.appendChild(node);\n                        });\n                        record.loading = false; record.loadFailed = false; refreshSubmitState();\n                    }).catch(function (error) {\n                        if (cleaned || requestSequence !== record.loadSequence) return;\n                        record.loading = false; record.loadFailed = false;\n                        setStatus(status, error && error.message || String(error), false); refreshSubmitState();\n                    });\n                }\n                if ((record.kind !== "user" && record.kind !== "asset") || typeof provider !== "function") {'''
)

# My Scripts frontend: shared Jira option provider, real progress polling, one-time auto-open.
replace_once(
    "public/modules/automation/index.js",
    '''    tools.restoreTreeState(treeState);\n\n    function admin(shell) {''',
    '''    tools.restoreTreeState(treeState);\n    var progressSequence = 0;\n    var openedArtifacts = new Set();\n\n    function protocolScript(item) {\n        return !!(item && Array.isArray(item.extraHeaders) && item.extraHeaders.some(function (header) {\n            return /^SirkWorkflow\\s*:\\s*JiraAssetProtocol$/i.test(String(header || "").trim());\n        }));\n    }\n    window.SharedScriptTools.setParameterOptionProvider(function (variable, values, item) {\n        if (!protocolScript(item) || (variable.control !== "user" && variable.control !== "asset")) return Promise.resolve(variable.options || []);\n        return window.SirkPlatformCore.api("myscripts", "variable-options", null, {\n            path: item.path, variable: variable.name, values: JSON.stringify(values || {})\n        }).then(function (response) { return response.options || []; });\n    });\n\n    function admin(shell) {'''
)
replace_once(
    "public/modules/automation/index.js",
    '''    function submit(shell, script, button, values, detailsHost, resultHost, errorHost) {''',
    '''    function openArtifactOnce(request) {\n        var artifact = request && request.result && request.result.artifact;\n        if (!artifact || !artifact.id || openedArtifacts.has(artifact.id)) return;\n        openedArtifacts.add(artifact.id);\n        window.open(window.SirkPlatformCore.assetUrl("myscripts", "artifact", { id: artifact.id, type: artifact.type || "pdf" }), "_blank", "noopener");\n    }\n\n    function pollProtocol(shell, script, request, resultHost, sequence, attempt) {\n        if (sequence !== progressSequence) return;\n        attempt = Number(attempt) || 0;\n        if (attempt >= 900) { switchToResult(shell.state.page.details, resultHost, "Protocol progress timed out."); return; }\n        shell.api("progress", { id: request.id }).then(function (response) {\n            if (sequence !== progressSequence) return;\n            var progress = response.progress || {};\n            var current = response.request || request;\n            outputs[script.path] = current;\n            if (current.status === "completed" || current.status === "failed" || current.status === "rejected") {\n                renderResult(resultHost, current);\n                openArtifactOnce(current);\n                sync(shell);\n                return;\n            }\n            resultHost.innerHTML = "";\n            var bar = document.createElement("progress"); bar.className = "mc-script-protocol-progress"; bar.max = 100; bar.value = Number(progress.percent) || 0;\n            var label = document.createElement("div"); label.className = "mc-shared-muted";\n            label.textContent = current.status === "pending" ? "Waiting for approval." : (progress.stage || current.status || "Executing...") + " — " + bar.value + "%";\n            resultHost.appendChild(bar); resultHost.appendChild(label);\n            window.setTimeout(function () { pollProtocol(shell, script, current, resultHost, sequence, attempt + 1); }, 1000);\n        }).catch(function (error) {\n            if (sequence !== progressSequence) return;\n            resultHost.innerHTML = ""; resultHost.classList.add("mc-shared-error");\n            resultHost.textContent = error.message || String(error);\n        });\n    }\n\n    function submit(shell, script, button, values, detailsHost, resultHost, errorHost) {'''
)
replace_once(
    "public/modules/automation/index.js",
    '''        shell.post("request", {\n            scriptPath: script.path,\n            variableValues: values || {},\n            confirmedExecution: script.confirmExecution === true,\n            note: ""\n        }).then(function (response) {\n            var request = response.request || {};\n            outputs[script.path] = request;\n            renderResult(resultHost, request);''',
    '''        var sequence = ++progressSequence;\n        shell.post("request", {\n            scriptPath: script.path,\n            variableValues: values || {},\n            confirmedExecution: script.confirmExecution === true,\n            note: ""\n        }).then(function (response) {\n            var request = response.request || {};\n            outputs[script.path] = request;\n            if (response.protocol === true && request.id) pollProtocol(shell, script, request, resultHost, sequence, 0);\n            else renderResult(resultHost, request);'''
)
replace_once(
    "public/modules/automation/index.js",
    '''    function show(shell, item, executeOnSelect) {\n        shell.api("script", { path: item.path }).then(function (response) {''',
    '''    function show(shell, item, executeOnSelect) {\n        progressSequence++;\n        shell.api("script", { path: item.path }).then(function (response) {'''
)

# Results typed artifact marker -> manual Open/Download action; marker removed from visible output.
replace_once(
    "public/shared/ui/results.js",
    '''        var downloadPath = "";\n        var lines = raw.split(/\\r?\\n/);''',
    '''        var downloadPath = "";\n        var artifact = null;\n        var lines = raw.split(/\\r?\\n/);'''
)
replace_once(
    "public/shared/ui/results.js",
    '''            var match = /^CSV_DOWNLOAD:(.+)$/i.exec(trimmed);\n            if (match) {\n                if (!downloadPath) downloadPath = String(match[1] || "").trim();\n                return;\n            }''',
    '''            var match = /^CSV_DOWNLOAD:(.+)$/i.exec(trimmed);\n            if (match) {\n                if (!downloadPath) downloadPath = String(match[1] || "").trim();\n                return;\n            }\n            var artifactMatch = /^SIRK_ARTIFACT:(\\{.+\\})$/i.exec(trimmed);\n            if (artifactMatch) {\n                try {\n                    var parsedArtifact = JSON.parse(artifactMatch[1]);\n                    if (parsedArtifact && /^[A-Za-z0-9_-]{6,80}$/.test(String(parsedArtifact.id || "")) && /^(pdf|json|txt|html)$/.test(String(parsedArtifact.type || ""))) artifact = parsedArtifact;\n                } catch (error) {}\n                return;\n            }'''
)
replace_once(
    "public/shared/ui/results.js",
    '        return { raw: raw, visible: visible.join("\\n").trim(), downloadPath: downloadPath };',
    '        return { raw: raw, visible: visible.join("\\n").trim(), downloadPath: downloadPath, artifact: artifact };'
)
replace_once(
    "public/shared/ui/results.js",
    '''        if (parsedOutput.downloadPath) {\n            var download = document.createElement("button");''',
    '''        if (parsedOutput.artifact) {\n            var openArtifact = document.createElement("button"); openArtifact.type = "button"; openArtifact.className = "btn btn-secondary btn-sm"; openArtifact.textContent = parsedOutput.artifact.type === "pdf" ? "Open PDF" : "Open artifact";\n            openArtifact.onclick = function () { window.open(window.SirkPlatformCore.assetUrl("myscripts", "artifact", { id: parsedOutput.artifact.id, type: parsedOutput.artifact.type }), "_blank", "noopener"); };\n            actions.appendChild(openArtifact);\n            var downloadArtifact = document.createElement("button"); downloadArtifact.type = "button"; downloadArtifact.className = "btn btn-secondary btn-sm"; downloadArtifact.textContent = "Download";\n            downloadArtifact.onclick = function () { window.location.href = window.SirkPlatformCore.assetUrl("myscripts", "artifact", { id: parsedOutput.artifact.id, type: parsedOutput.artifact.type, download: 1 }); };\n            actions.appendChild(downloadArtifact);\n        }\n        if (parsedOutput.downloadPath) {\n            var download = document.createElement("button");'''
)

# Seed supports Jira user suggestions plus free-form IT person.
replace_once(
    "seed/MyScripts/Jira/Jira Asset Protocol.ps1",
    '# VariableUserRequired: ItPerson,Osoba IT | Wybierz osobę IT z Jira albo wpisz własną nazwę\n# ConfirmExecution: true',
    '# VariableUserRequired: ItPerson,Osoba IT | Wybierz osobę IT z Jira albo wpisz własną nazwę\n# SirkAllowCustom: ItPerson\n# ConfirmExecution: true'
)

# Targeted cross-layer contract test.
write("test/jira-asset-protocol-contract.test.js", r'''"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
function source(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var approval = source("server/core/approval-service.js");
var executor = source("server/core/server-script-executor.js");
var automation = source("server/modules/automation/index.js");
var frontend = source("public/modules/automation/index.js");
var dialog = source("public/shared/ui/parameter-dialog.js");
var results = source("public/shared/ui/results.js");
var admin = source("admin.js");
var seed = source("seed/MyScripts/Jira/Jira Asset Protocol.ps1");

assert.ok(approval.indexOf("submitOptions && submitOptions.deferExecution === true") >= 0 && approval.indexOf("execute: execute") >= 0,
    "Approval must expose opt-in deferred execution while preserving the default synchronous path.");
assert.ok(executor.indexOf("executionOptions.environment || {}") >= 0,
    "The server script executor must accept caller-owned non-secret environment enrichment without changing variableValues.");
assert.ok(automation.indexOf("jiraAssetsFactory.createJiraAssetsService") >= 0 &&
    automation.indexOf('asset === "variable-options"') >= 0 && automation.indexOf('asset === "progress"') >= 0,
    "My Scripts backend must own Jira dynamic options and real progress endpoints.");
assert.ok(automation.indexOf("jiraAssets.executeProtocol") >= 0 && automation.indexOf("context.approval.execute(request.id)") >= 0,
    "Jira protocol must use the existing approval request identity and deferred execution state machine.");
assert.ok(automation.indexOf("requireScriptAccess(user, artifact.meta && artifact.meta.scriptPath)") >= 0,
    "Artifact download must re-check My Scripts folder access instead of trusting artifact ID possession.");
assert.ok(admin.indexOf('asset === "folder-icon" || asset === "artifact"') >= 0,
    "The canonical admin router must route typed My Scripts artifacts through the module owner.");
assert.ok(frontend.indexOf("setParameterOptionProvider") >= 0 && frontend.indexOf('asset === "progress"') < 0,
    "My Scripts must register one shared dynamic option provider and must not hardcode backend asset names incorrectly.");
assert.ok(frontend.indexOf('shell.api("progress", { id: request.id })') >= 0 &&
    frontend.indexOf("attempt >= 900") >= 0 && frontend.indexOf("setTimeout(function () { pollProtocol") >= 0,
    "Protocol progress polling must be real-state driven and explicitly bounded.");
assert.ok(frontend.indexOf("openedArtifacts = new Set()") >= 0 && frontend.indexOf("openedArtifacts.has(artifact.id)") >= 0,
    "Automatic protocol artifact opening must occur at most once per completed run.");
assert.ok(results.indexOf("SIRK_ARTIFACT:") >= 0 && results.indexOf("Open PDF") >= 0,
    "Shared Results must expose typed artifact Open/Download actions without filesystem paths.");
assert.ok(dialog.indexOf("SirkAllowCustom") >= 0 && dialog.indexOf("datalist") >= 0,
    "Shared user input must support explicit script-declared custom values without a Jira-only dialog fork.");
assert.ok(seed.indexOf("SirkWorkflow: JiraAssetProtocol") >= 0 && seed.indexOf("VariableUserRequired: JiraUser") >= 0 &&
    seed.indexOf("VariableAssetRequired: PcName") >= 0 && seed.indexOf("SirkAllowCustom: ItPerson") >= 0,
    "The seed workflow must declare user -> asset dependency, transfer switch and custom-capable IT person through existing script metadata.");
assert.strictEqual(seed.indexOf("$env:JIRA_TOKEN"), -1,
    "The protocol script must consume normalized server-side data and never receive the Jira API token.");
assert.strictEqual(frontend.indexOf("Write-Progress"), -1);
assert.strictEqual(frontend.indexOf("MutationObserver"), -1);

console.log("Jira Asset Protocol backend/provider/progress/artifact/shared-dialog contract: OK");
''')

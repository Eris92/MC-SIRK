from pathlib import Path
import re

path = Path("scripts/issue-252-apply.py")
source = path.read_text(encoding="utf-8")

# Replace the fragile exact HTML-helper insertion with a regex-based insertion that
# matches the real JS source (`/"/g`) without Python string escaping ambiguity.
pattern = re.compile(
    r'''replace_once\(\n    "server/core/jira-assets-service\.js",\n    '''function html\(value\) \{.*?\n'''\n\)\n''',
    re.S,
)
replacement = r'''sub_once(
    "server/core/jira-assets-service.js",
    r'''function html\(value\) \{.*?\n\}\n''',
    '''function html(value) {\n    return clean(value, 20000)\n        .replace(/&/g, "&amp;")\n        .replace(/</g, "&lt;")\n        .replace(/>/g, "&gt;")\n        .replace(/"/g, "&quot;")\n        .replace(/'/g, "&#39;");\n}\n\nfunction writeJsonAtomicSync(fs, path, target, value) {\n    fs.mkdirSync(path.dirname(target), { recursive: true });\n    var temporary = target + "." + process.pid + "." + shared.randomId(5) + ".tmp";\n    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\\n", "utf8");\n    fs.renameSync(temporary, target);\n}\n'''
)
'''
source, count = pattern.subn(replacement, source, count=1)
if count != 1:
    raise SystemExit(f"unable to replace fragile html helper block: {count}")

source = source.replace(
    '                var currentValues = shared.parseJsonObject(q.values, {});',
    '''                var currentValues = {};\n                try { currentValues = q.values ? JSON.parse(String(q.values)) : {}; } catch (error) { currentValues = {}; }\n                if (!currentValues || typeof currentValues !== "object" || Array.isArray(currentValues)) currentValues = {};''',
    1,
)
if "shared.parseJsonObject" in source:
    raise SystemExit("shared.parseJsonObject must not remain")

# Keep the Run button disabled for an active protocol. Re-enable only when the real
# terminal request state arrives (or progress polling fails/times out).
source = source.replace(
    '    function pollProtocol(shell, script, request, resultHost, sequence, attempt) {',
    '    function pollProtocol(shell, script, request, resultHost, sequence, attempt, button) {',
    1,
)
source = source.replace(
    '        if (attempt >= 900) { switchToResult(shell.state.page.details, resultHost, "Protocol progress timed out."); return; }',
    '        if (attempt >= 900) { switchToResult(shell.state.page.details, resultHost, "Protocol progress timed out."); if (button) button.disabled = false; return; }',
    1,
)
source = source.replace(
    '''                renderResult(resultHost, current);\n                openArtifactOnce(current);\n                sync(shell);\n                return;''',
    '''                renderResult(resultHost, current);\n                openArtifactOnce(current);\n                if (button) button.disabled = false;\n                sync(shell);\n                return;''',
    1,
)
source = source.replace(
    '            window.setTimeout(function () { pollProtocol(shell, script, current, resultHost, sequence, attempt + 1); }, 1000);',
    '            window.setTimeout(function () { pollProtocol(shell, script, current, resultHost, sequence, attempt + 1, button); }, 1000);',
    1,
)
source = source.replace(
    '''            resultHost.innerHTML = ""; resultHost.classList.add("mc-shared-error");\n            resultHost.textContent = error.message || String(error);''',
    '''            resultHost.innerHTML = ""; resultHost.classList.add("mc-shared-error");\n            resultHost.textContent = error.message || String(error);\n            if (button) button.disabled = false;''',
    1,
)
source = source.replace(
    '        var sequence = ++progressSequence;\n        shell.post("request", {',
    '        var sequence = ++progressSequence;\n        var protocolPending = false;\n        shell.post("request", {',
    1,
)
source = source.replace(
    '            if (response.protocol === true && request.id) pollProtocol(shell, script, request, resultHost, sequence, 0);\n            else renderResult(resultHost, request);',
    '            if (response.protocol === true && request.id) { protocolPending = true; pollProtocol(shell, script, request, resultHost, sequence, 0, button); }\n            else renderResult(resultHost, request);',
    1,
)
source = source.replace(
    '            if (button) button.disabled = false;\n            sync(shell);',
    '            if (button && !protocolPending) button.disabled = false;\n            sync(shell);',
    1,
)

path.write_text(source, encoding="utf-8")

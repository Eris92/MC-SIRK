from pathlib import Path

helper_path = Path("scripts/issue-252-apply.py")
helper = helper_path.read_text(encoding="utf-8")

# Apply the one fragile insertion directly in the temporary checkout. Nothing is
# committed until every subsequent guarded transformation succeeds.
service_path = Path("server/core/jira-assets-service.js")
service = service_path.read_text(encoding="utf-8")
marker = "\n\nfunction allStrings(value, result, depth) {"
if service.count(marker) != 1 or "function writeJsonAtomicSync" in service:
    raise SystemExit("jira-assets-service atomic-write insertion state is unexpected")
atomic = '''

function writeJsonAtomicSync(fs, path, target, value) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    var temporary = target + "." + process.pid + "." + shared.randomId(5) + ".tmp";
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + "\\n", "utf8");
    fs.renameSync(temporary, target);
}'''
service_path.write_text(service.replace(marker, atomic + marker, 1), encoding="utf-8")

# Remove the now-unnecessary first guarded replace_once() block from the main
# transformer. Locate it structurally between the section comment and the next
# exact replacement call.
section = helper.index("# jira-assets-service: synchronous atomic writes")
first = helper.index("replace_once(", section)
second = helper.index("replace_once(", first + len("replace_once("))
helper = helper[:first] + helper[second:]

# The shared module has no parseJsonObject helper; keep query JSON parsing local
# and bounded to a plain object.
old = '                var currentValues = shared.parseJsonObject(q.values, {});'
new = '''                var currentValues = {};
                try { currentValues = q.values ? JSON.parse(String(q.values)) : {}; } catch (error) { currentValues = {}; }
                if (!currentValues || typeof currentValues !== "object" || Array.isArray(currentValues)) currentValues = {};'''
if helper.count(old) != 1:
    raise SystemExit("variable-options JSON parser replacement state is unexpected")
helper = helper.replace(old, new, 1)

# Keep the Run button disabled while the actual protocol request is still active;
# terminal progress/error/timeout is the only re-enable boundary.
replacements = [
    (
        '    function pollProtocol(shell, script, request, resultHost, sequence, attempt) {',
        '    function pollProtocol(shell, script, request, resultHost, sequence, attempt, button) {'
    ),
    (
        '        if (attempt >= 900) { switchToResult(shell.state.page.details, resultHost, "Protocol progress timed out."); return; }',
        '        if (attempt >= 900) { switchToResult(shell.state.page.details, resultHost, "Protocol progress timed out."); if (button) button.disabled = false; return; }'
    ),
    (
        '''                renderResult(resultHost, current);
                openArtifactOnce(current);
                sync(shell);
                return;''',
        '''                renderResult(resultHost, current);
                openArtifactOnce(current);
                if (button) button.disabled = false;
                sync(shell);
                return;'''
    ),
    (
        '            window.setTimeout(function () { pollProtocol(shell, script, current, resultHost, sequence, attempt + 1); }, 1000);',
        '            window.setTimeout(function () { pollProtocol(shell, script, current, resultHost, sequence, attempt + 1, button); }, 1000);'
    ),
    (
        '''            resultHost.innerHTML = ""; resultHost.classList.add("mc-shared-error");
            resultHost.textContent = error.message || String(error);''',
        '''            resultHost.innerHTML = ""; resultHost.classList.add("mc-shared-error");
            resultHost.textContent = error.message || String(error);
            if (button) button.disabled = false;'''
    ),
    (
        '        var sequence = ++progressSequence;\n        shell.post("request", {',
        '        var sequence = ++progressSequence;\n        var protocolPending = false;\n        shell.post("request", {'
    ),
    (
        '            if (response.protocol === true && request.id) pollProtocol(shell, script, request, resultHost, sequence, 0);\n            else renderResult(resultHost, request);',
        '            if (response.protocol === true && request.id) { protocolPending = true; pollProtocol(shell, script, request, resultHost, sequence, 0, button); }\n            else renderResult(resultHost, request);'
    ),
    (
        '            if (button) button.disabled = false;\n            sync(shell);',
        '            if (button && !protocolPending) button.disabled = false;\n            sync(shell);'
    )
]
for old, new in replacements:
    if helper.count(old) != 1:
        raise SystemExit("protocol pending replacement state is unexpected: " + old[:80])
    helper = helper.replace(old, new, 1)

if "shared.parseJsonObject" in helper:
    raise SystemExit("shared.parseJsonObject must not remain")
helper_path.write_text(helper, encoding="utf-8")

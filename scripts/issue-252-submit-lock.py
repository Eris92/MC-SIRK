from pathlib import Path

path = Path("public/modules/automation/index.js")
source = path.read_text(encoding="utf-8")
replacements = [
    (
        "    function pollProtocol(shell, script, request, resultHost, sequence, attempt) {",
        "    function pollProtocol(shell, script, request, resultHost, sequence, attempt, button) {"
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
        '''        var sequence = ++progressSequence;
        shell.post("request", {''',
        '''        var sequence = ++progressSequence;
        var protocolPending = false;
        shell.post("request", {'''
    ),
    (
        '''            if (response.protocol === true && request.id) pollProtocol(shell, script, request, resultHost, sequence, 0);
            else renderResult(resultHost, request);''',
        '''            if (response.protocol === true && request.id) { protocolPending = true; pollProtocol(shell, script, request, resultHost, sequence, 0, button); }
            else renderResult(resultHost, request);'''
    ),
    (
        '''        }).then(function () {
            if (button) button.disabled = false;
            sync(shell);''',
        '''        }).then(function () {
            if (button && !protocolPending) button.disabled = false;
            sync(shell);'''
    )
]
for old, new in replacements:
    if source.count(old) != 1:
        raise SystemExit("submit-lock source mismatch: " + old[:90])
    source = source.replace(old, new, 1)
path.write_text(source, encoding="utf-8")

contract = Path("test/jira-asset-protocol-contract.test.js")
test = contract.read_text(encoding="utf-8")
needle = '''assert.ok(frontend.indexOf("openedArtifacts = new Set()") >= 0 && frontend.indexOf("openedArtifacts.has(artifact.id)") >= 0,
    "Automatic protocol artifact opening must occur at most once per completed run.");'''
insert = needle + '''
assert.ok(frontend.indexOf("var protocolPending = false") >= 0 &&
    frontend.indexOf("if (button && !protocolPending) button.disabled = false") >= 0 &&
    frontend.indexOf("if (button) button.disabled = false") >= 0,
    "Protocol Run must remain disabled until terminal progress, error or timeout instead of allowing duplicate requests.");'''
if test.count(needle) != 1:
    raise SystemExit("contract insertion mismatch")
contract.write_text(test.replace(needle, insert, 1), encoding="utf-8")

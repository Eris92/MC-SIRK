from pathlib import Path
p = Path('test/admin-permissions-placement.test.js')
text = p.read_text(encoding='utf-8')
old = '''var commandPayload = browser.slice(browser.indexOf('} else if (tab === "mycommands")'), browser.indexOf('} else {', browser.indexOf('} else if (tab === "mycommands")')));\nvar scriptPayload = browser.slice(browser.indexOf('} else {', browser.indexOf('} else if (tab === "mycommands")'), browser.indexOf('    function activate'));\n'''
new = '''var commandStart = browser.indexOf('} else if (tab === "mycommands")');\nvar scriptStart = browser.indexOf('} else {', commandStart);\nvar activateStart = browser.indexOf('    function activate');\nvar commandPayload = browser.slice(commandStart, scriptStart);\nvar scriptPayload = browser.slice(scriptStart, activateStart);\n'''
if old not in text:
    raise SystemExit('placement syntax marker not found')
p.write_text(text.replace(old, new, 1), encoding='utf-8')

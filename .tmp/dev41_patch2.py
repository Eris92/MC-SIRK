from pathlib import Path
p = Path('test/native-ui-contract.test.js')
s = p.read_text(encoding='utf-8')
old = '''assert.ok(loggedOnUserPolicy.indexOf("New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Limited") >= 0 &&
    loggedOnUserPolicy.indexOf("wscript.exe") >= 0,
    "GUI runAsUser commands must use the canonical console-free interactive user-session owner.");
'''
new = '''assert.ok(loggedOnUserPolicy.indexOf("New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel \" + runLevel") >= 0 &&
    loggedOnUserPolicy.indexOf('var runLevel = command && command.elevatedUserSession === true ? "Highest" : "Limited";') >= 0 &&
    loggedOnUserPolicy.indexOf("wscript.exe") >= 0,
    "GUI runAsUser commands must reuse the canonical console-free interactive user-session owner with bounded trusted elevation.");
'''
if s.count(old) != 1:
    raise SystemExit('native-ui-contract: old fixed Limited assertion not found')
p.write_text(s.replace(old, new, 1), encoding='utf-8')

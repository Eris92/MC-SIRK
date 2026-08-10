from pathlib import Path


def replace_once(path, old, new):
    p = Path(path)
    s = p.read_text(encoding='utf-8')
    n = s.count(old)
    if n != 1:
        raise SystemExit(f'{path}: expected one match, got {n}: {old[:80]!r}')
    p.write_text(s.replace(old, new, 1), encoding='utf-8')

# Network Settings: preserve the manually proven body but execute it in the
# elevated interactive user token that matched the successful real test.
replace_once(
    'server/modules/commands/index.js',
    'nativeUserSession: true, cmd:',
    'elevatedUserSession: true, cmd:'
)
replace_once(
    'server/modules/commands/index.js',
    'nativeUserSession: found.command.nativeUserSession === true',
    'elevatedUserSession: found.command.elevatedUserSession === true'
)

p = Path('server/core/logged-on-user-command-policy.js')
s = p.read_text(encoding='utf-8')
s = s.replace(
    '    var commandType = Number(command && command.type) === 1 ? 1 : 2;\n',
    '    var commandType = Number(command && command.type) === 1 ? 1 : 2;\n    var runLevel = command && command.elevatedUserSession === true ? "Highest" : "Limited";\n',
    1
)
s = s.replace(
    '        "$principal=New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Limited",\n',
    '        "$principal=New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel " + runLevel,\n',
    1
)
old_bypass = '''    // Trusted built-in native Shell UI commands must use MeshAgent UserOnly directly.\n    // The scheduled-task wrapper exists for profile/env/output semantics and changes\n    // the COM/UI launch chain that Network Settings requires.\n    if (command.nativeUserSession === true && runAsUser === 2) return command;\n'''
if old_bypass not in s:
    raise SystemExit('logged-on-user policy: dev40 native bypass block not found')
s = s.replace(old_bypass, '''    // Interactive GUI commands reuse this single launcher owner. Trusted built-ins may\n    // request the elevated interactive token; ordinary user commands remain Limited.\n''', 1)
p.write_text(s, encoding='utf-8')

# Admin: derive the visual surface from the actual page-43 iframe ancestry,
# not from parent.body which can remain transparent/stable in Modern themes.
p = Path('web/admin/admin.js')
s = p.read_text(encoding='utf-8')
marker = '''    function hostIsDark() {\n        var hostBody = hostDocument && hostDocument.body;\n'''
helper = '''    function hostSurfaceStyle() {\n        if (!hostDocument || !hostWindow || typeof hostWindow.getComputedStyle !== "function") return null;\n        var candidate = hostDocument.getElementById ? hostDocument.getElementById("p43iframe") : null;\n        candidate = candidate && candidate.parentElement ? candidate.parentElement : null;\n        while (candidate) {\n            var candidateStyle = hostWindow.getComputedStyle(candidate);\n            if (candidateStyle && colorParts(candidateStyle.backgroundColor)) {\n                return { element: candidate, style: candidateStyle };\n            }\n            candidate = candidate.parentElement;\n        }\n        var hostBody = hostDocument.body;\n        return hostBody ? { element: hostBody, style: hostWindow.getComputedStyle(hostBody) } : null;\n    }\n\n    function hostIsDark() {\n        var hostBody = hostDocument && hostDocument.body;\n'''
if s.count(marker) != 1:
    raise SystemExit('admin.js: hostIsDark marker mismatch')
s = s.replace(marker, helper, 1)
s = s.replace(
    '        var bodyStyle = hostBody && hostWindow.getComputedStyle ? hostWindow.getComputedStyle(hostBody) : null;\n        var background = bodyStyle && colorParts(bodyStyle.backgroundColor);\n',
    '        var surface = hostSurfaceStyle();\n        var bodyStyle = hostBody && hostWindow.getComputedStyle ? hostWindow.getComputedStyle(hostBody) : null;\n        var surfaceStyle = surface && surface.style;\n        var background = surfaceStyle && colorParts(surfaceStyle.backgroundColor);\n',
    1
)
s = s.replace(
    '        var foreground = bodyStyle && colorParts(bodyStyle.color);\n',
    '        var foreground = (surfaceStyle && colorParts(surfaceStyle.color)) || (bodyStyle && colorParts(bodyStyle.color));\n',
    1
)
old_copy = '''                var hostBody = hostDocument && hostDocument.body;\n                if (hostBody && hostWindow.getComputedStyle) {\n                    var hostStyle = hostWindow.getComputedStyle(hostBody);\n                    root.parentElement.style.backgroundColor = hostStyle.backgroundColor || "";\n                    root.parentElement.style.color = hostStyle.color || "";\n                }\n'''
new_copy = '''                var surface = hostSurfaceStyle();\n                var hostStyle = surface && surface.style;\n                if (hostStyle) {\n                    root.parentElement.style.backgroundColor = hostStyle.backgroundColor || "";\n                    root.parentElement.style.color = hostStyle.color || "";\n                }\n'''
if s.count(old_copy) != 1:
    raise SystemExit('admin.js: host body surface copy mismatch')
s = s.replace(old_copy, new_copy, 1)
p.write_text(s, encoding='utf-8')

# Targeted Network catalog regression.
p = Path('test/network-command-split.test.js')
s = p.read_text(encoding='utf-8')
s = s.replace(
    "assert.ok(properties.indexOf('type: 2') >= 0 && properties.indexOf('nativeUserSession: true') >= 0,\n    \"Network Settings must execute as direct PowerShell through the native MeshAgent UserOnly session, not the script-oriented scheduled-task wrapper.\");",
    "assert.ok(properties.indexOf('type: 2') >= 0 && properties.indexOf('elevatedUserSession: true') >= 0,\n    \"Network Settings must request the trusted elevated interactive user token that matches the manually proven Administrator context.\");",
    1
)
s = s.replace(
    "assert.ok(server.indexOf('nativeUserSession: found.command.nativeUserSession === true') >= 0,\n    \"Built-in execution must preserve the trusted native-user-session marker from the canonical catalog.\");",
    "assert.ok(server.indexOf('elevatedUserSession: found.command.elevatedUserSession === true') >= 0,\n    \"Built-in execution must preserve the trusted elevated-user-session marker from the canonical catalog.\");",
    1
)
p.write_text(s, encoding='utf-8')

# Shared policy regression: normal user command stays Limited; Network is wrapped once with Highest.
p = Path('test/logged-on-user-command-policy.test.js')
s = p.read_text(encoding='utf-8')
s = s.replace('    nativeUserSession: true,\n', '    elevatedUserSession: true,\n', 1)
old = '''        var transformedNetwork = captured[1].command;\n        assert.strictEqual(transformedNetwork, networkSettingsCmd,\n            "Trusted native Shell UI commands must bypass the script-oriented scheduled-task wrapper.");\n        assert.strictEqual(transformedNetwork.runAsUser, 2,\n            "Network Settings must reach MeshAgent as strict UserOnly.");\n        assert.strictEqual(transformedNetwork.type, 2,\n            "Network Settings must remain direct PowerShell.");\n        assert.strictEqual(transformedNetwork.cmd.indexOf("SIRK-UserCommand-"), -1,\n            "Network Settings must not be rewritten through the logged-on-user scheduled-task wrapper.");\n'''
new = '''        var transformedNetwork = captured[1].command;\n        assert.notStrictEqual(transformedNetwork, networkSettingsCmd,\n            "Network Settings must use the shared interactive-user launcher so its elevation is explicit and bounded.");\n        assert.strictEqual(transformedNetwork.runAsUser, 0,\n            "The elevated interactive-user launcher itself must still be started by the LocalSystem MeshAgent service.");\n        assert.strictEqual(transformedNetwork.type, 2,\n            "The elevated launcher must remain PowerShell.");\n        assert.ok(transformedNetwork.cmd.indexOf("New-ScheduledTaskPrincipal -UserId $userName -LogonType Interactive -RunLevel Highest") >= 0,\n            "Network Settings must match the manually proven elevated Administrator token using RunLevel Highest.");\n        assert.ok(decodedPayloads(transformedNetwork.cmd).some(function (value) { return value.indexOf("$verb.DoIt()") >= 0; }),\n            "The proven FolderItemVerb body must be preserved inside the elevated launcher.");\n'''
if s.count(old) != 1:
    raise SystemExit('logged-on-user test: dev40 network expectations not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# Admin regression: effective surface is p43 iframe ancestry, not host body.
p = Path('test/admin-host-theme-signal.test.js')
s = p.read_text(encoding='utf-8')
s = s.replace(
    'var hostThemeStart = admin.indexOf("function hostIsDark()");',
    'var hostThemeStart = admin.indexOf("function hostSurfaceStyle()");',
    1
)
s = s.replace(
    'var evaluateHostTheme = new Function("hostWindow", "hostDocument", "colorParts", hostThemeSource + "\\nreturn hostIsDark();");',
    'var evaluateHostTheme = new Function("hostWindow", "hostDocument", "colorParts", hostThemeSource + "\\nreturn hostIsDark();");',
    1
)
old_assert = '''assert.ok(admin.indexOf('root.parentElement.style.backgroundColor = hostStyle.backgroundColor || "";') >= 0 &&\n    admin.indexOf('root.parentElement.style.color = hostStyle.color || "";') >= 0,\n    "The iframe Admin surface must copy the effective host surface colors instead of owning a private palette.");\n'''
new_assert = '''assert.ok(admin.indexOf('hostDocument.getElementById("p43iframe")') >= 0 &&\n    admin.indexOf('candidate = candidate && candidate.parentElement ? candidate.parentElement : null;') >= 0 &&\n    admin.indexOf('colorParts(candidateStyle.backgroundColor)') >= 0,\n    "Admin must resolve the actual opaque page-43 surface surrounding the plugin iframe instead of assuming parent.body is the painted surface.");\nassert.ok(admin.indexOf('var surface = hostSurfaceStyle();') >= 0 &&\n    admin.indexOf('root.parentElement.style.backgroundColor = hostStyle.backgroundColor || "";') >= 0 &&\n    admin.indexOf('root.parentElement.style.color = hostStyle.color || "";') >= 0,\n    "The iframe Admin body must copy effective page-43 surface colors instead of owning a private palette.");\n'''
if s.count(old_assert) != 1:
    raise SystemExit('admin test: old host surface assertion not found')
s = s.replace(old_assert, new_assert, 1)
p.write_text(s, encoding='utf-8')

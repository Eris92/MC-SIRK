from pathlib import Path

# Network Settings: keep the proven PowerShell body, but execute it directly through
# the canonical logged-on-user policy instead of detaching powershell.exe from CMD.
commands_path = Path('server/modules/commands/index.js')
commands = commands_path.read_text(encoding='utf-8')
lines = commands.splitlines(keepends=True)
changed = 0
for i, line in enumerate(lines):
    if '{ id: "network-adapter-properties"' not in line:
        continue
    old_prefix = 'type: 1, runAsUser: 2, cmd: "start \\\"\\\" powershell.exe -NoProfile -WindowStyle Hidden -Command \\\"'
    old_suffix = '$verb.DoIt()\\\"" },'
    if old_prefix not in line or old_suffix not in line:
        raise RuntimeError('Unexpected Network Settings command shape')
    line = line.replace(old_prefix, 'type: 2, runAsUser: 2, cmd: "', 1)
    line = line.replace(old_suffix, '$verb.DoIt()" },', 1)
    lines[i] = line
    changed += 1
if changed != 1:
    raise RuntimeError(f'Expected one Network Settings entry, changed={changed}')
commands_path.write_text(''.join(lines), encoding='utf-8')

# Admin: prefer explicit parent Bootstrap theme when present; retain parent Classic
# nightMode/body.night and the existing copied host surface as fallbacks.
admin_path = Path('web/admin/admin.js')
admin = admin_path.read_text(encoding='utf-8')
old = '''    function hostIsDark() {\n        if (typeof hostWindow.nightMode === "boolean") return hostWindow.nightMode;\n        var hostBody = hostDocument && hostDocument.body;\n        if (hostBody && hostBody.classList.contains("night")) return true;\n        var htmlTheme = hostDocument && hostDocument.documentElement && hostDocument.documentElement.getAttribute("data-bs-theme");\n        if (htmlTheme === "dark") return true;\n        if (htmlTheme === "light") return false;\n        var bodyTheme = hostBody && hostBody.getAttribute("data-bs-theme");\n        if (bodyTheme === "dark") return true;\n        if (bodyTheme === "light") return false;\n'''
new = '''    function hostIsDark() {\n        var hostBody = hostDocument && hostDocument.body;\n        var htmlTheme = hostDocument && hostDocument.documentElement && hostDocument.documentElement.getAttribute("data-bs-theme");\n        if (htmlTheme === "dark") return true;\n        if (htmlTheme === "light") return false;\n        var bodyTheme = hostBody && hostBody.getAttribute("data-bs-theme");\n        if (bodyTheme === "dark") return true;\n        if (bodyTheme === "light") return false;\n        if (hostBody && hostBody.classList.contains("night")) return true;\n        if (typeof hostWindow.nightMode === "boolean") return hostWindow.nightMode;\n'''
if admin.count(old) != 1:
    raise RuntimeError('Unexpected Admin hostIsDark shape')
admin_path.write_text(admin.replace(old, new, 1), encoding='utf-8')

# Network regression: execution mode itself is part of the contract.
test_path = Path('test/network-command-split.test.js')
test = test_path.read_text(encoding='utf-8')
marker = '''assert.ok(properties.indexOf('runAsUser: 2') >= 0,\n    "Adapter properties must run in the interactive user context.");\n'''
insert = marker + '''assert.ok(properties.indexOf('type: 2') >= 0,\n    "Network Settings must execute as direct PowerShell so the shared logged-on-user runner owns the full UI operation lifetime.");\nassert.strictEqual(properties.indexOf('powershell.exe'), -1,\n    "Network Settings must not detach a nested powershell.exe process from the canonical logged-on-user runner.");\nassert.strictEqual(properties.indexOf('start \\\"\\\"'), -1,\n    "Network Settings must not use CMD start for adapter properties because it returns before the UI operation completes.");\n'''
if test.count(marker) != 1:
    raise RuntimeError('Unexpected network test insertion point')
test_path.write_text(test.replace(marker, insert, 1), encoding='utf-8')

# Admin regression: parent data-bs-theme must win over a stale legacy nightMode value.
admin_test_path = Path('test/admin-host-theme-signal.test.js')
admin_test = admin_test_path.read_text(encoding='utf-8')
old_assert = '''var nightModeCheck = admin.indexOf('typeof hostWindow.nightMode === "boolean"');\nvar htmlThemeCheck = admin.indexOf('hostDocument.documentElement.getAttribute("data-bs-theme")');\nassert.ok(nightModeCheck >= 0 && htmlThemeCheck > nightModeCheck,\n    "MeshCentral parent nightMode must be the primary host theme state; data-bs-theme is fallback only.");\n'''
new_assert = '''var nightModeCheck = admin.indexOf('typeof hostWindow.nightMode === "boolean"');\nvar htmlThemeCheck = admin.indexOf('hostDocument.documentElement.getAttribute("data-bs-theme")');\nassert.ok(htmlThemeCheck >= 0 && nightModeCheck > htmlThemeCheck,\n    "Explicit parent data-bs-theme must win over a stale legacy nightMode value when Modern MeshCentral exposes it.");\n\nvar hostThemeStart = admin.indexOf("function hostIsDark()");\nvar hostThemeEnd = admin.indexOf("function syncHostTheme()", hostThemeStart);\nvar hostThemeSource = admin.slice(hostThemeStart, hostThemeEnd);\nvar evaluateHostTheme = new Function("hostWindow", "hostDocument", "colorParts", hostThemeSource + "\\nreturn hostIsDark();");\nfunction fakeDocument(theme) {\n    return {\n        documentElement: { getAttribute: function (name) { return name === "data-bs-theme" ? theme : null; } },\n        body: {\n            getAttribute: function () { return null; },\n            classList: { contains: function () { return false; } }\n        }\n    };\n}\nassert.strictEqual(evaluateHostTheme({ nightMode: false }, fakeDocument("dark"), function () { return null; }), true,\n    "Modern parent dark data-bs-theme must override stale nightMode=false.");\nassert.strictEqual(evaluateHostTheme({ nightMode: true }, fakeDocument("light"), function () { return null; }), false,\n    "Modern parent light data-bs-theme must override stale nightMode=true.");\n'''
if admin_test.count(old_assert) != 1:
    raise RuntimeError('Unexpected admin theme test shape')
admin_test_path.write_text(admin_test.replace(old_assert, new_assert, 1), encoding='utf-8')

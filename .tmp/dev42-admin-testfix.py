from pathlib import Path
p = Path('test/admin-disclosure-contract.test.js')
text = p.read_text(encoding='utf-8')
old = '''assert.ok(browser.indexOf('disclosure(host, "mc-admin-provider-card mc-admin-permission-module", title, false)') >= 0,\n    "My Commands and My Scripts permission modules must be collapsible.");'''
new = '''assert.ok(browser.indexOf('disclosure(host, "mc-admin-provider-card mc-admin-permission-module", sectionTitle || title, false)') >= 0,\n    "Module-local Permissions must reuse the same collapsible permission renderer.");'''
if old not in text:
    raise SystemExit('stale disclosure assertion marker not found')
p.write_text(text.replace(old, new, 1), encoding='utf-8')

from pathlib import Path
p = Path('test/admin-host-theme-signal.test.js')
text = p.read_text(encoding='utf-8')
text = text.replace(
'''assert.ok(admin.indexOf('new hostWindow.MutationObserver(syncHostTheme)') >= 0,\n    "Host theme changes must reuse one direct observer in the parent window realm.");\n''',
'''assert.ok(admin.indexOf('observer = new hostWindow.MutationObserver(function ()') >= 0 &&\n    admin.indexOf('new hostWindow.MutationObserver', admin.indexOf('observer = new hostWindow.MutationObserver(function ()') + 1) < 0,\n    "Host theme changes must reuse exactly one observer in the parent window realm.");\n''', 1)
text = text.replace(
'''assert.ok(admin.indexOf('hostDocument.getElementById("theme-stylesheet")') >= 0 &&\n    admin.indexOf('observer.observe(themeStylesheet, { attributes: true, attributeFilter: ["href"] })') >= 0 &&\n    admin.indexOf('themeStylesheet.addEventListener("load", syncHostTheme)') >= 0,\n    "The same observer must follow Modern MeshCentral Bootswatch href changes and resync after the stylesheet loads.");\n''',
'''assert.ok(admin.indexOf('hostDocument.getElementById("theme-stylesheet")') >= 0 &&\n    admin.indexOf('observer.observe(observedStylesheet, { attributes: true, attributeFilter: ["href"] })') >= 0 &&\n    admin.indexOf('observedStylesheet.addEventListener("load", syncHostTheme)') >= 0 &&\n    admin.indexOf('observedStylesheet.removeEventListener("load", syncHostTheme)') >= 0,\n    "The same observer must follow and rebind replaced Modern MeshCentral Bootswatch stylesheets without leaking load handlers.");\n''', 1)
p.write_text(text, encoding='utf-8')

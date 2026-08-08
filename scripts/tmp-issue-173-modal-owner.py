from pathlib import Path

root = Path(__file__).resolve().parents[1]

def replace_once(path, old, new):
    p = root / path
    text = p.read_text(encoding="utf-8")
    if text.count(old) != 1:
        raise SystemExit(f"Expected one match in {path}: {old!r}, got {text.count(old)}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")

replace_once(
    "public/shared/ui/toolbar-config.js",
    '        "card", "modal-content", "form-control", "form-select", "form-check-input", "table", "table-sm",',
    '        "card", "modal", "modal-content", "form-control", "form-select", "form-check-input", "table", "table-sm",'
)
replace_once(
    "public/shared/ui/toolbar-config.js",
    '    var PLUGIN_ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog";',
    '    var PLUGIN_ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog-overlay,.mc-move-dialog";'
)
replace_once(
    "public/shared/ui/toolbar-config.js",
    '        queryAll(root, ".mc-shared-toolbar-button,.mc-tree-script-action,.mc-results-view-button,.mc-results-copy-button,.mc-definition-remove,.mc-command-run-button,.mc-admin-primary,.mc-admin-secondary,.mc-admin-toolbar button,.mc-admin-inline-actions button,.mc-admin-table-actions button,.mc-move-dialog-actions button,.sirk-quick-command-fallback-close,.sirk-quick-command-submit", function (element) { applyButton(element); });',
    '        queryAll(root, ".mc-move-dialog-overlay", function (element) { syncOwnedClasses(element, modern ? ["modal"] : []); });\n        queryAll(root, ".mc-shared-toolbar-button,.mc-tree-script-action,.mc-results-view-button,.mc-results-copy-button,.mc-definition-remove,.mc-command-run-button,.mc-admin-primary,.mc-admin-secondary,.mc-admin-toolbar button,.mc-admin-inline-actions button,.mc-admin-table-actions button,.mc-move-dialog-actions button,.sirk-quick-command-fallback-close,.sirk-quick-command-submit", function (element) { applyButton(element); });'
)
replace_once(
    "public/modules/move-requests/index.js",
    '            document.body.appendChild(overlay);',
    '            if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.refresh === "function") {\n                window.MeshThemeAdapter.refresh(overlay);\n            }\n            document.body.appendChild(overlay);'
)

surface = root / "test/move-request-dialog-surface.test.js"
text = surface.read_text(encoding="utf-8")
text = text.replace(
    'var theme = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");',
    'var theme = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");\nvar source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");'
)
text = text.replace(
    'assert.ok(theme.indexOf(\'"card", "modal-content", "form-control"\') >= 0,\n    "MeshThemeAdapter must own modal-content so theme changes can remove stale card/modal classes atomically.");',
    'assert.ok(theme.indexOf(\'"card", "modal", "modal-content", "form-control"\') >= 0,\n    "MeshThemeAdapter must own both modal and modal-content so Modern surface variables and stale classes stay under one owner.");'
)
anchor = '''assert.ok(theme.indexOf('element.classList.contains("mc-move-dialog")') >= 0 &&\n    theme.indexOf('isModern() ? "modal-content" : "style10"') >= 0,\n    "Move Request must reuse the existing shared surface adapter but map to native modal-content in Modern and style10 in Classic.");\n'''
addition = anchor + '''assert.ok(theme.indexOf('PLUGIN_ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog-overlay,.mc-move-dialog"') >= 0,\n    "The existing theme observer must own the Move Request overlay so the native modal variable scope is refreshed with the dialog.");\nassert.ok(theme.indexOf('queryAll(root, ".mc-move-dialog-overlay", function (element) { syncOwnedClasses(element, modern ? ["modal"] : []); });') >= 0,\n    "Modern Move Request overlay must receive native modal ownership while Classic removes the Bootstrap modal class.");\nassert.ok(source.indexOf('window.MeshThemeAdapter.refresh(overlay);') >= 0 &&\n    source.indexOf('window.MeshThemeAdapter.refresh(overlay);') < source.indexOf('document.body.appendChild(overlay);'),\n    "Move Request must apply the existing theme adapter to the complete detached overlay before first paint.");\n'''
if anchor not in text:
    raise SystemExit("Surface test anchor not found")
text = text.replace(anchor, addition, 1)
surface.write_text(text, encoding="utf-8")

replace_once(
    "test/shared-workspace-surface.test.js",
    'assert.ok(themeAdapter.indexOf(\'var PLUGIN_ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog"\') >= 0,\n    "The native adapter must recognize every SIRK surface root.");',
    'assert.ok(themeAdapter.indexOf(\'var PLUGIN_ROOT_SELECTOR = ".mc-shared-page,#sirk-platform-admin,.sirk-desktop-commands-panel,.mc-results-viewer,.mc-move-dialog-overlay,.mc-move-dialog"\') >= 0,\n    "The native adapter must recognize every SIRK surface root, including the modal variable-owner overlay.");'
)

# Temporary validation helpers must never survive into the validated commit.
(root / ".github/workflows/issue-173-modal-owner-validate.yml").unlink(missing_ok=True)
Path(__file__).unlink(missing_ok=True)

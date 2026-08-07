from pathlib import Path


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, got {count}")
    return text.replace(old, new, 1)

commands_path = Path("public/modules/commands/index.js")
commands = commands_path.read_text(encoding="utf-8")
commands = once(
    commands,
    '        "Flush DNS": "Wyczyść DNS", "Check DNS": "Sprawdź DNS", "Check port": "Sprawdź port",\n',
    '        "Flush DNS": "Wyczyść DNS", "Active network adapter settings": "Ustawienia aktywnej karty sieciowej", "Check DNS": "Sprawdź DNS", "Check port": "Sprawdź port",\n',
    "add network settings translation"
)
commands = once(
    commands,
    "        flushdns: '<svg viewBox=\"0 0 24 24\"><path d=\"M4 6h16v12H4z\"/><path d=\"M8 10h8M8 14h5M18 3v5M15.5 5.5 18 8l2.5-2.5\"/></svg>',\n",
    "        flushdns: '<svg viewBox=\"0 0 24 24\"><path d=\"M4 6h16v12H4z\"/><path d=\"M8 10h8M8 14h5M18 3v5M15.5 5.5 18 8l2.5-2.5\"/></svg>',\n        \"network-settings\": '<svg viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"5\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 21h8M12 17v4M7 9h10M7 13h6\"/><circle cx=\"18\" cy=\"15\" r=\"3\"/><path d=\"M18 10v2M18 18v2M13 15h2M21 15h2\"/></svg>',\n",
    "add network settings artwork"
)
old_system = "        system: '<svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1\"/></svg>',\n"
new_system = "        system: '<svg viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"m15.5 4.8.8 2.1 2.2.8 2-1 .9 1.6-1.8 1.4.3 2.3 2.3.8v2l-2.3.8-.3 2.3 1.8 1.4-.9 1.6-2-1-2.2.8-.8 2.1h-2l-.8-2.1-2.2-.8-2 1-.9-1.6 1.8-1.4-.3-2.3-2.3-.8v-2l2.3-.8.3-2.3-1.8-1.4.9-1.6 2 1 2.2-.8.8-2.1h2Z\"/></svg>',\n"
commands = once(commands, old_system, new_system, "replace System sun with gear")
commands = once(
    commands,
    '    function commandPath(category, command) { return "@command/" + category.key + "/" + command.id; }\n',
    '    function commandPath(category, command) { return "@command/" + category.key + "/" + command.id; }\n    function tonedIcon(markup, tone) { return String(markup || "").replace("<svg ", "<svg class=\\\"sirk-command-icon sirk-command-icon-" + String(tone || "other") + "\\\" "); }\n',
    "add semantic icon helper"
)
commands = once(commands, 'iconMarkup: MENU_ICONS.scripts, children:', 'iconMarkup: tonedIcon(MENU_ICONS.scripts, "scripts"), children:', "color scripts root")
commands = once(commands, 'iconMarkup: MENU_ICONS[category.key] || MENU_ICONS.other,\n', 'iconMarkup: tonedIcon(MENU_ICONS[category.key] || MENU_ICONS.other, category.key),\n', "color command category")
commands = once(commands, 'iconMarkup: ICONS[command.id] || ICONS.mmc\n', 'iconMarkup: tonedIcon(ICONS[command.id] || ICONS.mmc, category.key)\n', "color command item")
commands_path.write_text(commands, encoding="utf-8")

core_path = Path("public/shared/core.js")
core = core_path.read_text(encoding="utf-8")
core = once(core, '    var menuIcons = {\n', '    var modernMenuIcons = {\n', "rename modern icons")
modern_end = '''        mycommands: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="9" width="52" height="46" rx="6" fill="#263238"/><path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="m17 23 9 9-9 9m15 1h15"/></svg>')
    };
'''
classic = modern_end + '''    var classicMenuIcons = {
        approvalcenter: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="13" y="9" width="34" height="46" rx="3" fill="none" stroke="#666" stroke-width="4"/><path d="M21 24h18M21 33h12" fill="none" stroke="#666" stroke-width="4"/><path d="m35 45 5 5 10-12" fill="none" stroke="#666" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
        myscripts: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M13 5h30l9 9v45H13Z M43 5v13h9" fill="none" stroke="#666" stroke-width="4" stroke-linejoin="round"/><path d="m25 29-7 6 7 6m14-12 7 6-7 6m-4-16-6 20" fill="none" stroke="#666" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
        mycommands: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="9" width="52" height="46" rx="6" fill="none" stroke="#666" stroke-width="4"/><path d="m17 23 9 9-9 9m15 10h15" fill="none" stroke="#666" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    };
'''
core = once(core, modern_end, classic, "add classic icon family")
core = once(
    core,
    '        var iconSource = definition.icon || menuIcons[key] || "";\n',
    '        var useModernIcons = !(window.SirkIconMode && typeof window.SirkIconMode.useModern === "function") || window.SirkIconMode.useModern();\n        var family = useModernIcons ? modernMenuIcons : classicMenuIcons;\n        var iconSource = definition.icon || family[key] || modernMenuIcons[key] || "";\n',
    "consume icon mode"
)
core_path.write_text(core, encoding="utf-8")

css_path = Path("public/shared/ui/toolbar.css")
css = css_path.read_text(encoding="utf-8")
marker = '.sirk-quick-command-toolbar-host{padding:8px 10px 10px}'
colors = '.sirk-command-icon-scripts{color:var(--bs-primary,#0d6efd)}.sirk-command-icon-network{color:var(--bs-info,#0dcaf0)}.sirk-command-icon-system{color:var(--bs-warning,#ffc107)}.sirk-command-icon-other{color:var(--bs-secondary,#6c757d)}'
if colors not in css:
    css = css.replace(marker, colors + marker, 1)
css_path.write_text(css, encoding="utf-8")

print("Commands icons and icon-mode integration applied")

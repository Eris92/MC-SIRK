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
    'favorites: { side: "left", order: 20, onClick: function (toolbar) { tools.toggleFavorites(toolbar, function () { treeState.selectedScript = ""; module.api.render(); }); } },',
    'favorites: { side: "left", order: 20, onClick: function (toolbar) { tools.toggleFavorites(toolbar, function () { mode = "commands"; treeState.selectedScript = ""; module.api.render(); }); } },',
    "Commands Favorites must leave Results"
)
commands_path.write_text(commands, encoding="utf-8")

automation_path = Path("public/modules/automation/index.js")
automation = automation_path.read_text(encoding="utf-8")
automation = once(
    automation,
    '''                    tools.toggleFavorites(toolbar, function () {
                        treeState.selectedScript = "";
                        module.api.render();
                    });''',
    '''                    tools.toggleFavorites(toolbar, function () {
                        mode = "scripts";
                        treeState.selectedScript = "";
                        module.api.render();
                    });''',
    "My Scripts Favorites must leave Results"
)
automation_path.write_text(automation, encoding="utf-8")

theme_path = Path("public/shared/ui/toolbar-config.js")
theme = theme_path.read_text(encoding="utf-8")
theme = once(
    theme,
    '        "btn", "btn-primary", "btn-secondary", "btn-success", "btn-danger", "btn-sm",',
    '        "btn", "btn-primary", "btn-secondary", "btn-success", "btn-danger", "btn-warning", "btn-sm",',
    "own warning variant"
)
theme = once(
    theme,
    '        if (element.classList.contains("sirk-action-approve")) return "success";\n',
    '        if (element.classList.contains("sirk-action-approve")) return "success";\n        if (element.classList.contains("mc-tree-favorite-action") && active(element)) return "warning";\n',
    "favorite active variant"
)
theme_path.write_text(theme, encoding="utf-8")

print("Favorites behavior consolidated")

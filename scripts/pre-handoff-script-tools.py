from pathlib import Path


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, got {count}")
    return text.replace(old, new, 1)


tools_path = Path("public/shared/ui/script-tools.js")
tools = tools_path.read_text(encoding="utf-8")
form = Path("public/shared/ui/script-definition-form.js").read_text(encoding="utf-8")

# Reuse the already-proven rich definition editor, but make it a local helper
# of SharedScriptTools instead of a global create() decorator.
helper_start = form.index("    function element(")
helper_end = form.index("    window.SharedScriptTools.create = function", helper_start)
helpers = form[helper_start:helper_end]

helpers = once(
    helpers,
    '                var runAs = createSelect(["0", "1", "2"], String(value.runAsUser || 0));\n                Array.prototype.forEach.call(runAs.options, function (option) {\n                    option.textContent = option.value === "1" ? "Logged-on user" : option.value === "2" ? "SYSTEM" : "Default";\n                });\n',
    '                var runAs = createSelect(["0", "2"], String(value.runAsUser || 0));\n                Array.prototype.forEach.call(runAs.options, function (option) {\n                    option.textContent = option.value === "2" ? "Logged-on user" : "SYSTEM";\n                });\n',
    "canonical run-as values"
)

multi_anchor = '''                multiLabel.appendChild(multi);
                multiLabel.appendChild(document.createTextNode(" Allow multi-device execution"));
                execution.appendChild(multiLabel);
'''
confirm_block = multi_anchor + '''                var confirmLabel = element("label", "mc-definition-check");
                var confirmExecution = element("input");
                confirmExecution.type = "checkbox";
                confirmExecution.checked = value.confirmExecution === true;
                confirmLabel.appendChild(confirmExecution);
                confirmLabel.appendChild(document.createTextNode(" Require confirmation before execution"));
                execution.appendChild(confirmLabel);
'''
helpers = once(helpers, multi_anchor, confirm_block, "add confirmation control")
helpers = once(
    helpers,
    '                                multiHost: multi.checked,\n                                showOnDesktop: showOnDesktop.checked,\n',
    '                                multiHost: multi.checked,\n                                confirmExecution: confirmExecution.checked,\n                                showOnDesktop: showOnDesktop.checked,\n',
    "persist confirmation"
)

insert_at = tools.index("    window.SharedScriptTools = {")
tools = tools[:insert_at] + helpers + "\n" + tools[insert_at:]

# Remove the old basic editor; installDefinitionEditor() above is the only editor.
old_editor_start = tools.index("            function openDefinitionEditor(")
old_editor_end = tools.index("            function openCredentialsEditor(", old_editor_start)
tools = tools[:old_editor_start] + tools[old_editor_end:]

# Turn the returned literal into a local tool object so the rich editor can be
# installed once, synchronously, without rewriting the global factory.
tools = once(
    tools,
    "            return {\n                state: state, isFavorite: isFavorite, toggleFavorite: toggleFavorite, copyText: copyText,\n",
    "            var tool = {\n                state: state, isFavorite: isFavorite, toggleFavorite: toggleFavorite, copyText: copyText,\n",
    "create local tool object"
)
old_tail = '''                    return actions;
                }
            };
        }
    };
}());'''
new_tail = '''                    return actions;
                }
            };
            installDefinitionEditor(tool);
            return tool;
        }
    };
}());'''
tools = once(tools, old_tail, new_tail, "install local definition editor")

tools_path.write_text(tools, encoding="utf-8")

# The rich editor now owns all of these responsibilities.
for relative in [
    "public/shared/ui/script-definition-form.js",
    "public/shared/ui/confirm-execution-form.js",
    "public/shared/ui/script-edit-actions.js",
    "public/shared/ui/system-credentials-form.js",
]:
    Path(relative).unlink()

# Remove deleted browser assets from both loader and asset router.
plugin_path = Path("plugin-main.js")
plugin = plugin_path.read_text(encoding="utf-8")
for line in [
    '            ["sirk-platform-script-definition", "shared-ui/script-definition-form.js"],\n',
    '            ["sirk-platform-confirm", "shared-ui/confirm-execution-form.js"],\n',
    '            ["sirk-platform-edit-actions", "shared-ui/script-edit-actions.js"],\n',
    '            ["sirk-platform-credentials", "shared-ui/system-credentials-form.js"],\n',
]:
    if line not in plugin:
        raise SystemExit(f"plugin-main asset line missing: {line.strip()}")
    plugin = plugin.replace(line, "", 1)
plugin_path.write_text(plugin, encoding="utf-8")

admin_path = Path("admin.js")
admin = admin_path.read_text(encoding="utf-8")
for line in [
    '        "shared-ui/script-definition-form.js": ["public/shared/ui/script-definition-form.js", "text/javascript; charset=utf-8"],\n',
    '        "shared-ui/confirm-execution-form.js": ["public/shared/ui/confirm-execution-form.js", "text/javascript; charset=utf-8"],\n',
    '        "shared-ui/script-edit-actions.js": ["public/shared/ui/script-edit-actions.js", "text/javascript; charset=utf-8"],\n',
    '        "shared-ui/system-credentials-form.js": ["public/shared/ui/system-credentials-form.js", "text/javascript; charset=utf-8"],\n',
]:
    if line not in admin:
        raise SystemExit(f"admin asset line missing: {line.strip()}")
    admin = admin.replace(line, "", 1)
admin_path.write_text(admin, encoding="utf-8")

print("Script tool decorators consolidated")

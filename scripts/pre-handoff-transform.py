from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, got {count}")
    return text.replace(old, new, 1)


quick_path = Path("public/native/desktop-commands.js")
quick = quick_path.read_text(encoding="utf-8")
quick = quick.replace('    if (window.__sirkDesktopCommandsTimer) window.clearInterval(window.__sirkDesktopCommandsTimer);\n', '')

start = quick.index('    var PREFERENCES_KEY = "sirkPlatform.mycommands.preferences";')
end = quick.index('    var TEXT = {', start)
quick = quick[:start] + '''    var PREFERENCES_KEY = "sirkPlatform.mycommands.preferences";

    function readPreferences() {
        try {
            var value = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) || "{}");
            return value && typeof value === "object" && !Array.isArray(value) ? value : {};
        } catch (error) { return {}; }
    }
    function writePreferences(values) {
        try {
            var current = readPreferences();
            Object.keys(values || {}).forEach(function (key) { current[key] = values[key]; });
            window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(current));
        } catch (error) {}
    }

    var preferences = readPreferences();
    var state = {
        data: null,
        category: "",
        search: "",
        searchVisible: false,
        favoritesOnly: preferences.quickFavoritesOnly === true,
        collapsed: preferences.quickCollapsed === true,
        detailsCollapsed: preferences.quickDetailsCollapsed === true,
        outputAttention: false,
        outputPending: false,
        expanded: {},
        detail: null,
        output: "",
        outputError: false,
        refreshing: false
    };

''' + quick[end:]

old_read = '''    function readPreferences() {
        try {
            var value = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) || "{}");
            return value && typeof value === "object" ? value : {};
        } catch (error) { return {}; }
    }
'''
quick = replace_once(quick, old_read, '', 'remove duplicate readPreferences')

old_write_details = '''    function writeDetailsCollapsed(value) {
        state.detailsCollapsed = value === true;
        try { window.localStorage.setItem(DETAILS_COLLAPSED_KEY, state.detailsCollapsed ? "1" : "0"); }
        catch (error) {}
    }
'''
new_write_details = '''    function writeDetailsCollapsed(value) {
        state.detailsCollapsed = value === true;
        if (!state.detailsCollapsed) state.outputAttention = false;
        writePreferences({ quickDetailsCollapsed: state.detailsCollapsed });
    }
'''
quick = replace_once(quick, old_write_details, new_write_details, 'replace details preference')

old_set_output = '''    function setOutput(panel, value, isError) {
        state.output = String(value == null ? "" : value);
        state.outputError = isError === true;
        var status = statusNode(panel);
        if (!status) return;
        status.textContent = state.output;
        status.classList.toggle("is-error", state.outputError);
    }
    function showDetails(panel) {
        if (!state.detailsCollapsed) return;
        writeDetailsCollapsed(false);
        render(panel);
    }
'''
new_set_output = '''    function transientOutput(value) {
        return /^(Ładowanie poleceń|Loading commands|Polecenie wysłano do agenta|Command sent to the agent|Lista poleceń została odświeżona|Command list refreshed)/i.test(String(value || "").trim());
    }
    function syncOutputAttention(panel) {
        var button = panel && panel.querySelector('.sirk-quick-command-details-toggle,[data-sirk-toolbar-key="details"]');
        if (button) button.classList.toggle("has-output-attention", state.outputAttention === true);
    }
    function setOutput(panel, value, isError) {
        var next = String(value == null ? "" : value);
        var changed = next !== state.output;
        state.output = next;
        state.outputError = isError === true;
        if (!next) {
            state.outputPending = false;
            state.outputAttention = false;
        } else if (transientOutput(next)) {
            state.outputPending = true;
        } else {
            if (state.detailsCollapsed && (state.outputPending || changed)) state.outputAttention = true;
            state.outputPending = false;
        }
        if (!state.detailsCollapsed) state.outputAttention = false;
        var status = statusNode(panel);
        if (status) {
            status.textContent = state.output;
            status.classList.toggle("is-error", state.outputError);
        }
        syncOutputAttention(panel);
    }
'''
quick = replace_once(quick, old_set_output, new_set_output, 'replace output state')

quick = quick.replace("            system: '<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1\"/>',", "            system: '<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19 12h2M3 12h2M12 3v2M12 19v2M17 7l1.5-1.5M5.5 18.5 7 17M17 17l1.5 1.5M5.5 5.5 7 7\"/><path d=\"m15.5 4.8.8 2.1 2.2.8 2-1 .9 1.6-1.8 1.4.3 2.3 2.3.8v2l-2.3.8-.3 2.3 1.8 1.4-.9 1.6-2-1-2.2.8-.8 2.1h-2l-.8-2.1-2.2-.8-2 1-.9-1.6 1.8-1.4-.3-2.3-2.3-.8v-2l2.3-.8.3-2.3-1.8-1.4.9-1.6 2 1 2.2-.8.8-2.1h2Z\"/>',")
needle = "        artwork.flushdns = '<path d=\"M4 6h16v12H4z\"/><path d=\"M8 10h8M8 14h5M18 3v5M15.5 5.5 18 8l2.5-2.5\"/>';\n"
quick = replace_once(quick, needle, needle + "        artwork[\"network-settings\"] = '<rect x=\"3\" y=\"5\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 21h8M12 17v4M7 9h10M7 13h6\"/><circle cx=\"18\" cy=\"15\" r=\"3\"/><path d=\"M18 10v2M18 18v2M13 15h2M21 15h2\"/>';\n", 'add network settings icon')

quick = quick.replace('        showDetails(panel);\n', '')
quick = replace_once(quick, '            writeDetailsCollapsed(false);\n            state.output = "";\n', '            if ((value.variables || []).length) writeDetailsCollapsed(false);\n            state.output = "";\n', 'open details only for variables')
quick = quick.replace('        writeDetailsCollapsed(false);\n        setOutput(panel, text("loading"), false);\n        render(panel);\n', '        setOutput(panel, text("loading"), false);\n        render(panel);\n')
quick = quick.replace('        writeDetailsCollapsed(false);\n        state.output = text("loading");\n', '        state.output = text("loading");\n')

quick = quick.replace('                    onClick: function () { state.collapsed = !state.collapsed; render(panel); }\n', '                    onClick: function () { state.collapsed = !state.collapsed; writePreferences({ quickCollapsed: state.collapsed }); render(panel); }\n')
quick = quick.replace('                        state.favoritesOnly = !state.favoritesOnly;\n', '                        state.favoritesOnly = !state.favoritesOnly;\n                        writePreferences({ quickFavoritesOnly: state.favoritesOnly });\n')
quick = replace_once(quick, '        toolbar.setActive("details", !state.detailsCollapsed);\n', '        toolbar.setActive("details", !state.detailsCollapsed);\n        if (toolbar.buttons.details) {\n            toolbar.buttons.details.classList.add("sirk-quick-command-details-toggle");\n            toolbar.buttons.details.classList.toggle("has-output-attention", state.outputAttention === true);\n        }\n', 'sync details attention')

routing_start = quick.index('    function getStoredPluginPage() {')
routing_end = quick.index('    function install() {', routing_start)
quick = quick[:routing_start] + quick[routing_end:]
quick = quick.replace('        hookDeviceTabRouting();\n', '')

old_bottom = '''    new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
    window.__sirkDesktopCommandsTimer = window.setInterval(install, 500);
    install();
}());'''
new_bottom = '''    function refreshLifecycle() {
        var existing = document.getElementById("SirkDesktopCommands");
        if (!existing) return install();
        syncAvailability(existing);
        return true;
    }

    window.SirkDesktopCommands = { refresh: refreshLifecycle };
    install();
}());'''
quick = replace_once(quick, old_bottom, new_bottom, 'remove polling and observer')

quick_path.write_text(quick, encoding="utf-8")

runtime_path = Path("public/shared/runtime.js")
runtime = runtime_path.read_text(encoding="utf-8")
notify_end = '''    function configureModule(key, module) {
'''
helper = '''    function refreshQuickCommands() {
        var quick = window.SirkDesktopCommands;
        if (quick && typeof quick.refresh === "function") quick.refresh();
    }

'''
runtime = replace_once(runtime, notify_end, helper + notify_end, 'add Quick lifecycle helper')
runtime = replace_once(runtime, '        notify("onNativePageEnd", view);\n    };\n', '        notify("onNativePageEnd", view);\n        refreshQuickCommands();\n    };\n', 'refresh Quick after native page')
runtime = replace_once(runtime, '        notify("onDeviceRefreshEnd", runtime.state.nodeId);\n    };\n', '        notify("onDeviceRefreshEnd", runtime.state.nodeId);\n        refreshQuickCommands();\n    };\n', 'refresh Quick after device refresh')
runtime_path.write_text(runtime, encoding="utf-8")

print("Quick lifecycle cleanup applied")

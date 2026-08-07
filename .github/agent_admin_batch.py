from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected fragment not found in {path}: {old[:140]!r}")
    p.write_text(text.replace(old, new, 1))


# #121 - one canonical browser iconMode owner, refresh existing module menu nodes once after a real saved change.
replace('public/shared/ui/settings.js',
'''    window.SirkIconMode = {
        get: mode,
        useModern: function () {
            var value = mode();
            if (value === "modern") return true;
            if (value === "classic") return false;
            return !!(window.MeshThemeAdapter && window.MeshThemeAdapter.isModern && window.MeshThemeAdapter.isModern());
        }
    };''',
'''    window.SirkIconMode = {
        get: mode,
        set: function (value) {
            value = normalizeMode(value);
            if (window.SirkPlatformAdminData) {
                window.SirkPlatformAdminData.uiSettings = window.SirkPlatformAdminData.uiSettings || {};
                window.SirkPlatformAdminData.uiSettings.iconMode = value;
            }
            var runtime = window.SirkPlatformRuntime;
            if (runtime && runtime.state && runtime.state.bootstrap) {
                runtime.state.bootstrap.ui = runtime.state.bootstrap.ui || {};
                runtime.state.bootstrap.ui.iconMode = value;
            }
            if (runtime && typeof runtime.refreshMenus === "function") runtime.refreshMenus();
            return value;
        },
        useModern: function () {
            var value = mode();
            if (value === "modern") return true;
            if (value === "classic") return false;
            return !!(window.MeshThemeAdapter && window.MeshThemeAdapter.isModern && window.MeshThemeAdapter.isModern());
        }
    };''')

replace('public/shared/runtime.js',
'''    function refreshQuickCommands() {
        var quick = window.SirkDesktopCommands;
        if (quick && typeof quick.refresh === "function") quick.refresh();
    }
''',
'''    function refreshQuickCommands() {
        var quick = window.SirkDesktopCommands;
        if (quick && typeof quick.refresh === "function") quick.refresh();
    }

    runtime.refreshMenus = function () {
        notify("refreshMenu");
    };
''')

replace('public/shared/module-shell.js',
'''            function syncMenu() {
                core.setPluginMenuActive(
                    document.getElementById("MainMenuSirkPlatform-" + definition.key),
                    document.getElementById("LeftMenuSirkPlatform-" + definition.key),
                    state.active === true
                );
            }
''',
'''            function syncMenu() {
                core.setPluginMenuActive(
                    document.getElementById("MainMenuSirkPlatform-" + definition.key),
                    document.getElementById("LeftMenuSirkPlatform-" + definition.key),
                    state.active === true
                );
            }

            function refreshMenu() {
                if (menuEnabled()) registerMenu(definition, open);
                syncMenu();
            }
''')
replace('public/shared/module-shell.js',
'''                initialize: function (bootstrapState) {
                    state.bootstrap = bootstrapState || null;
                    if (state.bootstrap && state.bootstrap.config) {
                        definition.menuIcon = state.bootstrap.config.leftMenuIconUrl || state.bootstrap.config.menuIcon || definition.menuIcon;
                    }
                    if (menuEnabled()) registerMenu(definition, open);
                    syncMenu();
                    if (device) device.sync();''',
'''                initialize: function (bootstrapState) {
                    state.bootstrap = bootstrapState || null;
                    if (state.bootstrap && state.bootstrap.config) {
                        definition.menuIcon = state.bootstrap.config.leftMenuIconUrl || state.bootstrap.config.menuIcon || definition.menuIcon;
                    }
                    refreshMenu();
                    if (device) device.sync();''')
replace('public/shared/module-shell.js',
'''                render: api.render,
                api: api,
                onDeviceRefreshEnd: function (nodeId) {''',
'''                render: api.render,
                api: api,
                refreshMenu: refreshMenu,
                onDeviceRefreshEnd: function (nodeId) {''')
replace('public/shared/module-shell.js',
'''                onNativePageEnd: function (view) {
                    if (menuEnabled()) registerMenu(definition, open);
                    syncMenu();
                    if (device) device.onNativePageEnd(view);
                }''',
'''                onNativePageEnd: function (view) {
                    refreshMenu();
                    if (device) device.onNativePageEnd(view);
                }''')

replace('web/admin/admin.js',
'''            .then(function (result) {
                data = result.snapshot;
                window.SirkPlatformAdminData = data;
                status.className = "mc-admin-save-status";
                status.textContent = "Saved";
            })''',
'''            .then(function (result) {
                var previousIconMode = window.SirkIconMode && typeof window.SirkIconMode.get === "function"
                    ? window.SirkIconMode.get()
                    : "auto";
                data = result.snapshot;
                window.SirkPlatformAdminData = data;
                var nextIconMode = String(data.uiSettings && data.uiSettings.iconMode || "auto");
                if (previousIconMode !== nextIconMode && window.SirkIconMode && typeof window.SirkIconMode.set === "function") {
                    window.SirkIconMode.set(nextIconMode);
                }
                status.className = "mc-admin-save-status";
                status.textContent = "Saved";
            })''')

# #122 - native disclosure helper reused by Approval, module permissions and folder/category permissions.
replace('web/admin/admin.js',
'''    function element(tag, className, text) {
        var value = document.createElement(tag);
        if (className) value.className = className;
        if (text != null) value.textContent = text;
        return value;
    }
''',
'''    function element(tag, className, text) {
        var value = document.createElement(tag);
        if (className) value.className = className;
        if (text != null) value.textContent = text;
        return value;
    }

    function disclosure(host, className, title, expanded) {
        var details = element("details", (className || "") + " mc-admin-disclosure");
        details.open = expanded === true;
        details.appendChild(element("summary", "mc-admin-disclosure-summary", title));
        host.appendChild(details);
        return details;
    }
''')
replace('web/admin/admin.js',
'''        var card = element("section", "mc-admin-provider-card");
        card.appendChild(element("h4", "", title));''',
'''        var card = disclosure(host, "mc-admin-provider-card", title, false);''')
replace('web/admin/admin.js',
'''        host.appendChild(card);
        return function () {
            return {
                enabled: enabled.checked,
                showTab: showTab.checked,''',
'''        return function () {
            return {
                enabled: enabled.checked,
                showTab: showTab.checked,''')
replace('web/admin/admin.js',
'''        var card = element("section", "mc-admin-permission-folder");
        var label = source.label || source.key || "Folder";
        card.appendChild(element("h5", "", label));''',
'''        var label = source.label || source.key || "Folder";
        var card = disclosure(host, "mc-admin-permission-folder", label, false);''')
replace('web/admin/admin.js',
'''        sync();
        host.appendChild(card);
        return function () {''',
'''        sync();
        return function () {''')
replace('web/admin/admin.js',
'''        var card = element("section", "mc-admin-provider-card mc-admin-permission-module");
        card.appendChild(element("h4", "", title));''',
'''        var card = disclosure(host, "mc-admin-provider-card mc-admin-permission-module", title, false);''')
replace('web/admin/admin.js',
'''        card.appendChild(foldersHost);
        host.appendChild(card);

        return function () {''',
'''        card.appendChild(foldersHost);

        return function () {''')

p = Path('web/admin/admin.css')
css = p.read_text()
needle = '.mc-admin-card,.mc-admin-provider-card,.mc-admin-permission-folder{margin-bottom:12px;padding:12px;box-sizing:border-box}'
if needle not in css:
    raise SystemExit('admin card CSS owner not found')
css = css.replace(needle, needle + '.mc-admin-disclosure>summary{cursor:pointer;font-weight:700;line-height:1.35;padding:2px 0}.mc-admin-disclosure>summary+*{margin-top:10px}.mc-admin-disclosure[open]>summary{margin-bottom:10px}', 1)
p.write_text(css)

# Regression tests.
Path('test/admin-icon-mode-runtime-flow.test.js').write_text(r'''"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var settings = fs.readFileSync(path.join(root, "public/shared/ui/settings.js"), "utf8");
var runtime = fs.readFileSync(path.join(root, "public/shared/runtime.js"), "utf8");
var shell = fs.readFileSync(path.join(root, "public/shared/module-shell.js"), "utf8");
var core = fs.readFileSync(path.join(root, "public/shared/core.js"), "utf8");
var admin = fs.readFileSync(path.join(root, "web/admin/admin.js"), "utf8");

assert.ok(settings.indexOf('set: function (value)') >= 0 && settings.indexOf('runtime.state.bootstrap.ui.iconMode = value') >= 0,
    "SirkIconMode must be the single browser owner updating the current bootstrap mode.");
assert.ok(settings.indexOf('runtime.refreshMenus()') >= 0,
    "A real icon mode change must refresh existing menu entries through the runtime lifecycle.");
assert.ok(runtime.indexOf('runtime.refreshMenus = function ()') >= 0 && runtime.indexOf('notify("refreshMenu")') >= 0,
    "Runtime must fan out exactly one menu refresh without polling or observers.");
assert.ok(shell.indexOf('function refreshMenu()') >= 0 && shell.indexOf('refreshMenu: refreshMenu') >= 0,
    "Each module shell must expose its existing menu registration lifecycle for controlled refresh.");
assert.ok(core.indexOf('document.getElementById(definition.leftId) || leftAnchor.cloneNode(true)') >= 0,
    "ensureMenu must reuse the existing menu node instead of recreating it on refresh.");
assert.ok(core.indexOf('left.setAttribute("data-sirk-icon-family", useModernIcons ? "modern" : "classic")') >= 0,
    "Refreshed menu entries must expose their effective icon family.");
assert.ok(admin.indexOf('previousIconMode !== nextIconMode') >= 0 && admin.indexOf('window.SirkIconMode.set(nextIconMode)') >= 0,
    "Admin Save must trigger the browser owner only when the persisted icon mode actually changed.");
assert.strictEqual(runtime.indexOf('setInterval('), -1, "Icon mode synchronization must not poll.");
console.log("Admin icon mode save -> owner -> existing menu refresh contract: OK");
''')

Path('test/admin-disclosure-contract.test.js').write_text(r'''"use strict";
var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var browser = fs.readFileSync(path.join(root, "web/admin/admin.js"), "utf8");
var css = fs.readFileSync(path.join(root, "web/admin/admin.css"), "utf8");
assert.ok(browser.indexOf('function disclosure(host, className, title, expanded)') >= 0 && browser.indexOf('element("details"') >= 0 && browser.indexOf('element("summary"') >= 0,
    "Admin must reuse one native details/summary disclosure helper.");
assert.ok(browser.indexOf('disclosure(host, "mc-admin-provider-card", title, false)') >= 0,
    "Approval providers must be independently collapsible.");
assert.ok(browser.indexOf('disclosure(host, "mc-admin-provider-card mc-admin-permission-module", title, false)') >= 0,
    "My Commands and My Scripts permission modules must be collapsible.");
assert.ok(browser.indexOf('disclosure(host, "mc-admin-permission-folder", label, false)') >= 0,
    "Folder/category permission blocks must be collapsible.");
assert.strictEqual(browser.indexOf('.ontoggle'), -1, "Native disclosure must not rerender on toggle.");
assert.strictEqual(browser.indexOf('addEventListener("toggle"'), -1, "Native disclosure must not add toggle request/event loops.");
assert.ok(browser.indexOf('return { accessGroupIds: selectedAccessGroups, folderPermissions: folderPermissions };') >= 0,
    "Permissions save must still read the existing control closures independent of disclosure state.");
assert.ok(browser.indexOf('providers: { moverequests: move(), mycommands: commands(), myscripts: scripts() }') >= 0,
    "Approval save must keep the same provider payload independent of disclosure state.");
assert.ok(css.indexOf('.mc-admin-disclosure>summary{cursor:pointer') >= 0,
    "Disclosure styling must remain a small geometry/readability layer over native details/summary.");
console.log("Admin Approval/Permissions native disclosure preserves form state contract: OK");
''')

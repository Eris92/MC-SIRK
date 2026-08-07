(function () {
    "use strict";

    var SHARED_SCRIPT_LAYOUT_KEY = "sirkPlatform.layout.shared-script-columns.collapsed";
    var SHARED_SCRIPT_PRESETS = {
        approvalcenter: true,
        mycommands: true,
        myscripts: true
    };
    var mountedLayouts = [];

    function storage() {
        try { return window.localStorage || null; }
        catch (error) { return null; }
    }

    function presetFromStorageKey(key) {
        var match = String(key || "").match(/^sirkPlatform\.layout\.([^.]+)\.collapsed$/);
        return match ? String(match[1] || "").toLowerCase() : "";
    }

    function usesSharedScriptState(key) {
        return SHARED_SCRIPT_PRESETS[presetFromStorageKey(key)] === true;
    }

    function parseCollapsed(value) {
        value = String(value == null ? "" : value).toLowerCase();
        if (value === "collapsed" || value === "true" || value === "1") return true;
        if (value === "expanded" || value === "false" || value === "0") return false;
        return null;
    }

    function storedValue(key) {
        var store = storage();
        if (!store || !key) return null;
        try { return parseCollapsed(store.getItem(key)); }
        catch (error) { return null; }
    }

    function writeValue(key, collapsed) {
        var store = storage();
        if (!store || !key) return;
        try { store.setItem(key, collapsed ? "collapsed" : "expanded"); }
        catch (error) {}
    }

    function initialCollapsed(storageKey, explicitValue) {
        if (explicitValue === true || explicitValue === false) return explicitValue;

        if (usesSharedScriptState(storageKey)) {
            var shared = storedValue(SHARED_SCRIPT_LAYOUT_KEY);
            if (shared != null) return shared;

            var legacy = storedValue(storageKey);
            if (legacy != null) {
                writeValue(SHARED_SCRIPT_LAYOUT_KEY, legacy);
                return legacy;
            }
            return false;
        }

        var stored = storedValue(storageKey);
        return stored == null ? false : stored;
    }

    function applyCollapsed(entry, collapsed) {
        entry.collapsed = collapsed === true;
        entry.root.classList.toggle("is-collapsed", entry.collapsed);
    }

    function synchronizeShared(collapsed, source) {
        mountedLayouts.forEach(function (entry) {
            if (entry !== source && entry.sharedState) applyCollapsed(entry, collapsed);
        });
    }

    function unregister(entry) {
        var index = mountedLayouts.indexOf(entry);
        if (index >= 0) mountedLayouts.splice(index, 1);
    }

    window.SharedLayout = {
        mount: function (options) {
            options = options || {};
            var host = typeof options.container === "string" ? document.querySelector(options.container) : options.container;
            if (!host) throw new Error("Layout container not found.");

            var storageKey = String(options.storageKey || "");
            var sharedState = usesSharedScriptState(storageKey);
            var root = document.createElement("div");
            root.className = "mc-shared-layout" + (sharedState ? " sirk-shared-quick-columns" : "");
            var primary = document.createElement("aside");
            primary.className = "mc-shared-primary" + (sharedState ? " sirk-shared-quick-primary" : "");
            var secondary = document.createElement("section");
            secondary.className = "mc-shared-secondary" + (sharedState ? " sirk-shared-quick-secondary" : "");
            var details = document.createElement("section");
            details.className = "mc-shared-details";
            root.appendChild(primary);
            root.appendChild(secondary);
            root.appendChild(details);
            host.appendChild(root);

            var entry = {
                root: root,
                storageKey: storageKey,
                sharedState: sharedState,
                collapsed: initialCollapsed(storageKey, options.collapsed)
            };
            mountedLayouts.push(entry);
            applyCollapsed(entry, entry.collapsed);

            var api = {
                root: root,
                primary: primary,
                secondary: secondary,
                details: details,
                isCollapsed: function () { return entry.collapsed === true; },
                setCollapsed: function (value) {
                    var collapsed = value === true;
                    applyCollapsed(entry, collapsed);
                    if (entry.sharedState) {
                        writeValue(SHARED_SCRIPT_LAYOUT_KEY, collapsed);
                        synchronizeShared(collapsed, entry);
                    } else if (entry.storageKey) {
                        writeValue(entry.storageKey, collapsed);
                    }
                    return collapsed;
                },
                toggleCollapsed: function () {
                    return api.setCollapsed(!entry.collapsed);
                },
                clear: function () {
                    primary.innerHTML = "";
                    secondary.innerHTML = "";
                    details.innerHTML = "";
                },
                destroy: function () { unregister(entry); }
            };
            return api;
        }
    };
}());

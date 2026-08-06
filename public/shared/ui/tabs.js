(function () {
    "use strict";
    window.SharedTabs = {
        mount: function (options) {
            options = options || {};
            var host = typeof options.container === "string" ? document.querySelector(options.container) : options.container;
            var root = document.createElement("div"); root.className = "mc-shared-tabs";
            var state = { active: options.active || "" }, buttons = {};
            function select(key, notify) {
                state.active = key;
                Object.keys(buttons).forEach(function (name) { buttons[name].classList.toggle("active", name === key); });
                if (notify !== false && typeof options.onSelect === "function") options.onSelect(key, api);
            }
            (options.tabs || []).forEach(function (tab) {
                if (tab.visible === false) return;
                var item = document.createElement("button"); item.type = "button"; item.className = "btn btn-secondary btn-sm mc-shared-tab"; item.textContent = tab.title || tab.key;
                item.onclick = function () { select(tab.key, true); }; buttons[tab.key] = item; root.appendChild(item);
            });
            host.appendChild(root);
            var api = { root: root, buttons: buttons, state: state, select: select, setVisible: function (key, value) { if (buttons[key]) buttons[key].hidden = value === false; } };
            select(state.active || Object.keys(buttons)[0] || "", false); return api;
        }
    };
}());

(function () {
    "use strict";
    if (window.__sirk1819UiExtension) return;
    window.__sirk1819UiExtension = true;

    var GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>';
    var NETWORK_SETTINGS = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><circle cx="17" cy="10" r="2.5"/><path d="M17 6.5v1M17 12.5v1M13.5 10h1M19.5 10h1"/></svg>';

    function installStyle() {
        if (document.getElementById("sirk-1819-ui-style")) return;
        var style = document.createElement("style");
        style.id = "sirk-1819-ui-style";
        style.textContent = [
            '.sirk-quick-command-tree>button{padding-left:calc(8px + (var(--sdc-depth,0) * 6px))!important}',
            '.mc-tree-folder-header{padding-left:calc(8px + (var(--mc-tree-depth,0) * 6px))!important}',
            '.mc-tree-script{padding-left:calc(8px + (var(--mc-tree-depth,0) * 6px))!important}',
            '.mc-tree-script-row>.mc-tree-script-actions{display:flex!important;visibility:visible!important;opacity:1!important;flex:0 0 auto!important;gap:4px!important}',
            '.mc-tree-script-row>.mc-tree-script{width:auto!important;min-width:0!important;flex:1 1 auto!important}',
            '[data-sirk-icon-tone="scripts"] :is(.sirk-management-item-icon,.sirk-quick-command-icon,.mc-tree-fallback-icon){color:var(--bs-primary,#3975e8)!important}',
            '[data-sirk-icon-tone="network"] :is(.sirk-management-item-icon,.sirk-quick-command-icon,.mc-tree-fallback-icon){color:var(--bs-info,#0dcaf0)!important}',
            '[data-sirk-icon-tone="system"] :is(.sirk-management-item-icon,.sirk-quick-command-icon,.mc-tree-fallback-icon){color:var(--bs-warning,#ffc107)!important}',
            '[data-sirk-icon-tone="other"] :is(.sirk-management-item-icon,.sirk-quick-command-icon,.mc-tree-fallback-icon){color:var(--bs-secondary,#6c757d)!important}',
            '.sirk-result-status-all :is(.sirk-result-status-icon,.sirk-shared-list-icon,.mc-portal-nav-label,.sirk-shared-list-label){color:var(--bs-primary,#3975e8)!important}',
            '.sirk-result-status-pending :is(.sirk-result-status-icon,.sirk-shared-list-icon,.mc-portal-nav-label,.sirk-shared-list-label){color:var(--bs-warning,#ffc107)!important}',
            '.sirk-result-status-executing :is(.sirk-result-status-icon,.sirk-shared-list-icon,.mc-portal-nav-label,.sirk-shared-list-label){color:var(--bs-info,#0dcaf0)!important}',
            '.sirk-result-status-approved :is(.sirk-result-status-icon,.sirk-shared-list-icon,.mc-portal-nav-label,.sirk-shared-list-label),.sirk-result-status-completed :is(.sirk-result-status-icon,.sirk-shared-list-icon,.mc-portal-nav-label,.sirk-shared-list-label){color:var(--bs-success,#198754)!important}',
            '.sirk-result-status-failed :is(.sirk-result-status-icon,.sirk-shared-list-icon,.mc-portal-nav-label,.sirk-shared-list-label),.sirk-result-status-rejected :is(.sirk-result-status-icon,.sirk-shared-list-icon,.mc-portal-nav-label,.sirk-shared-list-label){color:var(--bs-danger,#dc3545)!important}'
        ].join('');
        (document.head || document.documentElement).appendChild(style);
    }

    function labelOf(button) {
        var label = button && button.querySelector && button.querySelector('.mc-tree-label,.sirk-quick-command-label,.sirk-shared-list-label');
        return String(label && label.textContent || button && button.title || '').trim();
    }
    function tone(value) {
        value = String(value || '').toLowerCase();
        if (/skrypty|scripts/.test(value)) return 'scripts';
        if (/sieć|siec|network/.test(value)) return 'network';
        if (/system/.test(value)) return 'system';
        if (/inne|other/.test(value)) return 'other';
        return '';
    }
    function setTone(button, value) {
        if (!button || !button.setAttribute) return;
        value = tone(value);
        if (value) button.setAttribute('data-sirk-icon-tone', value);
        if (value === 'system') {
            var icon = button.querySelector('.sirk-management-item-icon,.sirk-quick-command-icon,.mc-tree-fallback-icon');
            if (icon) icon.innerHTML = GEAR;
        }
    }
    function polishNetworkSettings(button) {
        if (!button) return;
        var label = button.querySelector('.mc-tree-label,.sirk-quick-command-label,.sirk-shared-list-label');
        var value = String(label && label.textContent || button.title || '');
        if (!/Active network adapter settings|Ustawienia aktywnej karty sieciowej/i.test(value)) return;
        if (label && (!document.documentElement.lang || document.documentElement.lang.toLowerCase().indexOf('en') !== 0)) label.textContent = 'Ustawienia aktywnej karty sieciowej';
        button.setAttribute('data-sirk-icon-tone', 'network');
        var icon = button.querySelector('.sirk-management-item-icon,.sirk-quick-command-icon,.mc-tree-fallback-icon');
        if (icon) icon.innerHTML = NETWORK_SETTINGS;
    }
    function applyIconMode() {
        var bootstrap = window.SirkPlatformRuntime && window.SirkPlatformRuntime.state && window.SirkPlatformRuntime.state.bootstrap;
        var mode = String(bootstrap && bootstrap.ui && bootstrap.ui.iconMode || 'auto').toLowerCase();
        if (['auto','classic','modern'].indexOf(mode) < 0) mode = 'auto';
        document.documentElement.setAttribute('data-sirk-icon-mode', mode);
        window.__SIRK_ICON_MODE__ = mode;
    }
    function decorate() {
        installStyle();
        applyIconMode();
        Array.prototype.forEach.call(document.querySelectorAll('.mc-shared-page-mycommands .mc-shared-primary button,.sirk-quick-command-categories>button'), function (button) { setTone(button, labelOf(button)); });
        var active = document.querySelector('.mc-shared-page-mycommands .mc-shared-primary button.active,.mc-shared-page-mycommands .mc-shared-primary button.is-active');
        var activeTone = tone(labelOf(active));
        Array.prototype.forEach.call(document.querySelectorAll('.mc-shared-page-mycommands .mc-shared-secondary button'), function (button) { if (activeTone) button.setAttribute('data-sirk-icon-tone', activeTone); polishNetworkSettings(button); });
        var quickActive = document.querySelector('.sirk-quick-command-categories>button.is-active,.sirk-quick-command-categories>button.active');
        var quickTone = tone(labelOf(quickActive));
        Array.prototype.forEach.call(document.querySelectorAll('.sirk-quick-command-tree>button'), function (button) { if (quickTone) button.setAttribute('data-sirk-icon-tone', quickTone); polishNetworkSettings(button); });
    }
    installStyle();
    decorate();
    if (typeof MutationObserver === 'function') new MutationObserver(function () { window.setTimeout(decorate, 0); }).observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    window.setInterval(decorate, 800);
}());

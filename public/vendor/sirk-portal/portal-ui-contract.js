(function () {
    "use strict";

    if (window.__sirkPlatformPortalUiContractLoaded) return;
    window.__sirkPlatformPortalUiContractLoaded = true;

    var root = document.getElementById("sirkPortalRoot");
    if (!root) return;

    function addClass(nodes, className) {
        Array.prototype.forEach.call(nodes || [], function (node) {
            if (node && node.classList) node.classList.add(className);
        });
    }

    function installViewStyle() {
        if (document.getElementById("sirk-platform-portal-view-contract-style")) return;
        var style = document.createElement("style");
        style.id = "sirk-platform-portal-view-contract-style";
        style.textContent = [
            "#sirkPortalRoot .sirk-standalone-view-scroll{display:flex;flex-direction:column;width:100%;height:100%;min-width:0;min-height:0;margin:0;border:1px solid var(--sirk-ui-border,var(--sirk-border,#dce3ec));border-radius:10px;background:var(--sirk-ui-panel,var(--sirk-panel,#fff));color:var(--sirk-ui-text,var(--sirk-text,#172033));overflow:hidden;box-sizing:border-box}",
            "#sirkPortalRoot .sirk-portal-view-scroll{flex:1 1 auto;width:100%;min-width:0;min-height:0;padding:14px;overflow:auto;box-sizing:border-box}",
            "#sirkPortalRoot .sirk-portal-view-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;width:100%;min-height:48px;margin:0 0 14px;padding:0}",
            "#sirkPortalRoot .sirk-card{border-color:var(--sirk-ui-border,var(--sirk-border,#dce3ec))!important;border-radius:var(--sirk-ui-radius,8px)!important;background:var(--sirk-ui-panel,var(--sirk-panel,#fff))!important;color:var(--sirk-ui-text,var(--sirk-text,#172033))!important;box-shadow:none!important}",
            "#sirkPortalRoot .sirk-button-secondary{appearance:none;display:inline-flex;align-items:center;justify-content:center;min-height:34px;margin:0;padding:7px 13px;border:1px solid var(--sirk-ui-border,var(--sirk-border,#dce3ec));border-radius:7px;background:var(--sirk-ui-panel,var(--sirk-panel,#fff));color:var(--sirk-ui-text,var(--sirk-text,#172033));font:500 14px Segoe UI,Arial,sans-serif;text-decoration:none;box-shadow:none;cursor:pointer}",
            "#sirkPortalRoot .sirk-button-secondary:hover,#sirkPortalRoot .sirk-button-secondary:focus-visible{border-color:rgba(96,165,250,.35);background:var(--sirk-ui-hover,rgba(96,165,250,.09));outline:0}",
            "#sirkPortalRoot .sirk-portal-status{width:100%;padding:18px;border:1px dashed var(--sirk-ui-border,var(--sirk-border,#dce3ec));border-radius:var(--sirk-ui-radius,8px);background:var(--sirk-ui-panel,var(--sirk-panel,#fff));color:var(--sirk-ui-muted,var(--sirk-muted,#657187));box-sizing:border-box}",
            "#sirkPortalRoot .sirk-portal-list{display:grid;width:100%;min-width:0;border-top:1px solid var(--sirk-ui-border,var(--sirk-border,#dce3ec))}",
            "#sirkPortalRoot .sirk-portal-list-row{border-bottom-color:var(--sirk-ui-border,var(--sirk-row-border,#edf1f6))!important;background:var(--sirk-ui-panel,var(--sirk-panel,#fff))!important;color:var(--sirk-ui-text,var(--sirk-text,#172033))!important}",
            "#sirkPortalRoot .sirk-portal-list-row:hover,#sirkPortalRoot .sirk-portal-list-row:focus-visible{background:var(--sirk-ui-hover,var(--sirk-hover,#f7faff))!important}",
            "#sirkPortalRoot .sirk-portal-badge{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:7px 10px;border:1px solid var(--sirk-ui-border,var(--sirk-border,#dce3ec));border-radius:7px;background:var(--sirk-ui-panel,var(--sirk-panel,#fff));color:var(--sirk-ui-muted,var(--sirk-muted,#657187));box-sizing:border-box}",
            "#sirkPortalRoot .sirk-device-content{--sirk-ui-accent:var(--sirk-active-accent,#3867d6)}",
            "#sirkPortalRoot .sirk-device-content .sirk-device-group,#sirkPortalRoot .sirk-device-content .sirk-device-hero,#sirkPortalRoot .sirk-device-content .sirk-device-detail-item,#sirkPortalRoot .sirk-device-content .sirk-device-native-card{border-radius:var(--sirk-ui-radius,8px);box-shadow:none}",
            "#sirkPortalRoot .sirk-device-content .sirk-device-input,#sirkPortalRoot .sirk-device-content .sirk-device-select{min-height:34px;border-radius:7px;background:var(--sirk-ui-input,var(--sirk-input,#fff));color:var(--sirk-ui-text,var(--sirk-text,#172033))}",
            "#sirkPortalRoot .sirk-device-content .sirk-device-native-button{border-color:transparent;background:var(--sirk-ui-accent,#3867d6);color:#fff}",
            "#sirkPortalRoot .sirk-overview-link:hover,#sirkPortalRoot .sirk-overview-link:focus-visible{border-color:rgba(96,165,250,.45)!important;background:var(--sirk-ui-hover,rgba(96,165,250,.09))!important;transform:none;box-shadow:none!important}",
            "@media(max-width:800px){#sirkPortalRoot .sirk-portal-view-scroll{padding:10px}}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function decorateNavigation(scope) {
        addClass(scope.querySelectorAll(
            ".sirk-nav-item,.sirk-nav-item,.sirk-approval-nav-item," +
            ".sirk-admin-tabs>[data-tab],.sirk-admin-section-nav [data-settings-key],.sirk-admin-section-nav [data-debug-key]"
        ), "sirk-nav-item");
        addClass(scope.querySelectorAll(
            ".sirk-tree-fallback-icon,.sirk-tree-icon,.sirk-tree-root img,.sirk-nav-icon," +
            ".sirk-approval-nav-icon,.sirk-admin-management-item-icon"
        ), "sirk-nav-icon");
        addClass(scope.querySelectorAll(
            ".sirk-tree-label,.sirk-script-label,.sirk-approval-nav-label,.sirk-admin-management-item-label"
        ), "sirk-portal-nav-label");
    }

    function decorateTables(scope) {
        addClass(scope.querySelectorAll(".sirk-results-table-wrap,.sirk-approval-table-wrap,.sirk-admin-table-wrap"), "sirk-portal-table-wrap");
        addClass(scope.querySelectorAll(".sirk-results-table,.sirk-approval-table,.sirk-admin-table"), "sirk-portal-table");
        addClass(scope.querySelectorAll(".sirk-results-filter,.sirk-approval-search,.sirk-admin-management-search input"), "sirk-filter");
    }

    function decorateActions(scope) {
        addClass(scope.querySelectorAll(
            ".sirk-results-view-button,.sirk-results-copy-button,.sirk-primary-button," +
            ".sirk-admin-primary,.sirk-admin-secondary,.sirk-script-run-card button," +
            ".sirk-column sirk-column-details button.btn:not(.sirk-toolbar-button)"
        ), "sirk-button");
        addClass(scope.querySelectorAll(".sirk-card,.sirk-card,.sirk-admin-card"), "sirk-card");
    }

    function decorateToolbar(scope) {
        addClass(scope.querySelectorAll(".sirk-toolbar,.sirk-toolbar,.sirk-admin-management-toolbar"), "sirk-portal-toolbar");
        addClass(scope.querySelectorAll(".sirk-toolbar-button,.sirk-toolbar-button,.sirk-admin-management-tool"), "sirk-toolbar-button");
        addClass(scope.querySelectorAll(".sirk-toolbar-icon,.sirk-toolbar-button>svg,.sirk-admin-management-tool>svg"), "sirk-toolbar-icon");
    }

    function decoratePortalViews(scope) {
        addClass(scope.querySelectorAll(".sirk-standalone-view-scroll"), "sirk-standalone-view-scroll");
        addClass(scope.querySelectorAll(".sirk-standalone-view-scroll"), "sirk-portal-view-scroll");
        addClass(scope.querySelectorAll(".sirk-device-toolbar"), "sirk-portal-view-toolbar");
        addClass(scope.querySelectorAll(".sirk-standalone-card,.sirk-device-group,.sirk-device-hero,.sirk-device-detail-item,.sirk-device-native-card"), "sirk-card");
        addClass(scope.querySelectorAll(".sirk-device-input,.sirk-device-select"), "sirk-filter");
        addClass(scope.querySelectorAll(".sirk-device-native-button"), "sirk-button");
        addClass(scope.querySelectorAll(".sirk-device-refresh,.sirk-device-back"), "sirk-button-secondary");
        addClass(scope.querySelectorAll(".sirk-device-status"), "sirk-portal-status");
        addClass(scope.querySelectorAll(".sirk-device-summary span"), "sirk-portal-badge");
        addClass(scope.querySelectorAll(".sirk-device-list"), "sirk-portal-list");
        addClass(scope.querySelectorAll(".sirk-device-row"), "sirk-portal-list-row");
    }

    function decorateShell(shell) {
        if (!shell || !shell.classList) return;
        shell.classList.add("sirk-standalone-view-scroll");
        var toolbar = shell.querySelector(":scope > .sirk-toolbar-host,:scope > .sirk-toolbar,:scope > .sirk-admin-management-toolbar");
        if (toolbar) toolbar.classList.add("sirk-toolbar-host");
        var workspace = shell.querySelector(":scope > .sirk-layout-host,:scope > .sirk-layout,:scope > .sirk-admin-management-layout");
        if (workspace) {
            workspace.classList.add("sirk-layout-host", "sirk-layout");
            var columns = workspace.children || [];
            if (columns[0]) columns[0].classList.add("sirk-column-primary");
            if (columns[1]) columns[1].classList.add("sirk-column-secondary");
            if (columns[2]) columns[2].classList.add("sirk-column-details");
        }
        var managementHost = shell.closest(".");
        var editMode = !!(managementHost && managementHost.classList.contains("is-management-edit-mode") || shell.querySelector(".sirk-tree-script-actions:not(:empty),.sirk-script-actions:not(:empty)"));
        var collapsed = !!(managementHost && managementHost.classList.contains("is-collapsed") || shell.classList.contains("is-collapsed") || workspace && workspace.classList.contains("is-collapsed"));
        shell.classList.toggle("is-edit-mode", editMode);
        if (workspace) {
            workspace.classList.toggle("is-edit-mode", editMode);
            workspace.classList.toggle("is-collapsed", collapsed);
        }
    }

    function decorate(scope) {
        scope = scope || root;
        addClass(scope.querySelectorAll(".sirk-standalone-view-scroll.sirk-standalone-view-scroll,.sirk-standalone-view-scroll,.sirk-admin-management-shell"), "sirk-standalone-view-scroll");
        Array.prototype.forEach.call(scope.querySelectorAll(".sirk-standalone-view-scroll,.sirk-standalone-view-scroll,.sirk-admin-management-shell"), decorateShell);
        decorateToolbar(scope);
        decorateNavigation(scope);
        decorateTables(scope);
        decorateActions(scope);
        decoratePortalViews(scope);
    }

    function ensureFrameStyle(doc) {
        if (!doc || !doc.head || doc.getElementById("sirk-platform-portal-ui-contract-style")) return;
        var source = document.getElementById("sirk-platform-portal-ui-contract-style");
        if (!source || !source.href) return;
        var link = doc.createElement("link");
        link.id = "sirk-platform-portal-ui-contract-style";
        link.rel = "stylesheet";
        link.href = source.href;
        doc.head.appendChild(link);
    }

    function syncFrameEnvironment(doc, adminRoot) {
        var dark = root.classList.contains("sirk-theme-dark");
        adminRoot.classList.toggle("sirk-theme-dark", dark);
        adminRoot.classList.toggle("sirk-theme-light", !dark);
        doc.documentElement.classList.toggle("sirk-theme-dark", dark);
        doc.documentElement.classList.toggle("sirk-theme-light", !dark);
        doc.documentElement.style.colorScheme = dark ? "dark" : "light";
        var source = window.getComputedStyle(root);
        ["--sirk-panel", "--sirk-input", "--sirk-text", "--sirk-muted", "--sirk-border", "--sirk-active-accent"].forEach(function (name) {
            var value = source.getPropertyValue(name);
            if (value) adminRoot.style.setProperty(name, value.trim());
        });
    }

    function decorateSettingsFrame(frame) {
        if (!frame) return;
        function apply() {
            try {
                var doc = frame.contentDocument;
                var admin = doc && doc.getElementById("sirk-platform-admin");
                if (!admin || !doc.body) return;
                var adminRoot = doc.getElementById("sirkPortalRoot") || doc.body;
                if (!adminRoot.id) adminRoot.id = "sirkPortalRoot";
                admin.classList.add("sirk-admin-portal-embedded");
                doc.documentElement.classList.add("sirk-portal-admin-document");
                ensureFrameStyle(doc);
                syncFrameEnvironment(doc, adminRoot);
                decorate(adminRoot);
                if (!frame.__sirkPlatformPortalUiObserver) {
                    frame.__sirkPlatformPortalUiObserver = new MutationObserver(function () { decorate(adminRoot); });
                    frame.__sirkPlatformPortalUiObserver.observe(adminRoot, { childList: true, subtree: true });
                }
            } catch (error) {}
        }
        if (frame.getAttribute("data-portal-ui-contract") !== "1") {
            frame.setAttribute("data-portal-ui-contract", "1");
            frame.addEventListener("load", function () {
                frame.__sirkPlatformPortalUiObserver = null;
                window.setTimeout(apply, 0);
                window.setTimeout(apply, 250);
            });
        }
        apply();
    }

    var scheduled = false;
    function schedule() {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(function () {
            scheduled = false;
            decorate(root);
            Array.prototype.forEach.call(root.querySelectorAll(".sirk-standalone-settings-frame"), decorateSettingsFrame);
        });
    }

    installViewStyle();
    var observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    root.addEventListener("click", function () { window.setTimeout(schedule, 0); }, true);
    window.addEventListener("sirkportal:languagechange", schedule);

    window.SirkPlatformPortalUiContract = { decorate: decorate, refresh: schedule };
    schedule();
}());

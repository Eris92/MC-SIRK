(function () {
    "use strict";

    function ensureStyles() {
        if (document.getElementById("sirk-semantic-status-styles")) return;
        var style = document.createElement("style");
        style.id = "sirk-semantic-status-styles";
        style.textContent = [
            ":root{--sirk-icon-blue:#3b82f6;--sirk-status-all:#3b82f6;--sirk-status-pending:#d97706;--sirk-status-executing:#0284c7;--sirk-status-approved:#198754;--sirk-status-completed:#0f9d78;--sirk-status-failed:#dc3545;--sirk-status-rejected:#b02a37}",
            "[data-bs-theme=dark],body.night,body.dark{--sirk-icon-blue:#60a5fa;--sirk-status-all:#60a5fa;--sirk-status-pending:#ffc107;--sirk-status-executing:#38bdf8;--sirk-status-approved:#4ade80;--sirk-status-completed:#2dd4bf;--sirk-status-failed:#ff6b6b;--sirk-status-rejected:#ff8787}",
            ".mc-module-approvalcenter .mc-nav-icon{color:var(--sirk-icon-blue)!important}",
            ".sirk-result-status-all :is(.sirk-result-status-icon,.mc-nav-icon),.mc-results-status-all,.mc-approval-request-status-all{color:var(--sirk-status-all)!important}",
            ".sirk-result-status-pending :is(.sirk-result-status-icon,.mc-nav-icon),.mc-results-status-pending,.mc-approval-request-status-pending{color:var(--sirk-status-pending)!important}",
            ".sirk-result-status-executing :is(.sirk-result-status-icon,.mc-nav-icon),.mc-results-status-executing,.mc-approval-request-status-executing{color:var(--sirk-status-executing)!important}",
            ".sirk-result-status-approved :is(.sirk-result-status-icon,.mc-nav-icon),.mc-results-status-approved,.mc-approval-request-status-approved{color:var(--sirk-status-approved)!important}",
            ".sirk-result-status-completed :is(.sirk-result-status-icon,.mc-nav-icon),.mc-results-status-completed,.mc-approval-request-status-completed{color:var(--sirk-status-completed)!important}",
            ".sirk-result-status-failed :is(.sirk-result-status-icon,.mc-nav-icon),.mc-results-status-failed,.mc-approval-request-status-failed{color:var(--sirk-status-failed)!important}",
            ".sirk-result-status-rejected :is(.sirk-result-status-icon,.mc-nav-icon),.mc-results-status-rejected,.mc-approval-request-status-rejected{color:var(--sirk-status-rejected)!important}",
            ".mc-results-status,.mc-approval-request-status{font-weight:600}",
            ".mc-approval-request-status{display:inline-flex;align-items:center;margin-left:4px}",
            ".mc-shared-page .sirk-action-approve,#SirkPlatformWorkspace .sirk-action-approve,.mc-results-viewer .sirk-action-approve{background:#198754!important;border-color:#198754!important;color:#fff!important}",
            ".mc-shared-page .sirk-action-approve:hover,#SirkPlatformWorkspace .sirk-action-approve:hover,.mc-results-viewer .sirk-action-approve:hover{background:#157347!important;border-color:#146c43!important;color:#fff!important}",
            ".mc-shared-page .sirk-action-reject,#SirkPlatformWorkspace .sirk-action-reject,.mc-results-viewer .sirk-action-reject{background:#dc3545!important;border-color:#dc3545!important;color:#fff!important}",
            ".mc-shared-page .sirk-action-reject:hover,#SirkPlatformWorkspace .sirk-action-reject:hover,.mc-results-viewer .sirk-action-reject:hover{background:#bb2d3b!important;border-color:#b02a37!important;color:#fff!important}"
        ].join("");
        (document.head || document.documentElement).appendChild(style);
    }

    function svg(path) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + "</svg>"; }
    var statuses = [
        { key: "", title: "All", icon: svg('<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8"/>') },
        { key: "pending", title: "Pending", icon: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>') },
        { key: "executing", title: "Executing", icon: svg('<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>') },
        { key: "approved", title: "Approved", icon: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/>') },
        { key: "completed", title: "Completed", icon: svg('<path d="M4 5h16v14H4z"/><path d="m8 12 2.5 2.5L16 9"/>') },
        { key: "failed", title: "Failed", icon: svg('<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>') },
        { key: "rejected", title: "Rejected", icon: svg('<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>') }
    ];

    ensureStyles();

    window.SharedStatusNav = {
        list: function (counts) {
            return statuses.map(function (item) {
                return { key: item.key, title: item.title, icon: item.icon, badge: counts && counts[item.key] };
            });
        },
        mount: function (host, options) {
            host.innerHTML = "";
            options = options || {};
            this.list(options.counts).forEach(function (item) {
                var button = document.createElement("button");
                button.type = "button";
                button.className = "mc-shared-nav-item mc-portal-nav-item sirk-management-item sirk-result-status sirk-result-status-" + (item.key || "all");
                var icon = document.createElement("span");
                icon.className = "sirk-management-item-icon sirk-result-status-icon mc-portal-nav-icon";
                icon.innerHTML = item.icon;
                var label = document.createElement("span");
                label.className = "mc-portal-nav-label";
                label.textContent = item.title + (item.badge == null ? "" : " (" + item.badge + ")");
                button.appendChild(icon);
                button.appendChild(label);
                button.classList.toggle("active", item.key === options.selected);
                button.classList.toggle("is-active", item.key === options.selected);
                button.onclick = function () {
                    if (typeof options.onSelect === "function") options.onSelect(item.key);
                };
                host.appendChild(button);
            });
        }
    };
}());

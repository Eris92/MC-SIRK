(function () {
    "use strict";
    function requestCard(host, request) {
        var card = window.SirkPlatformCore.card(request.title || request.type, request.summary || "");
        card.appendChild(document.createTextNode("Status: " + (request.status || "unknown") + " · " + (request.requester && request.requester.name || "")));
        if (request.canDecide) {
            var actions = document.createElement("div"); actions.className = "mc-script-manage-actions";
            [[true, "Approve"], [false, "Reject"]].forEach(function (item) {
                var button = document.createElement("button"); button.type = "button"; button.className = item[0] ? "btn btn-primary" : "btn btn-secondary"; button.textContent = item[1];
                button.onclick = function () { button.disabled = true; window.SirkPlatformCore.post("approvals", "decide", { id: request.id, approved: item[0], note: "" }).then(open).catch(function (error) { button.disabled = false; window.alert(error.message || String(error)); }); };
                actions.appendChild(button);
            });
            card.appendChild(actions);
        }
        host.appendChild(card);
    }
    function open(event) {
        if (event && event.preventDefault) event.preventDefault();
        window.SirkPlatformCore.showWorkspace("Approval Center", 100, function (host) {
            host.innerHTML = "";
            window.SirkPlatformCore.api("approvals", "requests").then(function (result) {
                if (!(result.rows || []).length) { host.appendChild(window.SirkPlatformCore.card("Approval Center", "No approval requests available.")); return; }
                result.rows.forEach(function (request) { requestCard(host, request); });
            }).catch(function (error) { host.appendChild(window.SirkPlatformCore.card("Approval Center", error.message || String(error))); });
        });
        return false;
    }
    window.SirkPlatformModules = window.SirkPlatformModules || {};
    window.SirkPlatformModules.approvals = { initialize: function (state) {
        if (state && state.config && state.config.showInMenu === false) return Promise.resolve();
        window.SirkPlatformCore.ensureMenu({ mainId: "MainMenuSirkPlatform-Approvals", leftId: "LeftMenuSirkPlatform-Approvals", title: "Approval Center", order: 120, viewMode: 100, open: open });
        return Promise.resolve();
    } };
}());

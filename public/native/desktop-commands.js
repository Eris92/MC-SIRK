(function () {
    "use strict";
    if (window.__sirkDesktopCommandsLoaded) return;
    window.__sirkDesktopCommandsLoaded = true;

    function nodeId() {
        var node = window.currentNode || window.xxcurrentNode || {};
        return String(node._id || node.id || node.nodeid || "");
    }

    function hide(menu) { if (menu) menu.hidden = true; }
    function install() {
        var desk = document.getElementById("Desk") || document.querySelector("#p11 canvas");
        if (!desk || document.getElementById("sirk-desktop-commands")) return;
        var host = desk.parentElement;
        if (!host) return;
        host.classList.add("sirk-desktop-commands-host");
        var wrap = document.createElement("div");
        wrap.id = "sirk-desktop-commands";
        wrap.innerHTML = '<button type="button" class="sirk-desktop-commands-toggle" aria-expanded="false">Commands</button><section class="sirk-desktop-commands-menu" hidden><strong>Commands</strong><div class="sirk-desktop-commands-items">Loading…</div><div class="sirk-desktop-commands-status" aria-live="polite"></div></section>';
        host.appendChild(wrap);
        var button = wrap.querySelector("button");
        var menu = wrap.querySelector("section");
        var items = wrap.querySelector(".sirk-desktop-commands-items");
        var status = wrap.querySelector(".sirk-desktop-commands-status");

        function renderCatalog(catalog) {
            items.innerHTML = "";
            (catalog || []).forEach(function (category) {
                (category.commands || []).forEach(function (command) {
                    var item = document.createElement("button");
                    item.type = "button";
                    item.textContent = command.label || command.id;
                    item.title = command.description || item.textContent;
                    item.onclick = function () {
                        var id = nodeId();
                        if (!id || !window.SirkPlatformCore) { status.textContent = "Device is not ready."; return; }
                        item.disabled = true;
                        status.textContent = "Sending command…";
                        window.SirkPlatformCore.post("mycommands", "execute", { nodeId: id, nodeName: "", commandId: command.id, variableValues: {}, note: "" })
                            .then(function (result) { status.textContent = result.request && result.request.status === "pending" ? "Waiting for approval." : "Command sent."; })
                            .catch(function (error) { status.textContent = error.message || String(error); })
                            .then(function () { item.disabled = false; });
                    };
                    items.appendChild(item);
                });
            });
            if (!items.childElementCount) items.textContent = "No commands available.";
        }

        button.onclick = function () {
            menu.hidden = !menu.hidden;
            button.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
            if (menu.hidden || menu.getAttribute("data-loaded") === "1") return;
            menu.setAttribute("data-loaded", "1");
            window.SirkPlatformCore.api("mycommands", "catalog").then(function (result) { renderCatalog(result.catalog); })
                .catch(function (error) { items.textContent = error.message || String(error); });
        };
        document.addEventListener("pointerdown", function (event) { if (!wrap.contains(event.target)) hide(menu); }, true);
    }

    new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
    install();
}());

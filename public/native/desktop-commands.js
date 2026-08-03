(function () {
    "use strict";

    if (window.__sirkDesktopCommandsLoaded) return;
    window.__sirkDesktopCommandsLoaded = true;

    function currentNodeId() {
        var node = window.currentNode || window.xxcurrentNode || {};
        return String(node._id || node.id || node.nodeid || window.selectedNode || "");
    }

    function close(menu, button) {
        menu.hidden = true;
        button.setAttribute("aria-expanded", "false");
    }

    function install() {
        var tools = document.getElementById("DeskToolsButton");
        if (!tools || !tools.parentNode || document.getElementById("SirkDesktopCommands")) return false;

        var wrapper = document.createElement("span");
        wrapper.id = "SirkDesktopCommands";
        wrapper.className = "sirk-desktop-commands";

        var button = document.createElement("button");
        button.id = "SirkDesktopCommandsButton";
        button.type = "button";
        button.className = "sirk-desktop-commands-toggle";
        button.textContent = "Commands";
        button.title = "Commands";
        button.setAttribute("aria-haspopup", "true");
        button.setAttribute("aria-expanded", "false");

        var menu = document.createElement("section");
        menu.id = "SirkDesktopCommandsMenu";
        menu.className = "sirk-desktop-commands-menu";
        menu.hidden = true;
        menu.innerHTML = '<strong>Commands</strong><div class="sirk-desktop-commands-items">Loading…</div><div class="sirk-desktop-commands-status" aria-live="polite"></div>';

        wrapper.appendChild(button);
        wrapper.appendChild(menu);
        tools.parentNode.insertBefore(wrapper, tools.nextSibling);

        var items = menu.querySelector(".sirk-desktop-commands-items");
        var status = menu.querySelector(".sirk-desktop-commands-status");

        function execute(command, item) {
            var nodeId = currentNodeId();
            if (!nodeId) { status.textContent = "Device is not ready."; return; }
            if (Array.isArray(command.variables) && command.variables.some(function (variable) { return variable.required; })) {
                status.textContent = "Open the Commands tab to enter required values.";
                return;
            }
            item.disabled = true;
            status.textContent = "Sending command…";
            window.SirkPlatformCore.post("mycommands", "execute", {
                nodeId: nodeId,
                nodeName: (window.currentNode && window.currentNode.name) || "",
                commandId: command.id,
                label: command.label || command.id,
                variableValues: {},
                note: ""
            }).then(function (result) {
                status.textContent = result.request && result.request.status === "pending"
                    ? "Waiting for approval."
                    : "Command sent.";
            }).catch(function (error) {
                status.textContent = error && error.message || String(error);
            }).then(function () { item.disabled = false; });
        }

        function render(catalog) {
            items.innerHTML = "";
            (catalog || []).forEach(function (category) {
                var heading = document.createElement("span");
                heading.className = "sirk-desktop-commands-category";
                heading.textContent = category.title || category.key || "Commands";
                items.appendChild(heading);
                (category.commands || []).forEach(function (command) {
                    var item = document.createElement("button");
                    item.type = "button";
                    item.textContent = command.label || command.id;
                    item.title = command.description || item.textContent;
                    item.onclick = function () { execute(command, item); };
                    items.appendChild(item);
                });
            });
            if (!items.querySelector("button")) items.textContent = "No commands available.";
        }

        function load() {
            if (menu.getAttribute("data-loaded") === "1") return;
            menu.setAttribute("data-loaded", "1");
            window.SirkPlatformCore.api("mycommands", "catalog")
                .then(function (result) { render(result.catalog); })
                .catch(function (error) {
                    menu.removeAttribute("data-loaded");
                    items.textContent = error && error.message || String(error);
                });
        }

        button.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            menu.hidden = !menu.hidden;
            button.setAttribute("aria-expanded", menu.hidden ? "false" : "true");
            if (!menu.hidden) load();
        };
        document.addEventListener("pointerdown", function (event) {
            if (!wrapper.contains(event.target)) close(menu, button);
        }, true);
        return true;
    }

    var observer = new MutationObserver(install);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    install();
}());

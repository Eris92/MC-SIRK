(function () {
    "use strict";

    var selectedStatus = "";
    var hostButtonId = "MoveRequestHostButton";
    var legacyTopButtonId = "MainDevSirkPlatform-MoveRequest";

    function renderRows(shell) {
        return shell.api("requests", { status: selectedStatus, q: shell.state.search, page: 1, perPage: 100 }).then(function (result) {
            shell.state.page.details.innerHTML = "";
            (result.rows || []).forEach(function (request) { shell.state.page.details.appendChild(shell.card(request.title || "Move request", (request.requester && request.requester.name || "") + " · " + request.status)); });
        });
    }
    function normalizeNodeId(value) { if (value && typeof value === "object") value = value._id || value.nodeid || value.nodeId || value.dbNodeKey || value.id; return String(value || "").trim(); }
    function resolveHostNodeId(host) {
        var values = []; function add(value) { value = normalizeNodeId(value); if (value && values.indexOf(value) < 0) values.push(value); }
        add(module.api.state.nodeId); add(window.SirkPlatformRuntime && window.SirkPlatformRuntime.state && window.SirkPlatformRuntime.state.nodeId); add(window.currentNodeId); add(window.xxcurrentNodeId); add(window.nodeid); add(window.xxnodeid); add(window.currentNode); add(window.currentDevice); add(window.selectedNode);
        var buttons = host ? host.querySelectorAll('input[type="button"],button') : [];
        for (var index = 0; index < buttons.length; index++) { var onclick = buttons[index].getAttribute("onclick") || ""; var match = onclick.match(/runDeviceCmd\(["']([^"']+)["']/); if (match) add(match[1]); }
        try { var params = new URL(window.location.href).searchParams; add(params.get("gotonode")); add(params.get("nodeid")); } catch (error) {}
        try { return values.length ? decodeURIComponent(values[0]) : ""; } catch (error) { return values[0] || ""; }
    }
    function nodeName(nodeId) { if (window.currentNode && window.currentNode.name) return String(window.currentNode.name); if (window.nodes && window.nodes[nodeId] && window.nodes[nodeId].name) return String(window.nodes[nodeId].name); return String(nodeId || "Device"); }
    function currentMeshId(nodeId) { if (window.currentNode && window.currentNode.meshid) return String(window.currentNode.meshid); if (window.nodes && window.nodes[nodeId] && window.nodes[nodeId].meshid) return String(window.nodes[nodeId].meshid); return ""; }
    function setDialogStatus(status, state, message) { if (!status) return; status.className = "mc-move-dialog-status" + (state ? " mc-results-status mc-results-status-" + state : ""); status.textContent = String(message || ""); if (state && window.MeshThemeAdapter && typeof window.MeshThemeAdapter.status === "function") window.MeshThemeAdapter.status(status); }
    function hostDialogManager() {
        if (typeof window.setDialogMode === "function") return window.setDialogMode;
        if (typeof setDialogMode === "function") return setDialogMode;
        return null;
    }
    function readButtonText(button) { return String(button && (button.value != null ? button.value : button.textContent) || ""); }
    function writeButtonText(button, value) { if (!button) return; if (button.value != null) button.value = value; else button.textContent = value; }

    function openMoveDialog(nodeId) {
        nodeId = String(nodeId || ""); if (!nodeId) { window.alert("No device is selected."); return; }
        module.api.api("meshes", { nodeId: nodeId }).then(function (result) {
            var showDialog = hostDialogManager();
            if (!showDialog) { window.alert("Native MeshCentral dialog is unavailable."); return; }

            var content = document.createElement("div"); content.className = "mc-move-request-native-content";
            var device = document.createElement("div"); device.className = "mc-move-dialog-device"; device.textContent = nodeName(nodeId); content.appendChild(device);
            var groupLabel = document.createElement("label"); groupLabel.setAttribute("for", "SirkMoveRequestTarget"); groupLabel.textContent = "Target group"; content.appendChild(groupLabel);
            var target = document.createElement("select"); target.id = "SirkMoveRequestTarget"; target.className = "mc-move-dialog-input";
            var sourceMeshId = currentMeshId(nodeId); var sourceMesh = (result.meshes || []).filter(function (mesh) { return String(mesh.id) === sourceMeshId; })[0]; var sourceMeshName = sourceMesh && sourceMesh.name || "";
            (result.meshes || []).filter(function (mesh) { return !sourceMeshId || String(mesh.id) !== sourceMeshId; }).forEach(function (mesh) { var option = document.createElement("option"); option.value = mesh.id; option.textContent = mesh.name; target.appendChild(option); }); content.appendChild(target);
            var noteLabel = document.createElement("label"); noteLabel.setAttribute("for", "SirkMoveRequestNote"); noteLabel.textContent = "Requester note"; content.appendChild(noteLabel);
            var note = document.createElement("textarea"); note.id = "SirkMoveRequestNote"; note.className = "mc-move-dialog-input"; note.rows = 4; content.appendChild(note);
            var status = document.createElement("div"); status.id = "SirkMoveRequestStatus"; status.className = "mc-move-dialog-status"; content.appendChild(status);

            showDialog(2, "Move Request", 3, null, content.innerHTML);

            target = document.getElementById("SirkMoveRequestTarget");
            note = document.getElementById("SirkMoveRequestNote");
            status = document.getElementById("SirkMoveRequestStatus");
            var submit = document.getElementById("idx_dlgOkButton");
            var cancel = document.getElementById("idx_dlgCancelButton");
            var close = document.getElementById("id_dialogclose");
            if (!target || !note || !status || !submit) { showDialog(); window.alert("Native MeshCentral dialog controls are unavailable."); return; }

            if (window.MeshThemeAdapter) {
                if (typeof window.MeshThemeAdapter.control === "function") { window.MeshThemeAdapter.control(target); window.MeshThemeAdapter.control(note); }
            }

            var originalSubmitText = readButtonText(submit); var originalSubmitDisabled = !!submit.disabled;
            writeButtonText(submit, "Submit request"); submit.disabled = !target.options.length;
            if (!target.options.length) { target.disabled = true; setDialogStatus(status, "failed", "No target group is available."); }

            var submitting = false; var submitted = false; var cleaned = false;
            function cleanup() {
                if (cleaned) return; cleaned = true;
                submit.removeEventListener("click", onSubmit, true);
                if (cancel) cancel.removeEventListener("click", cleanup, true);
                if (close) close.removeEventListener("click", cleanup, true);
                writeButtonText(submit, originalSubmitText); submit.disabled = originalSubmitDisabled;
            }
            function onSubmit(event) {
                if (event) { if (event.preventDefault) event.preventDefault(); if (event.stopImmediatePropagation) event.stopImmediatePropagation(); else if (event.stopPropagation) event.stopPropagation(); }
                if (submitting || submitted) return; var option = target.options[target.selectedIndex]; if (!option) { setDialogStatus(status, "failed", "Select a target group."); return; }
                submitting = true; submit.disabled = true; setDialogStatus(status, "pending", "Submitting...");
                module.api.post("submit", { nodeId: nodeId, nodeName: nodeName(nodeId), sourceMeshId: sourceMeshId, sourceMeshName: sourceMeshName, targetMeshId: option.value, targetMeshName: option.textContent, note: note.value || "" }).then(function () { submitting = false; submitted = true; submit.disabled = true; setDialogStatus(status, "completed", "Request sent."); }).catch(function (error) { submitting = false; submitted = false; setDialogStatus(status, "failed", error.message || String(error)); submit.disabled = !target.options.length; });
            }
            submit.addEventListener("click", onSubmit, true);
            if (cancel) cancel.addEventListener("click", cleanup, true);
            if (close) close.addEventListener("click", cleanup, true);
        }).catch(function (error) { window.alert(error.message || String(error)); });
    }

    function hostButtonEnabled() { var bootstrap = module.api.state.bootstrap || {}; var config = bootstrap.config || {}; return config.hostButtonEnabled !== false; }
    function removeElement(id) { var element = document.getElementById(id); if (element && element.parentNode) element.parentNode.removeChild(element); }
    function removeHostButton() { removeElement(hostButtonId); removeElement(legacyTopButtonId); }
    function buttonText(button) { return String(button.value || button.textContent || "").replace(/\s+/g, " ").trim().toLowerCase(); }
    function handleHostButtonClick(event) { if (event && event.preventDefault) event.preventDefault(); if (event && event.stopPropagation) event.stopPropagation(); var host = document.getElementById("p10html") || document.getElementById("p10"); openMoveDialog(resolveHostNodeId(host)); return false; }
    function installHostButton() {
        removeElement(legacyTopButtonId); if (!hostButtonEnabled()) { removeElement(hostButtonId); return false; }
        var host = document.getElementById("p10html") || document.getElementById("p10"); if (!host) return false; var existing = document.getElementById(hostButtonId);
        if (existing && host.contains(existing)) { if (String(existing.tagName).toLowerCase() === "input") existing.value = "Move Request"; else existing.textContent = "Move Request"; existing.disabled = false; existing.removeAttribute("onclick"); existing.removeAttribute("onmouseup"); existing.onclick = handleHostButtonClick; return true; }
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
        var buttons = host.querySelectorAll('input[type="button"],button'); var anchor = null; var fallback = null;
        for (var index = 0; index < buttons.length; index++) { var value = buttonText(buttons[index]); fallback = buttons[index]; if (value === "share" || value === "udostępnij" || value === "udostepnij") { anchor = buttons[index]; break; } if (!anchor && (value === "chat" || value === "czat")) anchor = buttons[index]; }
        anchor = anchor || fallback; if (!anchor || !anchor.parentNode) return false; var button = anchor.cloneNode(false); button.id = hostButtonId; button.type = "button"; if (String(button.tagName).toLowerCase() === "input") button.value = "Move Request"; else button.textContent = "Move Request"; button.title = "Submit a device move request"; button.disabled = false; button.setAttribute("data-meshcentral-plugin-pin", "SirkPlatform"); button.setAttribute("data-meshcentral-plugin-click", "Move Request host action"); button.removeAttribute("onclick"); button.removeAttribute("onmouseup"); button.onclick = handleHostButtonClick; anchor.parentNode.insertBefore(button, anchor.nextSibling); return true;
    }
    function scheduleHostButton() { [0, 100, 400, 1000, 2000, 4000].forEach(function (delay) { window.setTimeout(installHostButton, delay); }); }

    var module = window.SirkPlatformModuleShell.create({ key: "moverequests", title: "Move Requests", menuTitle: "Move Requests", showInMenu: false, order: 120, preset: "standard", buttons: { favorites: false, manage: false, settings: false }, tabs: [{ key: "requests", title: "Requests" }], defaultTab: "requests", render: function (shell) { shell.nav(shell.state.page.primary, [{ key: "moverequests", title: "Move Requests", icon: "⇄" }], "moverequests", function () {}); window.SharedStatusNav.mount(shell.state.page.secondary, { selected: selectedStatus, onSelect: function (value) { selectedStatus = value; shell.render(); } }); return renderRows(shell); } });
    var baseDeviceRefresh = module.onDeviceRefreshEnd; module.onDeviceRefreshEnd = function (nodeId) { baseDeviceRefresh(nodeId); scheduleHostButton(); };
    var basePageEnd = module.onNativePageEnd; module.onNativePageEnd = function (view) { basePageEnd(view); scheduleHostButton(); };
    window.SirkPlatformModules.moverequests = module;
}());

(function () {
    "use strict";

    var selectedStatus = "";

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
        var modern = typeof window.setModalContent === "function" && typeof window.showModal === "function" &&
            document.getElementById("xxAddAgentModal") && document.getElementById("xxAddAgentModalConf") && document.getElementById("dialog2");
        if (modern) return { mode: "modern", setContent: window.setModalContent, show: window.showModal };
        var classicSetDialog = typeof window.setDialogMode === "function" ? window.setDialogMode : (typeof setDialogMode === "function" ? setDialogMode : null);
        var classic = classicSetDialog && document.getElementById("dialog") && document.getElementById("id_dialogOptions");
        if (classic) return { mode: "classic", show: classicSetDialog };
        return null;
    }
    function readButtonText(button) { return String(button && (button.value != null ? button.value : button.textContent) || ""); }
    function writeButtonText(button, value) { if (!button) return; if (button.value != null) button.value = value; else button.textContent = value; }

    function openMoveDialog(nodeId) {
        nodeId = String(nodeId || ""); if (!nodeId) { window.alert("No device is selected."); return; }
        module.api.api("meshes", { nodeId: nodeId }).then(function (result) {
            var dialogManager = hostDialogManager();
            if (!dialogManager) { window.alert("Native MeshCentral dialog is unavailable."); return; }

            var content = document.createElement("div"); content.className = "mc-move-request-native-content";
            var fields = document.createElement("div"); fields.id = "SirkMoveRequestFields"; content.appendChild(fields);
            var device = document.createElement("div"); device.className = "mc-move-dialog-device"; device.textContent = nodeName(nodeId); fields.appendChild(device);
            var groupLabel = document.createElement("label"); groupLabel.setAttribute("for", "SirkMoveRequestTarget"); groupLabel.textContent = "Target group"; fields.appendChild(groupLabel);
            var target = document.createElement("select"); target.id = "SirkMoveRequestTarget"; target.className = "mc-move-dialog-input";
            var sourceMeshId = String(result.sourceMeshId || currentMeshId(nodeId)); var sourceMeshName = String(result.sourceMeshName || "");
            (result.meshes || []).filter(function (mesh) { return !sourceMeshId || String(mesh.id) !== sourceMeshId; }).forEach(function (mesh) { var option = document.createElement("option"); option.value = mesh.id; option.textContent = mesh.name; target.appendChild(option); }); fields.appendChild(target);
            var noteLabel = document.createElement("label"); noteLabel.setAttribute("for", "SirkMoveRequestNote"); noteLabel.textContent = "Requester note"; fields.appendChild(noteLabel);
            var note = document.createElement("textarea"); note.id = "SirkMoveRequestNote"; note.className = "mc-move-dialog-input"; note.rows = 4; fields.appendChild(note);
            var status = document.createElement("div"); status.id = "SirkMoveRequestStatus"; status.className = "mc-move-dialog-status"; content.appendChild(status);

            if (dialogManager.mode === "modern") dialogManager.setContent("xxAddAgent", "Move Request", content.innerHTML);
            else dialogManager.show(2, "Move Request", 3, null, content.innerHTML);

            fields = document.getElementById("SirkMoveRequestFields");
            target = document.getElementById("SirkMoveRequestTarget");
            note = document.getElementById("SirkMoveRequestNote");
            status = document.getElementById("SirkMoveRequestStatus");
            var submit = document.getElementById("idx_dlgOkButton");
            var cancel = document.getElementById("idx_dlgCancelButton");
            var close = document.getElementById("id_dialogclose");
            if (!fields || !target || !note || !status || !submit) { window.alert("Native MeshCentral dialog controls are unavailable."); return; }

            if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.control === "function") { window.MeshThemeAdapter.control(target); window.MeshThemeAdapter.control(note); }

            var originalSubmitText = readButtonText(submit); var originalSubmitDisabled = !!submit.disabled;
            var modernModal = document.getElementById("xxAddAgentModal");
            var cancelButtons = [];
            function addCancelButton(button) {
                if (button && cancelButtons.every(function (item) { return item.button !== button; })) {
                    cancelButtons.push({ button: button, style: button.style.cssText });
                }
            }
            addCancelButton(cancel);
            if (dialogManager.mode === "modern" && modernModal) {
                var footer = modernModal.querySelector(".modal-footer");
                if (footer) Array.prototype.forEach.call(footer.querySelectorAll("button,input"), function (button) {
                    if (/^(cancel|anuluj)$/i.test(readButtonText(button).trim())) addCancelButton(button);
                });
            }
            writeButtonText(submit, "Submit request"); submit.disabled = !target.options.length;
            if (!target.options.length) { target.disabled = true; setDialogStatus(status, "failed", "No target group is available."); }

            var submitting = false; var submitted = false; var cleaned = false;
            function cleanup() {
                if (cleaned) return; cleaned = true;
                if (dialogManager.mode === "classic") submit.removeEventListener("click", onClassicSubmit, true);
                if (cancel) cancel.removeEventListener("click", cleanup, true);
                if (close) close.removeEventListener("click", cleanup, true);
                if (modernModal) modernModal.removeEventListener("hidden.bs.modal", cleanup);
                writeButtonText(submit, originalSubmitText); submit.disabled = originalSubmitDisabled;
                cancelButtons.forEach(function (item) { item.button.style.cssText = item.style; });
            }
            function finishRequest(ok, message) {
                fields.textContent = "";
                setDialogStatus(status, ok ? "completed" : "failed", message);
                submitted = true;
                writeButtonText(submit, "OK");
                submit.disabled = false;
                cancelButtons.forEach(function (item) { item.button.style.setProperty("display", "none", "important"); });
            }
            function submitRequest() {
                if (submitted) return true;
                if (submitting) return false; var option = target.options[target.selectedIndex]; if (!option) { setDialogStatus(status, "failed", "Select a target group."); return false; }
                submitting = true; submit.disabled = true; setDialogStatus(status, "pending", "Submitting...");
                var deviceLabel = nodeName(nodeId);
                var fromName = sourceMeshName || sourceMeshId || "unknown";
                var toName = option.textContent || option.value;
                var summary = deviceLabel + " z grupy " + fromName + " do grupy " + toName + ".";
                module.api.post("submit", { nodeId: nodeId, nodeName: deviceLabel, sourceMeshId: sourceMeshId, sourceMeshName: sourceMeshName, targetMeshId: option.value, targetMeshName: option.textContent, note: note.value || "" }).then(function () {
                    submitting = false;
                    finishRequest(true, "Zlecono przeniesienie " + summary);
                }).catch(function (error) {
                    submitting = false;
                    finishRequest(false, "Nie udalo sie zlecic przeniesienia " + summary + " " + (error.message || String(error)));
                });
                return false;
            }
            function onClassicSubmit(event) {
                if (submitted) { cleanup(); return; }
                if (event) { if (event.preventDefault) event.preventDefault(); if (event.stopImmediatePropagation) event.stopImmediatePropagation(); else if (event.stopPropagation) event.stopPropagation(); }
                submitRequest();
            }
            if (dialogManager.mode === "modern") {
                dialogManager.show("xxAddAgentModal", "idx_dlgOkButton", submitRequest);
                if (modernModal) modernModal.addEventListener("hidden.bs.modal", cleanup);
            } else {
                submit.addEventListener("click", onClassicSubmit, true);
                if (cancel) cancel.addEventListener("click", cleanup, true);
                if (close) close.addEventListener("click", cleanup, true);
            }
        }).catch(function (error) { window.alert(error.message || String(error)); });
    }

    var module = window.SirkPlatformModuleShell.create({ key: "moverequests", title: "Move Requests", menuTitle: "Move Requests", showInMenu: false, order: 120, preset: "standard", buttons: { favorites: false, manage: false, settings: false }, tabs: [{ key: "requests", title: "Requests" }], defaultTab: "requests", render: function (shell) { shell.nav(shell.state.page.primary, [{ key: "moverequests", title: "Move Requests", icon: "⇄" }], "moverequests", function () {}); window.SharedStatusNav.mount(shell.state.page.secondary, { selected: selectedStatus, onSelect: function (value) { selectedStatus = value; shell.render(); } }); return renderRows(shell); } });
    module.openHostAction = function (nodeId) {
        var host = document.getElementById("p10html") || document.getElementById("p10");
        openMoveDialog(normalizeNodeId(nodeId) || resolveHostNodeId(host));
    };
    window.SirkPlatformModules.moverequests = module;
}());
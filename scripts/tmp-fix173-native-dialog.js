"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

function replaceRange(file, startMarker, endMarker, replacement) {
    const full = path.join(root, file);
    const source = fs.readFileSync(full, "utf8");
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);
    if (start < 0 || end < 0 || end <= start) throw new Error(`Cannot locate replacement range in ${file}`);
    fs.writeFileSync(full, source.slice(0, start) + replacement + source.slice(end), "utf8");
}

const runtimeBlock = `    function setDialogStatus(status, state, message) { if (!status) return; status.className = "mc-move-dialog-status" + (state ? " mc-results-status mc-results-status-" + state : ""); status.textContent = String(message || ""); if (state && window.MeshThemeAdapter && typeof window.MeshThemeAdapter.status === "function") window.MeshThemeAdapter.status(status); }
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
`;

replaceRange(
    "public/modules/move-requests/index.js",
    "    function closeDialog(dialog)",
    "\n    function hostButtonEnabled()",
    runtimeBlock
);

const surfaceTest = `"use strict";\n\nvar assert = require("assert");\nvar fs = require("fs");\nvar path = require("path");\nvar root = path.resolve(__dirname, "..");\nvar source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");\n\nassert.ok(source.indexOf('function hostDialogManager()') >= 0 && source.indexOf('window.setDialogMode') >= 0,\n    "Move Request must delegate modal ownership to the native MeshCentral dialog manager.");\nassert.ok(source.indexOf('showDialog(2, "Move Request", 3, null, content.innerHTML);') >= 0,\n    "Move Request must open through native setDialogMode mode 2 with the native OK/Cancel footer.");\nassert.ok(source.indexOf('document.getElementById("idx_dlgOkButton")') >= 0 &&\n    source.indexOf('document.getElementById("idx_dlgCancelButton")') >= 0 &&\n    source.indexOf('document.getElementById("id_dialogclose")') >= 0,\n    "Move Request must reuse the native host dialog controls instead of rendering plugin modal buttons.");\nassert.ok(source.indexOf('writeButtonText(submit, "Submit request")') >= 0,\n    "The native host OK control must be relabeled to Submit request without replacing its native styling.");\nassert.strictEqual(source.indexOf('overlay.className = "mc-move-dialog-overlay"'), -1,\n    "Move Request must not create a parallel plugin overlay once native setDialogMode owns the dialog.");\nassert.strictEqual(source.indexOf('dialogFrame.className = "mc-move-dialog-frame"'), -1,\n    "Move Request must not recreate the host modal-dialog frame.");\nassert.strictEqual(source.indexOf('document.body.appendChild(overlay)'), -1,\n    "Move Request must not append a custom modal tree to document.body.");\nassert.strictEqual(source.indexOf('submit.className = "sirk-primary-action"'), -1,\n    "Move Request must use the host OK button surface instead of styling a plugin submit button.");\n\nconsole.log("Move Request delegates dialog surface and footer ownership to MeshCentral setDialogMode: OK");\n`;
fs.writeFileSync(path.join(root, "test/move-request-dialog-surface.test.js"), surfaceTest, "utf8");

const submitTest = `"use strict";\n\nvar assert = require("assert");\nvar fs = require("fs");\nvar path = require("path");\nvar root = path.resolve(__dirname, "..");\nvar source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");\n\nassert.ok(source.indexOf('function setDialogStatus(status, state, message)') >= 0 &&\n    source.indexOf('window.MeshThemeAdapter.status(status)') >= 0,\n    "Move Request must reuse the shared semantic status owner on the injected native-dialog status node.");\nassert.ok(source.indexOf('setDialogStatus(status, "pending", "Submitting...")') >= 0,\n    "Submit must expose an in-flight pending state in the native dialog.");\nassert.ok(source.indexOf('setDialogStatus(status, "completed", "Request sent.")') >= 0,\n    "Success must remain visible in the same native dialog status node.");\nassert.ok(source.indexOf('setDialogStatus(status, "failed", error.message || String(error))') >= 0,\n    "Rejected submit must keep the native dialog open and expose the error in the same status node.");\nassert.ok(source.indexOf('var submitting = false; var submitted = false;') >= 0 &&\n    source.indexOf('if (submitting || submitted) return;') >= 0,\n    "Rapid repeated submit must remain guarded before issuing another POST.");\nassert.ok(source.indexOf('event.stopImmediatePropagation') >= 0 &&\n    source.indexOf('submit.addEventListener("click", onSubmit, true)') >= 0,\n    "Submit must intercept the native OK click before MeshCentral dialogclose so async status can remain visible.");\nassert.ok(source.indexOf('cancel.addEventListener("click", cleanup, true)') >= 0 &&\n    source.indexOf('close.addEventListener("click", cleanup, true)') >= 0,\n    "Native Cancel/X must cleanly restore the shared host OK control before MeshCentral closes the dialog.");\nassert.ok(source.indexOf('var sourceMeshName = sourceMesh && sourceMesh.name || ""') >= 0 &&\n    source.indexOf('sourceMeshName: sourceMeshName') >= 0,\n    "Move Request submit must preserve human-readable source group metadata.");\nassert.strictEqual(source.indexOf('window.alert("Move request was created in Approval Center.")'), -1,\n    "Successful submit must not show a blocking browser alert.");\nassert.strictEqual(source.indexOf('closeDialog('), -1,\n    "Successful submit must not use the removed plugin overlay close path.");\n\nconsole.log("Move Request keeps guarded async feedback while reusing the native host OK button: OK");\n`;
fs.writeFileSync(path.join(root, "test/move-request-submit-feedback.test.js"), submitTest, "utf8");

console.log("Applied #173 native dialog-manager migration.");

from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"Expected fragment not found in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


# #125: View is a primary action and the shared adapter must preserve that semantic after refresh.
replace(
    'public/shared/ui/toolbar-config.js',
    'if (element.classList.contains("mc-command-run-button") || element.classList.contains("mc-admin-primary") || element.classList.contains("sirk-primary-action")) return "primary";',
    'if (element.classList.contains("mc-command-run-button") || element.classList.contains("mc-results-view-button") || element.classList.contains("mc-admin-primary") || element.classList.contains("sirk-primary-action")) return "primary";'
)

# #127: keep submit feedback in the existing dialog status node and guard one request lifecycle.
replace(
    'public/modules/move-requests/index.js',
    '''    function closeDialog(dialog) {
        if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
    }

    function openMoveDialog(nodeId) {''',
    '''    function closeDialog(dialog) {
        if (dialog && dialog.parentNode) dialog.parentNode.removeChild(dialog);
    }

    function setDialogStatus(status, state, message) {
        if (!status) return;
        status.className = "mc-move-dialog-status" + (state ? " mc-results-status mc-results-status-" + state : "");
        status.textContent = String(message || "");
        if (state && window.MeshThemeAdapter && typeof window.MeshThemeAdapter.status === "function") {
            window.MeshThemeAdapter.status(status);
        }
    }

    function openMoveDialog(nodeId) {'''
)
replace(
    'public/modules/move-requests/index.js',
    '''            if (!select.options.length) {
                select.disabled = true;
                status.textContent = "No target group is available.";
            }''',
    '''            if (!select.options.length) {
                select.disabled = true;
                setDialogStatus(status, "failed", "No target group is available.");
            }'''
)
replace(
    'public/modules/move-requests/index.js',
    '''            var submit = document.createElement("button");
            submit.type = "button";
            submit.className = "btn btn-primary";
            submit.textContent = "Submit request";
            submit.disabled = !select.options.length;
            submit.onclick = function () {
                var option = select.options[select.selectedIndex];
                if (!option) {
                    status.textContent = "Select a target group.";
                    return;
                }

                submit.disabled = true;
                status.textContent = "Submitting...";

                module.api.post("submit", {
                    nodeId: nodeId,
                    nodeName: nodeName(nodeId),
                    sourceMeshId: sourceMeshId,
                    targetMeshId: option.value,
                    targetMeshName: option.textContent,
                    note: note.value || ""
                }).then(function () {
                    closeDialog(overlay);
                    window.alert("Move request was created in Approval Center.");
                }).catch(function (error) {
                    status.textContent = error.message || String(error);
                    submit.disabled = false;
                });
            };''',
    '''            var submit = document.createElement("button");
            submit.type = "button";
            submit.className = "btn btn-primary";
            submit.textContent = "Submit request";
            submit.disabled = !select.options.length;
            var submitting = false;
            var submitted = false;
            submit.onclick = function () {
                if (submitting || submitted) return;
                var option = select.options[select.selectedIndex];
                if (!option) {
                    setDialogStatus(status, "failed", "Select a target group.");
                    return;
                }

                submitting = true;
                submit.disabled = true;
                setDialogStatus(status, "pending", "Submitting...");

                module.api.post("submit", {
                    nodeId: nodeId,
                    nodeName: nodeName(nodeId),
                    sourceMeshId: sourceMeshId,
                    targetMeshId: option.value,
                    targetMeshName: option.textContent,
                    note: note.value || ""
                }).then(function () {
                    submitting = false;
                    submitted = true;
                    submit.disabled = true;
                    setDialogStatus(status, "completed", "Request sent.");
                }).catch(function (error) {
                    submitting = false;
                    submitted = false;
                    setDialogStatus(status, "failed", error.message || String(error));
                    submit.disabled = !select.options.length;
                });
            };'''
)

Path('test/results-view-button-variant.test.js').write_text(r'''"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var results = fs.readFileSync(path.join(root, "public/shared/ui/results.js"), "utf8");
var theme = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");

assert.ok(results.indexOf('view.className = "btn btn-primary btn-sm mc-results-view-button"') >= 0,
    "Results renderer must declare View as the primary row action.");
assert.ok(theme.indexOf('element.classList.contains("mc-results-view-button")') >= 0,
    "MeshThemeAdapter must preserve View as a primary native action after refresh.");
assert.ok(theme.indexOf('if (element.classList.contains("mc-command-run-button") || element.classList.contains("mc-results-view-button")') >= 0,
    "View must share the existing primary button variant owner rather than a per-theme CSS surface.");
assert.ok(results.indexOf('copy.className = "btn btn-secondary btn-sm"') >= 0 &&
    results.indexOf('download.className = "btn btn-secondary btn-sm mc-results-download-button"') >= 0,
    "Copy and Download must remain secondary actions.");
assert.strictEqual(theme.indexOf('.mc-results-view-button{'), -1,
    "Theme adapter JavaScript must not introduce hardcoded View surface CSS.");
console.log("Results View keeps its native primary variant through theme refresh: OK");
''')

Path('test/move-request-submit-feedback.test.js').write_text(r'''"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");

assert.ok(source.indexOf('function setDialogStatus(status, state, message)') >= 0 &&
    source.indexOf('window.MeshThemeAdapter.status(status)') >= 0,
    "Move Request must reuse the shared semantic status owner on its existing status node.");
assert.ok(source.indexOf('setDialogStatus(status, "pending", "Submitting...")') >= 0,
    "Submit must expose an in-flight pending state in the dialog.");
assert.ok(source.indexOf('setDialogStatus(status, "completed", "Request sent.")') >= 0,
    "Success must remain visible in the same dialog status node.");
assert.ok(source.indexOf('setDialogStatus(status, "failed", error.message || String(error))') >= 0,
    "Rejected submit must keep the dialog open and expose the error in the same status node.");
assert.ok(source.indexOf('var submitting = false;') >= 0 && source.indexOf('var submitted = false;') >= 0 &&
    source.indexOf('if (submitting || submitted) return;') >= 0,
    "Rapid repeated submit must be guarded before issuing another POST.");
assert.ok(source.indexOf('submitted = true;') >= 0 && source.indexOf('submit.disabled = true;') >= 0,
    "A successful dialog must not be reusable for an automatic duplicate request.");
assert.strictEqual(source.indexOf('window.alert("Move request was created in Approval Center.")'), -1,
    "Successful submit must not show a blocking browser alert.");
var successStart = source.indexOf('setDialogStatus(status, "completed", "Request sent.")');
var submitStart = source.indexOf('submit.onclick = function ()');
var catchStart = source.indexOf('}).catch(function (error)', submitStart);
var submitFlow = source.slice(submitStart, catchStart);
assert.strictEqual(submitFlow.indexOf('closeDialog(overlay)'), -1,
    "Successful submit must not close the dialog before the user can read the success state.");
assert.ok(successStart > submitStart && successStart < catchStart,
    "Success status must be part of the successful submit promise path.");
console.log("Move Request submit uses one guarded dialog status lifecycle without browser alert: OK");
''')

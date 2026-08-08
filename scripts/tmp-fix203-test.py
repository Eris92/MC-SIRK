from pathlib import Path
p = Path('test/move-request-submit-feedback.test.js')
s = p.read_text()
s = s.replace("source.indexOf('if (submitting || submitted) return;')", "source.indexOf('if (submitting || submitted) return false;')")
old = '''assert.ok(source.indexOf('event.stopImmediatePropagation') >= 0 &&\n    source.indexOf('submit.addEventListener("click", onSubmit, true)') >= 0,\n    "Submit must intercept the native OK click before MeshCentral dialogclose so async status can remain visible.");\nassert.ok(source.indexOf('cancel.addEventListener("click", cleanup, true)') >= 0 &&\n    source.indexOf('close.addEventListener("click", cleanup, true)') >= 0,\n    "Native Cancel/X must cleanly restore the shared host OK control before MeshCentral closes the dialog.");\n'''
new = '''assert.ok(source.indexOf('dialogManager.show("xxAddAgentModal", "idx_dlgOkButton", submitRequest)') >= 0 &&\n    source.indexOf('return false;', source.indexOf('function submitRequest()')) >= 0,\n    "Modern submit must use the native showModal callback and return false so async status remains visible.");\nassert.ok(source.indexOf('event.stopImmediatePropagation') >= 0 &&\n    source.indexOf('submit.addEventListener("click", onClassicSubmit, true)') >= 0,\n    "Classic submit must intercept setDialogMode OK before dialogclose while Modern remains callback-owned.");\nassert.ok(source.indexOf('modernModal.addEventListener("hidden.bs.modal", cleanup)') >= 0 &&\n    source.indexOf('cancel.addEventListener("click", cleanup, true)') >= 0 &&\n    source.indexOf('close.addEventListener("click", cleanup, true)') >= 0,\n    "Modern hidden and Classic Cancel/X paths must restore the shared host OK control.");\n'''
assert old in s
s = s.replace(old, new)
p.write_text(s)

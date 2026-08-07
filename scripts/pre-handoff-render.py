from pathlib import Path


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 occurrence, got {count}")
    return text.replace(old, new, 1)

shell_path = Path("public/shared/module-shell.js")
shell = shell_path.read_text(encoding="utf-8")
old = '''                render: function () {
                    if (!state.page) return;
                    state.page.layout.clear();
                    Promise.resolve(definition.render(api)).catch(function (error) { renderError(state.page.details, error); });
                },
'''
new = '''                render: function () {
                    if (!state.page) return Promise.resolve();
                    var page = state.page;
                    var sequence = Number(state.renderSequence || 0) + 1;
                    state.renderSequence = sequence;
                    var realSecondary = page.secondary;
                    var realDetails = page.details;
                    var nextSecondary = document.createElement("section");
                    var nextDetails = document.createElement("section");
                    nextSecondary.className = realSecondary.className;
                    nextDetails.className = realDetails.className;
                    page.secondary = nextSecondary;
                    page.details = nextDetails;

                    function restoreReferences() {
                        if (page.secondary === nextSecondary) page.secondary = realSecondary;
                        if (page.details === nextDetails) page.details = realDetails;
                    }
                    function replaceChildren(target, source) {
                        while (target.firstChild) target.removeChild(target.firstChild);
                        while (source.firstChild) target.appendChild(source.firstChild);
                    }
                    function commit() {
                        restoreReferences();
                        if (sequence !== state.renderSequence) return;
                        replaceChildren(realSecondary, nextSecondary);
                        replaceChildren(realDetails, nextDetails);
                        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.refresh === "function") {
                            window.MeshThemeAdapter.refresh(page.root || realDetails.parentNode);
                        }
                    }

                    var operation;
                    try { operation = definition.render(api); }
                    catch (error) {
                        restoreReferences();
                        renderError(realDetails, error);
                        return Promise.reject(error);
                    }
                    return Promise.resolve(operation).then(function () {
                        commit();
                    }).catch(function (error) {
                        restoreReferences();
                        if (sequence === state.renderSequence) renderError(realDetails, error);
                    });
                },
'''
shell = once(shell, old, new, "integrate stable rendering")
shell_path.write_text(shell, encoding="utf-8")

css_path = Path("public/shared/ui/shared-ui.css")
css = css_path.read_text(encoding="utf-8")
extra = '''
.mc-shared-layout{gap:0}
.mc-shared-primary,.mc-shared-secondary,.mc-shared-details{border:1px solid var(--bs-border-color,currentColor)}
.mc-shared-secondary,.mc-shared-details{border-left:0}
'''
if ".mc-shared-secondary,.mc-shared-details{border-left:0}" not in css:
    css = css.rstrip() + "\n" + extra
css_path.write_text(css, encoding="utf-8")

print("Stable rendering moved into module-shell")

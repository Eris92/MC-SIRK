(function () {
    "use strict";

    if (!window.SharedScriptTools || window.__sirkPlatformSystemCredentialsForm) return;
    window.__sirkPlatformSystemCredentialsForm = true;

    var originalCreate = window.SharedScriptTools.create;

    function element(tag, className, value) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (value != null) node.textContent = value;
        return node;
    }

    window.SharedScriptTools.create = function (options) {
        var tool = originalCreate.call(window.SharedScriptTools, options);
        var originalOpen = tool.openDefinitionEditor;

        tool.openDefinitionEditor = function (shell, script, onSaved) {
            originalOpen.call(tool, shell, script, onSaved);

            shell.api("system-credentials", { path: script.path }).then(function (response) {
                var state = response.systemCredentials || { profiles: [] };
                var host = shell.state.page.details;
                var card = host.querySelector(".sirk-script-definition-form");
                if (!card || card.querySelector(".sirk-definition-system-credentials")) return;

                var section = element("section", "sirk-definition-section sirk-definition-system-credentials");
                section.appendChild(element("h4", "", "Credentials / secrets - System"));
                section.appendChild(element(
                    "div",
                    "sirk-shared-muted sirk-system-credentials-description",
                    "Use credentials configured globally in SirkPlatform. Secrets stay encrypted and are not copied into the script."
                ));

                var list = element("div", "sirk-system-credentials-list");
                var profiles = Array.isArray(state.profiles) ? state.profiles : [];

                profiles.forEach(function (profile) {
                    var label = element("label", "sirk-system-credential-item");
                    var box = element("input");
                    box.type = "checkbox";
                    box.value = profile.name;
                    box.checked = profile.selected === true;
                    box.disabled = profile.configured !== true;

                    var name = element("span", "sirk-system-credential-name", profile.label || profile.name);
                    var status = element(
                        "span",
                        profile.configured ? "sirk-system-credential-configured" : "sirk-system-credential-unavailable",
                        profile.configured ? "Configured" : "Not configured globally"
                    );

                    label.appendChild(box);
                    label.appendChild(name);
                    label.appendChild(status);
                    list.appendChild(label);

                    box.onchange = function () {
                        var selected = Array.prototype.map.call(
                            list.querySelectorAll('input[type="checkbox"]:checked:not(:disabled)'),
                            function (item) { return item.value; }
                        );
                        list.classList.add("is-saving");
                        shell.post("system-credentials", {
                            path: script.path,
                            selected: selected
                        }).then(function () {
                            list.classList.remove("is-saving");
                            list.classList.add("is-saved");
                            window.setTimeout(function () {
                                list.classList.remove("is-saved");
                            }, 900);
                        }).catch(function (error) {
                            box.checked = !box.checked;
                            list.classList.remove("is-saving");
                            var note = element("div", "sirk-error", error.message || String(error));
                            section.appendChild(note);
                        });
                    };
                });

                if (!profiles.length) {
                    list.appendChild(element("div", "sirk-shared-muted", "No global integration profiles are available."));
                }

                section.appendChild(list);
                var execution = card.querySelector(".sirk-definition-section:not(.sirk-definition-approval):not(.sirk-definition-system-credentials)");
                if (execution && execution.parentNode === card) card.insertBefore(section, execution);
                else {
                    var source = card.querySelector(".sirk-definition-source");
                    if (source) card.insertBefore(section, source);
                    else card.appendChild(section);
                }
            }).catch(function (error) {
                if (window.console) console.error("System credential profiles could not be loaded", error);
            });
        };

        return tool;
    };
}());
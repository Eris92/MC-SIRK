(function () {
    "use strict";

    function installNativeLeftMenuContract() {
        var core = window.SirkPlatformCore;
        if (!core || core.__nativeLeftMenuContractInstalled) return;
        core.__nativeLeftMenuContractInstalled = true;

        function isModern(element) {
            return String(element && element.tagName || "").toLowerCase() === "a" ||
                !!(element && element.classList && element.classList.contains("nav-link"));
        }

        function baseClassName(anchor) {
            return String(anchor && anchor.className || "").split(/\s+/).filter(function (name) {
                return name && name !== "lbbuttonsel" && name !== "lbbuttonsel2" && name !== "active";
            }).join(" ");
        }

        function normalizeLegacyIcon(anchor, item) {
            if (!anchor || !item || typeof anchor.querySelector !== "function" ||
                typeof item.querySelector !== "function") return;

            var nativeIcon = anchor.querySelector(".lbtg");
            var currentIcon = item.querySelector(".lbtg");
            if (!nativeIcon || !currentIcon || typeof nativeIcon.cloneNode !== "function") return;

            var source = currentIcon.style && currentIcon.style.backgroundImage || "";
            var icon = nativeIcon.cloneNode(true);
            if (icon.removeAttribute) icon.removeAttribute("id");
            if (icon.style && source) {
                icon.style.backgroundImage = source;
                icon.style.backgroundPosition = "center";
                icon.style.backgroundRepeat = "no-repeat";
                icon.style.backgroundSize = "40px 40px";
            }
            if (currentIcon.parentNode && typeof currentIcon.parentNode.replaceChild === "function") {
                currentIcon.parentNode.replaceChild(icon, currentIcon);
            }
        }

        var originalEnsureMenu = core.ensureMenu;
        if (typeof originalEnsureMenu === "function") {
            core.ensureMenu = function (definition) {
                var result = originalEnsureMenu.call(core, definition);
                var anchor = typeof document !== "undefined"
                    ? document.getElementById("LeftMenuMyDevices")
                    : null;
                var item = definition && definition.leftId && typeof document !== "undefined"
                    ? document.getElementById(definition.leftId)
                    : null;
                if (!anchor || !item) return result;

                item.className = baseClassName(anchor);
                item.classList.remove("lbbuttonsel", "lbbuttonsel2", "active");
                item.removeAttribute("aria-current");

                if (!isModern(item)) normalizeLegacyIcon(anchor, item);
                return result;
            };
        }

        core.setPluginMenuActive = function (main, left, active) {
            if (main) {
                main.classList.remove("fullselect", "semiselect", "active");
                main.removeAttribute("aria-current");
                if (active) {
                    main.classList.add(isModern(main) ? "active" : "fullselect");
                    main.setAttribute("aria-current", "page");
                }
            }
            if (left) {
                left.classList.remove("lbbuttonsel", "lbbuttonsel2", "active");
                left.removeAttribute("aria-current");
                if (active) {
                    if (isModern(left)) left.classList.add("active", "lbbuttonsel2");
                    else left.classList.add("lbbuttonsel");
                    left.setAttribute("aria-current", "page");
                }
            }
        };
    }

    function installNativeWorkspaceTitleContract() {
        var core = window.SirkPlatformCore;
        if (!core || core.__nativeWorkspaceTitleContractInstalled) return;
        core.__nativeWorkspaceTitleContractInstalled = true;

        function isInteractive(element) {
            var tag = String(element && element.tagName || "").toLowerCase();
            return tag === "a" || tag === "button" || tag === "input" ||
                tag === "select" || tag === "textarea" || tag === "script" ||
                tag === "style";
        }
        function meaningfulTextNode(root) {
            if (!root || !root.childNodes) return null;
            for (var index = 0; index < root.childNodes.length; index += 1) {
                var node = root.childNodes[index];
                if (!node) continue;
                if (node.nodeType === 3 && String(node.nodeValue || "").trim()) return node;
                if (node.nodeType === 1 && !isInteractive(node)) {
                    var nested = meaningfulTextNode(node);
                    if (nested) return nested;
                }
            }
            return null;
        }

        function belongsTo(host, node) {
            if (!host || !node) return false;
            if (typeof host.contains === "function") return host.contains(node);
            for (var current = node; current; current = current.parentNode) {
                if (current === host) return true;
            }
            return false;
        }

        function restoreTitleBinding(binding) {
            if (!binding || !binding.textNode) return;
            if (binding.fallback) {
                if (binding.textNode.parentNode) binding.textNode.parentNode.removeChild(binding.textNode);
            } else {
                binding.textNode.nodeValue = binding.originalText;
            }
        }

        function captureTitleBinding(titleHost, previous) {
            if (previous && previous.host === titleHost && belongsTo(titleHost, previous.textNode)) {
                return previous;
            }
            restoreTitleBinding(previous);

            var titleElement = titleHost && typeof titleHost.querySelector === "function"
                ? titleHost.querySelector("h1") || titleHost
                : titleHost;
            var textNode = meaningfulTextNode(titleElement);
            var fallback = false;
            if (!textNode && titleElement && typeof document.createTextNode === "function") {
                textNode = document.createTextNode("");
                if (typeof titleElement.insertBefore === "function") {
                    titleElement.insertBefore(textNode, titleElement.firstChild || null);
                } else if (typeof titleElement.appendChild === "function") {
                    titleElement.appendChild(textNode);
                }
                fallback = true;
            }
            return {
                host: titleHost,
                element: titleElement,
                textNode: textNode,
                originalText: textNode ? String(textNode.nodeValue || "") : "",
                fallback: fallback
            };
        }

        function setNativeTitle(binding, title) {
            if (!binding || !binding.textNode) return;
            var original = String(binding.originalText || "");
            var leading = (original.match(/^\s*/) || [""])[0];
            var trailing = (original.match(/\s*$/) || [""])[0];
            binding.textNode.nodeValue = leading + String(title || "") + trailing;
        }

        core.restoreWorkspace = function () {
            var state = core.workspaceState;
            document.documentElement.classList.remove("sirk-platform-workspace-active");
            if (!state) return;

            restoreTitleBinding(state.titleBinding);
            (state.hidden || []).forEach(function (item) {
                item.element.style.cssText = item.cssText;
                item.element.hidden = item.hidden;
            });
            var workspace = document.getElementById("SirkPlatformWorkspace");
            if (workspace) {
                while (workspace.firstChild) workspace.removeChild(workspace.firstChild);
                workspace.style.display = "none";
            }
            core.workspaceState = null;
        };

        core.showWorkspace = function (title, viewMode, render) {
            var page = document.getElementById("p1");
            var titleHost = document.getElementById("p1title");
            if (!page || !titleHost) return false;

            var workspace = document.getElementById("SirkPlatformWorkspace");
            if (!workspace) {
                workspace = document.createElement("div");
                workspace.id = "SirkPlatformWorkspace";
                page.appendChild(workspace);
            }

            if (!core.workspaceState) {
                var hidden = [];
                for (var child = page.firstElementChild; child; child = child.nextElementSibling) {
                    if (child === titleHost || child === workspace) continue;
                    hidden.push({ element: child, cssText: child.style.cssText, hidden: child.hidden });
                    child.hidden = true;
                    child.style.setProperty("display", "none", "important");
                }
                core.workspaceState = {
                    titleBinding: captureTitleBinding(titleHost, null),
                    hidden: hidden,
                    viewMode: Number(viewMode)
                };
            } else {
                core.workspaceState.titleBinding = captureTitleBinding(
                    titleHost,
                    core.workspaceState.titleBinding
                );
            }

            setNativeTitle(core.workspaceState.titleBinding, title);
            core.workspaceState.viewMode = Number(viewMode);
            document.documentElement.classList.add("sirk-platform-workspace-active");
            while (workspace.firstChild) workspace.removeChild(workspace.firstChild);
            workspace.style.display = "block";
            render(workspace);
            return true;
        };
    }

    installNativeLeftMenuContract();
    installNativeWorkspaceTitleContract();

    function storageKey(options) {
        if (options.layoutStorageKey) return String(options.layoutStorageKey);
        var preset = String(options.preset || "standard").toLowerCase();
        return "sirkPlatform.layout." + preset + ".collapsed";
    }

    window.SharedPage = {
        mount: function (options) {
            options = options || {};
            var host = typeof options.container === "string"
                ? document.querySelector(options.container)
                : options.container;
            var preset = String(options.preset || "standard").toLowerCase();

            host.innerHTML = "";
            host.className = "mc-shared-page mc-shared-page-" + preset;
            host.setAttribute("data-module-preset", preset);
            host.setAttribute("data-frontend", "meshcentral");

            var tabsHost = document.createElement("div");
            tabsHost.className = "mc-shared-tabs";
            var toolbarHost = document.createElement("div");
            toolbarHost.className = "mc-shared-toolbar-host";
            var layoutHost = document.createElement("div");
            layoutHost.className = "mc-shared-layout-host";

            host.appendChild(tabsHost);
            host.appendChild(toolbarHost);
            host.appendChild(layoutHost);

            var layout = window.SharedLayout.mount({
                container: layoutHost,
                storageKey: storageKey(options)
            });
            var toolbar = window.SharedToolbar.mount({
                container: toolbarHost,
                preset: options.preset || "standard",
                buttons: options.buttons || {},
                handlers: options.handlers || {},
                customButtons: options.customButtons || []
            });
            var tabs = window.SharedTabs.mount({
                container: tabsHost,
                tabs: options.tabs || [],
                active: options.activeTab,
                onSelect: options.onTab
            });
            return {
                root: host,
                tabs: tabs,
                toolbar: toolbar,
                layout: layout,
                primary: layout.primary,
                secondary: layout.secondary,
                details: layout.details,
                frontend: "meshcentral"
            };
        }
    };
}());
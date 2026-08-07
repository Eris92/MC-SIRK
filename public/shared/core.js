(function () {
    "use strict";
    window.SirkPlatformCore = window.SirkPlatformCore || {};
    var core = window.SirkPlatformCore;
    core.assetVersion = String(window.__SIRK_PLATFORM_VERSION__ || "0");
    core.activePlugin = core.activePlugin || null;
    core.requestTimeoutMs = Math.max(1000, Number(core.requestTimeoutMs) || 15000);

    function svgData(svg) {
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    }

    var modernMenuIcons = {
        approvalcenter: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="12" y="9" width="34" height="46" rx="4" fill="#7b1fa2"/><rect x="20" y="4" width="20" height="10" rx="4" fill="#4a148c"/><path fill="#fff" d="M20 23h18v4H20zm0 9h12v4H20z"/><circle cx="45" cy="43" r="13" fill="#2e7d32" stroke="#fff" stroke-width="3"/><path fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="m39 43 4 4 8-9"/></svg>'),
        myscripts: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#7b1fa2" d="M12 5h31l9 9v45H12z"/><path fill="#fff" opacity=".9" d="M39 5v13h13z"/><path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="m25 29-7 6 7 6m14-12 7 6-7 6m-4-16-6 20"/></svg>'),
        mycommands: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="9" width="52" height="46" rx="6" fill="#263238"/><path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="m17 23 9 9-9 9m15 1h15"/></svg>')
    };
    var classicMenuIcons = {
        approvalcenter: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="13" y="9" width="34" height="46" rx="3" fill="none" stroke="#666" stroke-width="4"/><path d="M21 24h18M21 33h12" fill="none" stroke="#666" stroke-width="4"/><path d="m35 45 5 5 10-12" fill="none" stroke="#666" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
        myscripts: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M13 5h30l9 9v45H13Z M43 5v13h9" fill="none" stroke="#666" stroke-width="4" stroke-linejoin="round"/><path d="m25 29-7 6 7 6m14-12 7 6-7 6m-4-16-6 20" fill="none" stroke="#666" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
        mycommands: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="9" width="52" height="46" rx="6" fill="none" stroke="#666" stroke-width="4"/><path d="m17 23 9 9-9 9m15 10h15" fill="none" stroke="#666" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>')
    };

    core.assetUrl = function (moduleName, assetName, parameters) {
        var endpoint = new URL("pluginadmin.ashx", window.location.href);
        endpoint.searchParams.set("pin", "SIRKPortal");
        if (moduleName) endpoint.searchParams.set("module", moduleName);
        if (assetName) endpoint.searchParams.set("asset", assetName);
        endpoint.searchParams.set("v", core.assetVersion);
        Object.keys(parameters || {}).forEach(function (key) {
            if (parameters[key] != null) endpoint.searchParams.set(key, parameters[key]);
        });
        return endpoint.href;
    };

    core.api = function (moduleName, assetName, options, parameters) {
        var request = {};
        Object.keys(options || {}).forEach(function (key) { request[key] = options[key]; });
        request.credentials = "same-origin";
        request.cache = "no-store";

        var sourceSignal = request.signal || null;
        var boundedRead = String(request.method || "GET").toUpperCase() === "GET";
        var controller = (sourceSignal || boundedRead) && typeof AbortController === "function"
            ? new AbortController()
            : null;
        var timeoutMs = core.requestTimeoutMs;
        var timedOut = false;
        var externallyAborted = false;
        var timer = null;

        function abortFromSource() {
            externallyAborted = true;
            if (controller && !controller.signal.aborted) controller.abort();
        }
        function cleanup() {
            if (timer != null) window.clearTimeout(timer);
            if (sourceSignal && typeof sourceSignal.removeEventListener === "function") {
                sourceSignal.removeEventListener("abort", abortFromSource);
            }
        }
        function requestError(name, message) {
            var error = new Error(message);
            error.name = name;
            return error;
        }

        if (controller) {
            if (sourceSignal) {
                if (sourceSignal.aborted) abortFromSource();
                else if (typeof sourceSignal.addEventListener === "function") {
                    sourceSignal.addEventListener("abort", abortFromSource, { once: true });
                }
            }
            request.signal = controller.signal;
            if (boundedRead) {
                timer = window.setTimeout(function () {
                    timedOut = true;
                    if (!controller.signal.aborted) controller.abort();
                }, timeoutMs);
            }
        }

        return window.fetch(core.assetUrl(moduleName, assetName, parameters), request).then(function (response) {
            return response.text().then(function (text) {
                var result = {};
                try { result = text ? JSON.parse(text) : {}; }
                catch (error) { throw new Error("HTTP " + response.status + ": invalid JSON response."); }
                if (!response.ok || result.ok === false) throw new Error(result.error || "HTTP " + response.status);
                return result;
            });
        }).then(function (result) {
            cleanup();
            if (timedOut) {
                throw requestError("SirkApiTimeoutError", "SIRK API timeout: " + String(moduleName || "runtime") + "/" + String(assetName || "request") + " did not respond within " + timeoutMs + " ms.");
            }
            return result;
        }, function (error) {
            cleanup();
            if (timedOut) {
                throw requestError("SirkApiTimeoutError", "SIRK API timeout: " + String(moduleName || "runtime") + "/" + String(assetName || "request") + " did not respond within " + timeoutMs + " ms.");
            }
            if (externallyAborted || (controller && controller.signal.aborted && error && error.name === "AbortError")) {
                throw requestError("AbortError", "SIRK API request cancelled because the view changed.");
            }
            throw error;
        });
    };

    core.post = function (moduleName, assetName, values) {
        var body = new URLSearchParams();
        body.set("payload", JSON.stringify(values && typeof values === "object" ? values : {}));
        return core.api(moduleName, assetName, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
            body: body.toString()
        });
    };

    core.loadScript = function (id, source) {
        return new Promise(function (resolve, reject) {
            var existing = document.getElementById(id);
            if (existing) { resolve(); return; }
            var script = document.createElement("script");
            script.id = id;
            script.src = source;
            script.async = false;
            script.onload = resolve;
            script.onerror = reject;
            (document.head || document.documentElement).appendChild(script);
        });
    };

    core.enterNativeDevicePage = function () {
        if (typeof window.go === "function") {
            window.go(1);
            return true;
        }
        return false;
    };

    core.setLogicalView = function (viewMode) {
        if (typeof window.xxcurrentView !== "undefined") window.xxcurrentView = Number(viewMode);
    };

    core.updateWorkspaceUrl = function (viewMode, enabled) {
        try {
            var url = new URL(window.location.href);
            if (enabled) url.searchParams.set("viewmode", String(viewMode));
            else if (Number(url.searchParams.get("viewmode")) === Number(viewMode)) url.searchParams.delete("viewmode");
            if (url.hash === "#") url.hash = "";
            window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
        } catch (error) {}
    };

    core.preparePluginMenuItem = function (item) {
        if (!item) return item;
        var handler = item.onclick || item.onmouseup;
        var modern = String(item.tagName || "").toLowerCase() === "a" || item.classList.contains("nav-link");
        item.onclick = item.onmouseup = item.onkeypress = null;
        item.removeAttribute("onclick");
        item.removeAttribute("onmouseup");
        item.removeAttribute("onkeypress");
        if (handler) {
            if (modern) item.onclick = handler;
            else item.onmouseup = handler;
            item.onkeypress = function (event) {
                if (event && event.key === "Enter") return handler(event);
            };
        }
        if (modern) item.setAttribute("href", "#");
        return item;
    };

    core.placeMenuItem = function (item, anchor, order) {
        if (!item || !anchor || !anchor.parentNode) return false;
        core.preparePluginMenuItem(item);
        var host = anchor.parentNode;
        item.setAttribute("data-meshcentral-plugin-menu", String(order));
        if (item.parentNode !== host) host.insertBefore(item, anchor.nextSibling);
        var items = Array.prototype.slice.call(host.children).filter(function (child) {
            return child.hasAttribute("data-meshcentral-plugin-menu");
        }).sort(function (left, right) {
            return Number(left.getAttribute("data-meshcentral-plugin-menu")) - Number(right.getAttribute("data-meshcentral-plugin-menu"));
        });
        var cursor = anchor;
        items.forEach(function (entry) {
            host.insertBefore(entry, cursor.nextSibling);
            cursor = entry;
        });
        return true;
    };

    core.ensureMenu = function (definition) {
        var mainAnchor = document.getElementById("MainMenuMyDevices");
        var leftAnchor = document.getElementById("LeftMenuMyDevices");
        var key = String(definition.mainId || "").replace(/^MainMenuSirkPlatform-/, "").toLowerCase();
        var useModernIcons = !(window.SirkIconMode && typeof window.SirkIconMode.useModern === "function") || window.SirkIconMode.useModern();
        var family = useModernIcons ? modernMenuIcons : classicMenuIcons;
        var iconSource = family[key] || definition.icon || modernMenuIcons[key] || "";
        var open = definition.open;

        if (mainAnchor && mainAnchor.parentNode) {
            var main = document.getElementById(definition.mainId) || mainAnchor.cloneNode(false);
            var modern = String(main.tagName || "").toLowerCase() === "a" || main.classList.contains("nav-link");
            main.id = definition.mainId;
            main.textContent = definition.title;
            main.title = definition.title;
            main.tabIndex = 0;
            main.classList.remove("fullselect", "semiselect", "active");
            main.onclick = main.onmouseup = main.onkeypress = null;
            if (modern) {
                main.href = "#";
                main.onclick = open;
            } else {
                main.onmouseup = open;
                main.onkeypress = function (event) {
                    if (event && event.key === "Enter") return open(event);
                };
            }
            main.setAttribute("data-sirk-platform-viewmode", String(definition.viewMode || ""));
            core.placeMenuItem(main, mainAnchor, definition.order);
        }

        if (leftAnchor && leftAnchor.parentNode) {
            var left = document.getElementById(definition.leftId) || leftAnchor.cloneNode(true);
            var leftModern = String(left.tagName || "").toLowerCase() === "a" || left.classList.contains("nav-link");
            left.id = definition.leftId;
            left.title = definition.title;
            left.setAttribute("aria-label", definition.title);
            left.tabIndex = 0;
            left.classList.remove("lbbuttonsel", "lbbuttonsel2", "active");
            left.onclick = left.onmouseup = left.onkeypress = null;
            if (leftModern) {
                left.href = "#";
                left.onclick = open;
            } else {
                left.onmouseup = open;
                left.onkeypress = function (event) {
                    if (event && event.key === "Enter") return open(event);
                };
            }
            left.setAttribute("data-sirk-platform-viewmode", String(definition.viewMode || ""));

            left.setAttribute("data-sirk-icon-family", useModernIcons ? "modern" : "classic");
            if (iconSource) {
                var legacyIcon = left.querySelector(".lbtg");
                var currentIcon = left.querySelector(".sirk-platform-menu-icon") || left.querySelector("svg, i, img");
                if (legacyIcon) {
                    legacyIcon.className = "lbtg";
                    legacyIcon.style.backgroundImage = 'url("' + iconSource + '")';
                    legacyIcon.style.backgroundPosition = "center";
                    legacyIcon.style.backgroundRepeat = "no-repeat";
                    legacyIcon.style.backgroundSize = "contain";
                    legacyIcon.setAttribute("data-sirk-icon-family", useModernIcons ? "modern" : "classic");
                }
                if (!legacyIcon || leftModern) {
                    var image = document.createElement("img");
                    image.className = "sirk-platform-menu-icon";
                    image.alt = "";
                    image.src = iconSource;
                    image.setAttribute("data-sirk-icon-family", useModernIcons ? "modern" : "classic");
                    image.style.width = "24px";
                    image.style.height = "24px";
                    image.style.objectFit = "contain";
                    if (currentIcon && currentIcon.parentNode && currentIcon !== legacyIcon) currentIcon.parentNode.replaceChild(image, currentIcon);
                    else left.insertBefore(image, left.firstChild);
                }
            }
            core.placeMenuItem(left, leftAnchor, definition.order);
        }
    };

    core.setPluginMenuActive = function (main, left, active) {
        if (main) {
            main.classList.remove("fullselect", "semiselect", "active");
            main.removeAttribute("aria-current");
            if (active) {
                main.classList.add((String(main.tagName || "").toLowerCase() === "a" || main.classList.contains("nav-link")) ? "active" : "fullselect");
                main.setAttribute("aria-current", "page");
            }
        }
        if (left) {
            left.classList.remove("lbbuttonsel", "lbbuttonsel2", "active");
            left.removeAttribute("aria-current");
            if (active) {
                left.classList.add((String(left.tagName || "").toLowerCase() === "a" || left.classList.contains("nav-link")) ? "active" : "lbbuttonsel2");
                left.setAttribute("aria-current", "page");
            }
        }
    };

    core.clearNativeMenuSelection = function () {
        var selector = [
            "#MainMenuSpan .fullselect",
            "#MainMenuSpan .semiselect",
            "#MainMenuSpan .active",
            "#page_leftbar .lbbuttonsel",
            "#page_leftbar .lbbuttonsel2",
            "#page_leftbar .active"
        ].join(",");
        Array.prototype.forEach.call(document.querySelectorAll(selector), function (element) {
            element.classList.remove("fullselect", "semiselect", "lbbuttonsel", "lbbuttonsel2", "active");
            element.removeAttribute("aria-current");
        });
    };

    core.activateMenu = function (viewMode) {
        var value = Number(viewMode || 0);
        var main = value ? document.querySelector('[id^="MainMenuSirkPlatform-"][data-sirk-platform-viewmode="' + value + '"]') : null;
        var left = value ? document.querySelector('[id^="LeftMenuSirkPlatform-"][data-sirk-platform-viewmode="' + value + '"]') : null;
        if (value && !main && !left) return false;
        core.clearNativeMenuSelection();
        core.setPluginMenuActive(main, left, value > 0);
        return true;
    };

    core.restoreWorkspace = function () {
        var state = core.workspaceState;
        document.documentElement.classList.remove("sirk-platform-workspace-active");
        if (state) {
            if (state.titleHost) {
                while (state.titleHost.firstChild) state.titleHost.removeChild(state.titleHost.firstChild);
                (state.titleChildren || []).forEach(function (child) {
                    state.titleHost.appendChild(child);
                });
            }
            (state.hidden || []).forEach(function (item) {
                item.element.style.cssText = item.cssText;
                item.element.hidden = item.hidden;
            });
            var workspace = document.getElementById("SirkPlatformWorkspace");
            if (workspace) {
                workspace.innerHTML = "";
                workspace.style.display = "none";
            }
            core.workspaceState = null;
        }
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

            var titleChildren = [];
            while (titleHost.firstChild) titleChildren.push(titleHost.removeChild(titleHost.firstChild));
            var heading = document.createElement("h1");
            heading.textContent = title;
            titleHost.appendChild(heading);

            core.workspaceState = {
                titleHost: titleHost,
                titleChildren: titleChildren,
                heading: heading,
                hidden: hidden,
                viewMode: Number(viewMode)
            };
        } else if (core.workspaceState.heading) {
            core.workspaceState.heading.textContent = title;
        }

        core.workspaceState.viewMode = Number(viewMode);
        document.documentElement.classList.add("sirk-platform-workspace-active");
        while (workspace.firstChild) workspace.removeChild(workspace.firstChild);
        workspace.style.display = "block";
        render(workspace);
        return true;
    };

    core.element = function (tag, className, text) {
        var value = document.createElement(tag);
        if (className) value.className = className;
        if (text != null) value.textContent = text;
        return value;
    };

    core.card = function (title, description) {
        var card = core.element("div", "mc-shared-card");
        card.appendChild(core.element("strong", "", title));
        if (description) card.appendChild(core.element("div", "mc-shared-muted", description));
        return card;
    };

    core.flattenScripts = function (node, target) {
        target = target || [];
        if (!node) return target;
        if (node.type === "script") target.push(node);
        (node.children || []).forEach(function (child) { core.flattenScripts(child, target); });
        return target;
    };
}());

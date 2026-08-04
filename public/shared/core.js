(function () {
    "use strict";
    window.SirkPlatformCore = window.SirkPlatformCore || {};
    var core = window.SirkPlatformCore;
    core.assetVersion = String(window.__SIRK_PLATFORM_VERSION__ || "0");

    function svgData(svg) {
        return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    }

    var menuIcons = {
        approvalcenter: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="12" y="9" width="34" height="46" rx="4" fill="#7b1fa2"/><rect x="20" y="4" width="20" height="10" rx="4" fill="#4a148c"/><path fill="#fff" d="M20 23h18v4H20zm0 9h12v4H20z"/><circle cx="45" cy="43" r="13" fill="#2e7d32" stroke="#fff" stroke-width="3"/><path fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="4" d="m39 43 4 4 8-9"/></svg>'),
        myscripts: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path fill="#7b1fa2" d="M12 5h31l9 9v45H12z"/><path fill="#fff" opacity=".9" d="M39 5v13h13z"/><path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="m25 29-7 6 7 6m14-12 7 6-7 6m-4-16-6 20"/></svg>'),
        mycommands: svgData('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="6" y="9" width="52" height="46" rx="6" fill="#263238"/><path fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" d="m17 23 9 9-9 9m15 1h15"/></svg>')
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
        var request = options || {};
        request.credentials = "same-origin";
        request.cache = "no-store";
        return window.fetch(core.assetUrl(moduleName, assetName, parameters), request).then(function (response) {
            return response.text().then(function (text) {
                var result = {};
                try { result = text ? JSON.parse(text) : {}; }
                catch (error) { throw new Error("HTTP " + response.status + ": invalid JSON response."); }
                if (!response.ok || result.ok === false) throw new Error(result.error || "HTTP " + response.status);
                return result;
            });
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
    core.placeMenuItem = function (item, anchor, order) {
        if (!item || !anchor || !anchor.parentNode) return false;
        var host = anchor.parentNode;
        item.setAttribute("data-sirk-platform-order", String(order || 100));
        if (item.parentNode !== host) host.insertBefore(item, anchor.nextSibling);
        return true;
    };
    core.ensureMenu = function (definition) {
        var mainAnchor = document.getElementById("MainMenuMyDevices");
        var leftAnchor = document.getElementById("LeftMenuMyDevices");
        var key = String(definition.mainId || "").replace(/^MainMenuSirkPlatform-/, "").toLowerCase();
        var iconSource = definition.icon || menuIcons[key] || "";
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
                main.onkeypress = function (event) { if (event && event.key === "Enter") return open(event); };
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
                left.onkeypress = function (event) { if (event && event.key === "Enter") return open(event); };
            }
            left.setAttribute("data-sirk-platform-viewmode", String(definition.viewMode || ""));

            if (iconSource) {
                var legacyIcon = left.querySelector(".lbtg");
                if (legacyIcon) {
                    legacyIcon.className = "lbtg";
                    legacyIcon.style.backgroundImage = 'url("' + iconSource + '")';
                    legacyIcon.style.backgroundPosition = "center";
                    legacyIcon.style.backgroundRepeat = "no-repeat";
                    legacyIcon.style.backgroundSize = "contain";
                } else if (leftModern) {
                    var nativeIcon = left.querySelector("svg, i, img");
                    var image = document.createElement("img");
                    image.className = "sirk-platform-menu-icon";
                    image.alt = "";
                    image.src = iconSource;
                    image.style.width = "24px";
                    image.style.height = "24px";
                    image.style.objectFit = "contain";
                    if (nativeIcon && nativeIcon.parentNode) nativeIcon.parentNode.replaceChild(image, nativeIcon);
                    else left.insertBefore(image, left.firstChild);
                }
            }
            core.placeMenuItem(left, leftAnchor, definition.order);
        }
    };

    function modernMenuItem(item) {
        return !!item && (String(item.tagName || "").toLowerCase() === "a" || item.classList.contains("nav-link"));
    }

    function menuPeers(item) {
        if (!item || !item.parentNode) return [];
        return Array.prototype.filter.call(item.parentNode.children, function (candidate) {
            return /^(MainMenu|LeftMenu)/.test(String(candidate.id || ""));
        });
    }

    function clearMenuSelection(item) {
        if (!item || !item.classList) return;
        item.classList.remove("fullselect", "semiselect", "active", "lbbuttonsel", "lbbuttonsel2");
        item.removeAttribute("aria-current");
    }

    function selectMenuItem(item, isLeft) {
        if (!item || !item.classList) return;
        clearMenuSelection(item);
        item.classList.add(modernMenuItem(item) ? "active" : (isLeft ? "lbbuttonsel2" : "fullselect"));
        item.setAttribute("aria-current", "page");
    }

    core.activateMenu = function (viewMode) {
        var value = String(viewMode == null ? "" : viewMode);
        var main = document.querySelector('[id^="MainMenuSirkPlatform-"][data-sirk-platform-viewmode="' + value + '"]');
        var left = document.querySelector('[id^="LeftMenuSirkPlatform-"][data-sirk-platform-viewmode="' + value + '"]');
        var targets = [main, left].filter(Boolean);
        if (!targets.length || !core.workspaceState) return false;

        var peers = [];
        targets.forEach(function (target) {
            menuPeers(target).forEach(function (peer) {
                if (peers.indexOf(peer) < 0) peers.push(peer);
            });
        });

        if (!core.workspaceState.menuSelection) {
            core.workspaceState.menuSelection = peers.map(function (item) {
                return {
                    element: item,
                    className: item.className,
                    ariaCurrent: item.getAttribute("aria-current")
                };
            });
        }

        peers.forEach(clearMenuSelection);
        selectMenuItem(main, false);
        selectMenuItem(left, true);
        return true;
    };

    core.restoreWorkspace = function () {
        var state = core.workspaceState;
        document.documentElement.classList.remove("sirk-platform-workspace-active");
        if (state) {
            if (state.heading) state.heading.textContent = state.headingText;
            (state.hidden || []).forEach(function (item) {
                item.element.style.cssText = item.cssText;
                item.element.hidden = item.hidden;
            });
            (state.menuSelection || []).forEach(function (item) {
                if (!item.element || !item.element.isConnected) return;
                item.element.className = item.className;
                if (item.ariaCurrent == null) item.element.removeAttribute("aria-current");
                else item.element.setAttribute("aria-current", item.ariaCurrent);
            });
            var workspace = document.getElementById("SirkPlatformWorkspace");
            if (workspace) {
                workspace.innerHTML = "";
                workspace.style.display = "none";
            }
            core.workspaceState = null;
        }
        try {
            var url = new URL(window.location.href);
            var customViewModes = [101, 102, 105, 106];
            if (customViewModes.indexOf(Number(url.searchParams.get("viewmode"))) >= 0) {
                url.searchParams.delete("viewmode");
                if (url.hash === "#") url.hash = "";
                window.history.replaceState(null, "", url.pathname + url.search + url.hash);
            }
        } catch (error) {}
    };

    core.isSirkPlatformTarget = function (target) {
        if (!target || !target.closest) return false;
        return !!target.closest("#SirkPlatformWorkspace,[id^='MainMenuSirkPlatform-'],[id^='LeftMenuSirkPlatform-']");
    };

    core.installNativeRestoreGuard = function () {
        if (core.nativeRestoreGuardInstalled) return;
        core.nativeRestoreGuardInstalled = true;
        document.addEventListener("pointerdown", function (event) {
            if (!core.workspaceState || core.isSirkPlatformTarget(event.target)) return;
            core.restoreWorkspace();
        }, true);
        document.addEventListener("keydown", function (event) {
            if ((event.key !== "Enter" && event.key !== " ") || !core.workspaceState || core.isSirkPlatformTarget(event.target)) return;
            core.restoreWorkspace();
        }, true);
    };

    core.showWorkspace = function (title, viewMode, render) {
        core.installNativeRestoreGuard();
        if (!core.workspaceState && typeof window.go === "function" && Number(window.xxcurrentView) !== 1) {
            try { window.go(1); } catch (error) {}
        }
        var page = document.getElementById("p1");
        var titleHost = document.getElementById("p1title");
        if (!page || !titleHost) return false;
        var workspace = document.getElementById("SirkPlatformWorkspace");
        if (!workspace) {
            workspace = document.createElement("div");
            workspace.id = "SirkPlatformWorkspace";
            page.appendChild(workspace);
        }
        var heading = titleHost.querySelector("h1,h2,h3,.title,b,strong") || titleHost;
        if (!core.workspaceState) {
            var hidden = [];
            for (var child = page.firstElementChild; child; child = child.nextElementSibling) {
                if (child === titleHost || child === workspace) continue;
                hidden.push({ element: child, cssText: child.style.cssText, hidden: child.hidden });
                child.hidden = true;
                child.style.setProperty("display", "none", "important");
            }
            core.workspaceState = { heading: heading, headingText: heading.textContent, hidden: hidden, viewMode: viewMode };
        }
        // SIRK workspaces reuse MeshCentral page p1. Mark the logical view as
        // custom so a later native go(1) is not discarded as a same-page no-op.
        if (typeof window.xxcurrentView !== "undefined") window.xxcurrentView = Number(viewMode);
        core.workspaceState.viewMode = Number(viewMode);
        document.documentElement.classList.add("sirk-platform-workspace-active");
        core.activateMenu(viewMode);
        heading.textContent = title;
        while (workspace.firstChild) workspace.removeChild(workspace.firstChild);
        workspace.style.display = "block";
        render(workspace);
        return false;
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

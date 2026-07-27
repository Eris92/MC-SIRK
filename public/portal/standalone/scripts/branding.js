(function () {
    "use strict";

    var base = String(window.__SIRK_PLATFORM_ASSET_BASE__ || window.__SIRK_PLATFORM_LOGIN_ASSET_BASE__ || "").replace(/\/$/, "");
    if (!base) return;

    var current = {};
    var maintenance = null;
    var DEVICE_TAB_STORAGE = "sirkPortal.deviceActiveTabs";
    var LANGUAGE_STORAGE = "sirkPortal.language";
    var THEME_STORAGE = "sirkPortal.theme";
    var restoreTimer = 0;
    var animationTimers = [];
    var animationSignature = "";

    function workspaceChild() {
        try { return new URL(window.location.href).searchParams.get("sirkWorkspaceChild") === "1"; }
        catch (error) { return false; }
    }

    function loginPage() {
        return !!document.getElementById("sirkLoginFrame") || /\/login\/?$/i.test(String(window.location.pathname || ""));
    }

    function language() {
        try { return localStorage.getItem(LANGUAGE_STORAGE) === "en" ? "en" : "pl"; }
        catch (error) { return "pl"; }
    }

    function darkTheme() {
        try { return localStorage.getItem(THEME_STORAGE) === "dark"; }
        catch (error) { return false; }
    }

    function workspaceNodeId() {
        try {
            var direct = new URL(window.location.href).searchParams.get("gotonode");
            if (direct) return String(direct);
        } catch (error) {}
        var link = document.querySelector('.sirk-device-general-actions a[href*="gotonode="],.sirk-device-native-button[href*="gotonode="]');
        if (link) {
            try { return String(new URL(link.href, window.location.href).searchParams.get("gotonode") || ""); }
            catch (error) {}
        }
        return "__last__";
    }

    function readDeviceTabs() {
        try {
            var value = JSON.parse(localStorage.getItem(DEVICE_TAB_STORAGE) || "{}");
            return value && typeof value === "object" ? value : {};
        } catch (error) { return {}; }
    }

    function saveDeviceTab(tab) {
        var state = readDeviceTabs();
        tab = String(tab || "general");
        state[workspaceNodeId()] = tab;
        state.__last__ = tab;
        try { localStorage.setItem(DEVICE_TAB_STORAGE, JSON.stringify(state)); }
        catch (error) {}
    }

    function revealPortal() {
        var root = document.getElementById("sirkStandaloneRoot");
        var content = document.getElementById("sirkStandaloneContent");
        document.documentElement.classList.remove("sirk-portal-boot-pending", "sirk-device-restore-pending");
        [root, content].forEach(function (node) {
            if (!node) return;
            node.style.visibility = "";
            node.style.pointerEvents = "";
            node.removeAttribute("aria-busy");
        });
        if (content) content.removeAttribute("data-device-tab-restore-pending");
    }

    function restoreDeviceTab() {
        if (!workspaceChild()) return false;
        var content = document.getElementById("sirkStandaloneContent");
        var workspace = content && content.querySelector(".sirk-device-workspace");
        if (!workspace) return false;
        var state = readDeviceTabs();
        var desired = String(state[workspaceNodeId()] || state.__last__ || "general");
        var button = workspace.querySelector('[data-device-tab="' + desired.replace(/"/g, '\\"') + '"]') ||
            workspace.querySelector('[data-device-tab="general"]');
        if (button && !button.classList.contains("is-active")) button.click();
        revealPortal();
        return true;
    }

    function applyWorkspaceTheme() {
        if (!workspaceChild()) return;
        var dark = darkTheme();
        var portalRoot = document.getElementById("sirkPortalRoot");
        [document.documentElement, document.body, portalRoot].forEach(function (node) {
            if (!node) return;
            node.classList.toggle("sirk-theme-dark", dark);
            node.classList.toggle("sirk-theme-light", !dark);
        });
        document.documentElement.style.colorScheme = dark ? "dark" : "light";
    }

    var TEXT = {
        pl: { general: "Ogólne", desktop: "Pulpit", terminal: "Terminal", commands: "Polecenia", files: "Pliki", registry: "Rejestr", software: "Oprogramowanie", amt: "Intel AMT", online: "Online", offline: "Offline", name: "Nazwa", status: "Status", group: "Grupa", system: "System", ip: "Adres IP", lastSeen: "Ostatnio widziany", agent: "Wersja agenta", nodeId: "Node ID" },
        en: { general: "Overview", desktop: "Desktop", terminal: "Terminal", commands: "Commands", files: "Files", registry: "Registry", software: "Software", amt: "Intel AMT", online: "Online", offline: "Offline", name: "Name", status: "Status", group: "Group", system: "Operating system", ip: "IP address", lastSeen: "Last seen", agent: "Agent version", nodeId: "Node ID" }
    };

    function translateWorkspace() {
        if (!workspaceChild()) return;
        var text = TEXT[language()];
        document.documentElement.lang = language();
        Array.prototype.forEach.call(document.querySelectorAll("[data-device-tab]"), function (button) {
            var key = button.getAttribute("data-device-tab");
            if (text[key]) button.textContent = text[key];
        });
        var connection = document.querySelector(".sirk-device-connection");
        if (connection) {
            var dot = connection.querySelector("i");
            connection.textContent = connection.classList.contains("is-online") ? text.online : text.offline;
            if (dot) connection.insertBefore(dot, connection.firstChild);
        }
        var labels = [text.name, text.status, text.group, text.system, text.ip, text.lastSeen, text.agent, text.nodeId];
        Array.prototype.forEach.call(document.querySelectorAll(".sirk-device-detail-item > span"), function (label, index) {
            if (labels[index]) label.textContent = labels[index];
        });
    }

    function propagateLanguage(event) {
        if (workspaceChild()) return;
        var detail = event && event.detail || { language: language() };
        Array.prototype.forEach.call(document.querySelectorAll('iframe[src*="sirkWorkspaceChild=1"]'), function (frame) {
            try { frame.contentWindow.dispatchEvent(new CustomEvent("sirkportal:languagechange", { detail: detail })); }
            catch (error) {}
        });
    }

    function applyDocument(doc, config) {
        if (!doc) return;
        var name = String(config.siteName || "SirK Portal").trim() || "SirK Portal";
        var icon = String(config.siteIconUrl || "").trim();
        var brand = doc.querySelector(".sirk-standalone-brand strong,.sirk-login-product");
        if (brand) brand.textContent = name;
        var mark = doc.querySelector(".sirk-brand-mark,.sirk-login-mark");
        if (mark) {
            if (icon) {
                var image = mark.querySelector("img[data-sirk-branding]");
                if (!image) {
                    mark.textContent = "";
                    image = doc.createElement("img");
                    image.setAttribute("data-sirk-branding", "1");
                    image.alt = "";
                    image.style.cssText = "width:100%;height:100%;object-fit:contain";
                    mark.appendChild(image);
                }
                image.src = icon;
            } else {
                mark.textContent = (name.charAt(0) || "S").toUpperCase();
            }
        }
        var reset = doc.querySelector(".sirk-password-reset");
        if (reset) {
            var visible = config.showPasswordReset !== false;
            reset.hidden = !visible;
            reset.style.display = visible ? "" : "none";
            reset.href = String(config.passwordResetUrl || "https://passwordreset.microsoftonline.com/");
        }
    }

    function remove(id) {
        var node = document.getElementById(id);
        if (node) node.remove();
    }

    function notice(id, title, text, background, color) {
        remove(id);
        var bar = document.createElement("section");
        bar.id = id;
        bar.setAttribute("role", "status");
        bar.style.cssText = "position:relative;z-index:2147482000;display:flex;align-items:center;gap:12px;width:100%;padding:11px 18px;box-sizing:border-box;background:" + background + ";color:" + color + ";font:600 15px/1.4 Segoe UI,Arial,sans-serif";
        var copyNode = document.createElement("div");
        copyNode.style.cssText = "display:flex;gap:10px;align-items:baseline;flex-wrap:wrap";
        if (title) {
            var strong = document.createElement("strong");
            strong.textContent = title;
            copyNode.appendChild(strong);
        }
        var span = document.createElement("span");
        span.textContent = text;
        copyNode.appendChild(span);
        bar.appendChild(copyNode);
        document.body.insertBefore(bar, document.body.firstChild);
        return bar;
    }

    function bannerActive(banner) {
        if (!banner || banner.enabled !== true) return false;
        var template = banner.templates && banner.templates[banner.activeTemplate];
        if (!template) return false;
        if (template.noEnd === true) return true;
        var started = Date.parse(banner.startedAt || "");
        if (!started) return true;
        return Date.now() < started + (Math.max(1, Number(template.durationMinutes) || 60) * 60000);
    }

    function renderNotices() {
        remove("sirkPortalBanner");
        remove("sirkMaintenanceNotice");
        var banner = current.banner;
        var show = loginPage() ? banner && banner.showOnLogin === true : banner && banner.showOnPortal !== false;
        if (show && bannerActive(banner)) {
            var template = banner.templates[banner.activeTemplate];
            var bar = notice("sirkPortalBanner", template.name, template.text, template.backgroundColor, template.textColor);
            bar.style.fontSize = Math.max(10, Math.min(48, Number(template.fontSize) || 16)) + "px";
        }
        if (maintenance && maintenance.active && maintenance.allowed && maintenance.showNoticeToAllowed) {
            notice("sirkMaintenanceNotice", maintenance.title, maintenance.text, maintenance.backgroundColor || "#0f172a", maintenance.textColor || "#fff");
        }
    }

    function showRelease() {
        remove("sirkReleaseOverlay");
        var release = current.release;
        if (loginPage() || workspaceChild() || !release || release.enabled !== true || release.showAfterUpdate === false || !release.version || !(release.commits || []).length) return;
        var key = "sirkPortal.releaseSeen." + release.version;
        try { if (localStorage.getItem(key) === "1") return; }
        catch (error) {}
        var overlay = document.createElement("div");
        overlay.id = "sirkReleaseOverlay";
        overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.62)";
        var dialog = document.createElement("section");
        dialog.style.cssText = "width:min(720px,100%);max-height:min(760px,90vh);overflow:auto;padding:26px;border:1px solid var(--sirk-border,#dce3ec);border-radius:14px;background:var(--sirk-panel,#fff);color:var(--sirk-text,#172033);box-shadow:0 24px 80px rgba(0,0,0,.35)";
        var title = document.createElement("h2");
        title.textContent = String(release.title || "Co nowego") + " — " + release.version;
        title.style.marginTop = "0";
        dialog.appendChild(title);
        var list = document.createElement("ul");
        list.style.cssText = "display:grid;gap:10px;padding-left:22px";
        (release.commits || []).slice(0, Math.max(1, Number(release.maxCommits) || 12)).forEach(function (commit) {
            var item = document.createElement("li");
            if (commit.url) {
                var link = document.createElement("a");
                link.href = commit.url;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.textContent = (commit.sha ? commit.sha + " — " : "") + commit.message;
                item.appendChild(link);
            } else {
                item.textContent = (commit.sha ? commit.sha + " — " : "") + commit.message;
            }
            list.appendChild(item);
        });
        dialog.appendChild(list);
        var button = document.createElement("button");
        button.type = "button";
        button.className = "sirk-button";
        button.textContent = "Rozumiem";
        button.onclick = function () {
            try { localStorage.setItem(key, "1"); }
            catch (error) {}
            overlay.remove();
        };
        dialog.appendChild(button);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    function ensureAnimationStyle() {
        if (document.getElementById("sirkPortalAnimationStyle")) return;
        var style = document.createElement("style");
        style.id = "sirkPortalAnimationStyle";
        style.textContent = [
            ".sirk-animation-root{position:fixed;inset:0;overflow:hidden;pointer-events:none;contain:strict}",
            ".sirk-animation-effect{position:absolute;inset:0;overflow:hidden;pointer-events:none}",
            ".sirk-animation-particle{position:absolute;top:-15vh;left:var(--left);font-size:var(--size);line-height:1;opacity:var(--opacity);animation:sirkAnimationFall var(--duration) linear var(--delay) infinite;will-change:transform}",
            ".sirk-animation-confetti{position:absolute;top:-12vh;left:var(--left);width:var(--size);height:calc(var(--size) * .48);border-radius:2px;opacity:var(--opacity);animation:sirkAnimationFall var(--duration) linear var(--delay) infinite;will-change:transform}",
            ".sirk-animation-float{position:absolute;bottom:-12vh;left:var(--left);font-size:var(--size);line-height:1;opacity:var(--opacity);animation:sirkAnimationFloat var(--duration) ease-in var(--delay) infinite;will-change:transform}",
            ".sirk-animation-walker{position:absolute;left:-20vw;bottom:2.5vh;font-size:var(--size);line-height:1;opacity:var(--opacity);animation:sirkAnimationWalk var(--duration) linear var(--delay) infinite;will-change:transform}",
            "@keyframes sirkAnimationFall{0%{transform:translate3d(0,-12vh,0) rotate(0deg)}100%{transform:translate3d(var(--drift),125vh,0) rotate(var(--spin))}}",
            "@keyframes sirkAnimationFloat{0%{transform:translate3d(0,10vh,0) scale(.8)}100%{transform:translate3d(var(--drift),-125vh,0) scale(1.15)}}",
            "@keyframes sirkAnimationWalk{0%{transform:translate3d(-10vw,0,0)}100%{transform:translate3d(130vw,0,0)}}",
            "@media (prefers-reduced-motion:reduce){.sirk-animation-root[data-respect-reduced-motion=\"1\"]{display:none!important}}"
        ].join("");
        document.head.appendChild(style);
    }

    function clearAnimationTimers() {
        animationTimers.forEach(function (timer) { window.clearTimeout(timer); });
        animationTimers = [];
    }

    function clearAnimations(resetSignature) {
        clearAnimationTimers();
        remove("sirkPortalAnimationsBackground");
        remove("sirkPortalAnimationsForeground");
        if (resetSignature !== false) animationSignature = "";
    }

    function activeEffect(effect) {
        if (!effect || effect.enabled !== true) return false;
        var now = Date.now();
        var start = Date.parse(effect.startAt || "");
        var end = Date.parse(effect.endAt || "");
        if (start && now < start) return false;
        if (end && now > end) return false;
        return true;
    }

    function randomItem(values, fallback) {
        values = Array.isArray(values) && values.length ? values : [fallback];
        return values[Math.floor(Math.random() * values.length)];
    }

    function symbols(effect, fallback) {
        var values = String(effect.symbol || fallback || "✨").split(/[\s,;]+/).filter(Boolean);
        return values.length ? values : [fallback || "✨"];
    }

    function number(value, minimum, maximum, fallback) {
        value = Number(value);
        if (!Number.isFinite(value)) value = fallback;
        return Math.max(minimum, Math.min(maximum, value));
    }

    function effectContainer(root, effect) {
        var host = document.createElement("div");
        host.className = "sirk-animation-effect";
        host.setAttribute("data-animation-id", String(effect.id || ""));
        root.appendChild(host);
        var duration = Math.round(number(effect.durationSeconds, 0, 86400, 0));
        if (duration > 0) {
            animationTimers.push(window.setTimeout(function () { host.remove(); }, duration * 1000));
        }
        return host;
    }

    function addFalling(host, effect, type) {
        var count = Math.round(number(effect.intensity, 1, 200, 24));
        var speed = number(effect.speed, 0.1, 5, 1);
        var size = number(effect.size, 8, 120, 20);
        var opacity = number(effect.opacity, 0.1, 1, 0.9);
        var palette = Array.isArray(effect.colors) ? effect.colors : ["#ffffff"];
        var fallback = type === "snow" ? "❄" : type === "christmas" ? "❄" : "✨";
        var availableSymbols = symbols(effect, fallback);
        for (var index = 0; index < count; index += 1) {
            var item = document.createElement("span");
            var duration = (7 + Math.random() * 10) / speed;
            var delay = -(Math.random() * duration);
            item.className = type === "confetti" ? "sirk-animation-confetti" : "sirk-animation-particle";
            if (type !== "confetti") item.textContent = randomItem(availableSymbols, fallback);
            item.style.setProperty("--left", (Math.random() * 100).toFixed(2) + "%");
            item.style.setProperty("--size", Math.max(4, size * (0.65 + Math.random() * 0.7)).toFixed(1) + "px");
            item.style.setProperty("--opacity", String(Math.max(0.1, opacity * (0.65 + Math.random() * 0.35))));
            item.style.setProperty("--duration", duration.toFixed(2) + "s");
            item.style.setProperty("--delay", delay.toFixed(2) + "s");
            item.style.setProperty("--drift", ((Math.random() - 0.5) * 30).toFixed(1) + "vw");
            item.style.setProperty("--spin", ((Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 720)).toFixed(0) + "deg");
            item.style.color = randomItem(palette, "#ffffff");
            if (type === "confetti") item.style.background = randomItem(palette, "#60a5fa");
            host.appendChild(item);
        }
    }

    function addFloating(host, effect) {
        var count = Math.round(number(effect.intensity, 1, 200, 18));
        var speed = number(effect.speed, 0.1, 5, 1);
        var size = number(effect.size, 8, 120, 20);
        var opacity = number(effect.opacity, 0.1, 1, 0.9);
        var palette = Array.isArray(effect.colors) ? effect.colors : ["#60a5fa"];
        var availableSymbols = symbols(effect, "✨");
        for (var index = 0; index < count; index += 1) {
            var item = document.createElement("span");
            var duration = (8 + Math.random() * 10) / speed;
            item.className = "sirk-animation-float";
            item.textContent = randomItem(availableSymbols, "✨");
            item.style.setProperty("--left", (Math.random() * 100).toFixed(2) + "%");
            item.style.setProperty("--size", Math.max(4, size * (0.7 + Math.random() * 0.6)).toFixed(1) + "px");
            item.style.setProperty("--opacity", String(opacity));
            item.style.setProperty("--duration", duration.toFixed(2) + "s");
            item.style.setProperty("--delay", (-(Math.random() * duration)).toFixed(2) + "s");
            item.style.setProperty("--drift", ((Math.random() - 0.5) * 26).toFixed(1) + "vw");
            item.style.color = randomItem(palette, "#60a5fa");
            host.appendChild(item);
        }
    }

    function addWalker(host, effect) {
        var count = Math.round(number(effect.intensity, 1, 8, 1));
        var speed = number(effect.speed, 0.1, 5, 1);
        var size = number(effect.size, 8, 120, 44);
        var opacity = number(effect.opacity, 0.1, 1, 1);
        var availableSymbols = symbols(effect, "🚶");
        for (var index = 0; index < count; index += 1) {
            var item = document.createElement("span");
            item.className = "sirk-animation-walker";
            item.textContent = randomItem(availableSymbols, "🚶");
            item.style.setProperty("--size", size.toFixed(1) + "px");
            item.style.setProperty("--opacity", String(opacity));
            item.style.setProperty("--duration", (18 / speed).toFixed(2) + "s");
            item.style.setProperty("--delay", (index * 2.5).toFixed(2) + "s");
            item.style.bottom = (2.5 + index * Math.max(2, size / 18)).toFixed(1) + "vh";
            host.appendChild(item);
        }
    }

    function renderEffect(root, effect) {
        var host = effectContainer(root, effect);
        if (effect.type === "walker") addWalker(host, effect);
        else if (effect.type === "float") addFloating(host, effect);
        else addFalling(host, effect, effect.type);
    }

    function renderAnimations(config, force) {
        config = config && typeof config === "object" ? config : {};
        var signature;
        try { signature = JSON.stringify(config); }
        catch (error) { signature = String(Date.now()); }
        if (!force && signature === animationSignature && (document.getElementById("sirkPortalAnimationsBackground") || document.getElementById("sirkPortalAnimationsForeground"))) return;
        animationSignature = signature;
        clearAnimations(false);
        if (workspaceChild() || config.enabled !== true) return;
        if (loginPage() ? config.showOnLogin !== true : config.showOnPortal === false) return;
        if (config.respectReducedMotion !== false && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        var effects = (Array.isArray(config.effects) ? config.effects : []).filter(activeEffect);
        if (!effects.length) return;
        ensureAnimationStyle();

        var background = document.createElement("div");
        background.id = "sirkPortalAnimationsBackground";
        background.className = "sirk-animation-root";
        background.setAttribute("data-respect-reduced-motion", config.respectReducedMotion !== false ? "1" : "0");
        background.style.zIndex = "1";
        var foreground = document.createElement("div");
        foreground.id = "sirkPortalAnimationsForeground";
        foreground.className = "sirk-animation-root";
        foreground.setAttribute("data-respect-reduced-motion", config.respectReducedMotion !== false ? "1" : "0");
        foreground.style.zIndex = "2147481000";
        document.body.appendChild(background);
        document.body.appendChild(foreground);

        effects.forEach(function (effect) {
            renderEffect(effect.layer === "background" ? background : foreground, effect);
        });
        if (!background.children.length) background.remove();
        if (!foreground.children.length) foreground.remove();
    }

    function previewAnimations(config) {
        var preview = JSON.parse(JSON.stringify(config && typeof config === "object" ? config : {}));
        preview.enabled = true;
        preview.showOnPortal = true;
        preview.showOnLogin = true;
        renderAnimations(preview, true);
    }

    window.SirkPortalAnimations = {
        render: function (config) { renderAnimations(config, true); },
        preview: previewAnimations,
        clear: function () { clearAnimations(true); }
    };

    function maintenanceUrl() {
        var pathname = String(window.location.pathname || "/");
        var index = pathname.toLowerCase().indexOf("/sirkportal");
        return index >= 0 ? pathname.slice(0, index) + "/sirkportal/maintenance.json" : "/maintenance.json";
    }

    function loadMaintenance() {
        return fetch(maintenanceUrl() + "?v=" + Date.now(), {
            credentials: "same-origin",
            cache: "no-store",
            headers: { Accept: "application/json" }
        }).then(function (response) {
            return response.ok ? response.json() : null;
        }).then(function (value) {
            maintenance = value;
            renderNotices();
        }).catch(function () {});
    }

    function synchronize() {
        applyDocument(document, current);
        var frame = document.getElementById("sirkLoginFrame");
        if (frame) {
            try { applyDocument(frame.contentDocument, current); }
            catch (error) {}
        }
        applyWorkspaceTheme();
        translateWorkspace();
        restoreDeviceTab();
        renderNotices();
        renderAnimations(current.animations, false);
    }

    function apply(config) {
        current = config && typeof config === "object" ? config : {};
        var name = String(current.siteName || "SirK Portal").trim() || "SirK Portal";
        var icon = String(current.siteIconUrl || "").trim();
        window.__SIRK_PLATFORM_PORTAL_BRANDING__ = current;
        document.title = loginPage() ? name + " — logowanie" : name;
        synchronize();
        var favicon = document.querySelector('link[rel="icon"][data-sirk-branding]');
        if (icon) {
            if (!favicon) {
                favicon = document.createElement("link");
                favicon.rel = "icon";
                favicon.setAttribute("data-sirk-branding", "1");
                document.head.appendChild(favicon);
            }
            favicon.href = icon;
        } else if (favicon) {
            favicon.remove();
        }
        loadMaintenance().then(showRelease);
    }

    document.addEventListener("click", function (event) {
        var tab = event.target && event.target.closest && event.target.closest("[data-device-tab]");
        if (tab) saveDeviceTab(tab.getAttribute("data-device-tab"));
    }, true);
    window.addEventListener("sirkportal:languagechange", translateWorkspace, true);
    window.addEventListener("sirkportal:languagechange", propagateLanguage);
    window.addEventListener("storage", function (event) {
        if (event.key === LANGUAGE_STORAGE) translateWorkspace();
        if (event.key === THEME_STORAGE) applyWorkspaceTheme();
    });

    fetch(base + "/portal-branding.json?v=" + encodeURIComponent(String(window.__SIRK_PLATFORM_PORTAL_VERSION__ || Date.now())), {
        credentials: "same-origin",
        cache: "no-store"
    }).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
    }).then(apply).catch(function () { apply({}); });

    restoreTimer = window.setInterval(function () {
        synchronize();
        if (restoreDeviceTab()) {
            window.clearInterval(restoreTimer);
            restoreTimer = 0;
        }
    }, 500);
    window.setTimeout(function () {
        revealPortal();
        if (restoreTimer) {
            window.clearInterval(restoreTimer);
            restoreTimer = 0;
        }
    }, 5000);
}());

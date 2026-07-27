(function () {
    "use strict";

    var frame = document.getElementById("sirkLoginFrame");
    var loading = document.getElementById("sirkLoginLoading");
    var assetBase = String(window.__SIRK_PLATFORM_LOGIN_ASSET_BASE__ || "").replace(/\/$/, "");
    var version = encodeURIComponent(window.__SIRK_PLATFORM_PORTAL_VERSION__ || "1");
    var redirected = false;
    var revealed = false;
    var probePending = false;

    function reveal() {
        if (revealed) return;
        revealed = true;
        frame.classList.add("is-ready");
        loading.hidden = true;
    }

    function visible(element) {
        return !!(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
    }

    function workspace(documentValue) {
        var candidates = documentValue.querySelectorAll("#p10desktop,#p1,#column_l,#MainMenu,#page_content");
        for (var i = 0; i < candidates.length; i += 1) {
            if (visible(candidates[i])) return candidates[i];
        }
        return null;
    }

    function loginForm(documentValue) {
        var password = documentValue.querySelector('input[type="password"]');
        if (password && password.closest("form") && visible(password.closest("form"))) return password.closest("form");
        var forms = documentValue.querySelectorAll("form");
        for (var i = 0; i < forms.length; i += 1) {
            if (visible(forms[i]) && forms[i].querySelector('input[type="text"],input[type="email"],input[type="password"]')) return forms[i];
        }
        return null;
    }

    function inject(documentValue, tag, id, source) {
        if (documentValue.getElementById(id)) return;
        var node = documentValue.createElement(tag);
        node.id = id;
        if (tag === "link") {
            node.rel = "stylesheet";
            node.href = source;
        } else {
            node.src = source;
            node.async = false;
        }
        (documentValue.head || documentValue.documentElement).appendChild(node);
    }

    function finishLogin() {
        if (redirected) return;
        redirected = true;
        var returnToPortal = new URL(window.location.href).searchParams.get("return") === "portal";
        var target = window.__SIRK_PLATFORM_FORCE_PORTAL__ === true || returnToPortal
            ? window.__SIRK_PLATFORM_LOGIN_PORTAL_URL__
            : window.__SIRK_PLATFORM_LOGIN_NATIVE_URL__;
        if (returnToPortal) {
            try {
                var hash = window.sessionStorage.getItem("sirkPortal.returnHash") || "";
                window.sessionStorage.removeItem("sirkPortal.returnHash");
                if (/^#[a-z0-9_-]+$/i.test(hash)) target = String(target || "").replace(/#.*$/, "") + hash;
            } catch (error) {}
        }
        window.location.replace(String(target || "/"));
    }

    function sessionProbeUrl() {
        var endpoint = new URL("../../pluginadmin.ashx", window.location.href);
        endpoint.searchParams.set("pin", "SIRKPortal");
        endpoint.searchParams.set("asset", "bootstrap");
        endpoint.searchParams.set("v", version);
        return endpoint.href;
    }

    function probeSession() {
        if (redirected || probePending) return;
        probePending = true;
        window.fetch(sessionProbeUrl(), {
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Accept": "application/json" }
        }).then(function (response) {
            if (!response.ok) return null;
            return response.json().catch(function () { return null; });
        }).then(function (result) {
            if (result && result.ok === true && result.user && String(result.user.name || "").trim()) finishLogin();
        }).catch(function () {
            // The iframe remains the source of truth while the user is not authenticated.
        }).then(function () {
            probePending = false;
        });
    }

    function inspect() {
        probeSession();
        try {
            var documentValue = frame.contentDocument;
            if (!documentValue) return;
            if (workspace(documentValue) && !loginForm(documentValue)) {
                finishLogin();
                return;
            }
            if (loginForm(documentValue)) {
                inject(documentValue, "link", "sirkPlatformForcedLoginStyle", assetBase + "/sirk-native-login.css?v=" + version);
                inject(documentValue, "script", "sirkPlatformForcedLoginScript", assetBase + "/sirk-native-login.js?v=" + version);
                var shell = documentValue.getElementById("sirkLoginShell");
                var host = documentValue.getElementById("sirkNativeLoginHost");
                var styledForm = host && host.querySelector("form.sirk-native-login-form");
                if (documentValue.documentElement.classList.contains("sirk-login-active") && shell && styledForm) reveal();
                return;
            }
        } catch (error) {
            // Cross-origin identity providers remain visible in the native iframe.
            reveal();
        }
    }

    function renderLoginBanner(config) {
        var previous = document.getElementById("sirkLoginPublicBanner");
        if (previous) previous.remove();
        var banner = config && config.banner;
        if (!banner || banner.enabled !== true || banner.showOnLogin !== true) return;
        var template = banner.templates && banner.templates[banner.activeTemplate];
        if (!template || !String(template.text || "").trim()) return;
        var node = document.createElement("div");
        node.id = "sirkLoginPublicBanner";
        node.textContent = String(template.text);
        node.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:2147483600;padding:12px 18px;text-align:center;font-family:Segoe UI,Arial,sans-serif;box-shadow:0 1px 0 rgba(15,23,42,.14);box-sizing:border-box";
        node.style.background = String(template.backgroundColor || "#dcfce7");
        node.style.color = String(template.textColor || "#166534");
        node.style.fontSize = Math.max(10, Math.min(48, Number(template.fontSize) || 16)) + "px";
        document.body.appendChild(node);
        if (template.noEnd !== true && Number(template.durationMinutes) > 0) {
            window.setTimeout(function () { if (node.parentNode) node.remove(); }, Number(template.durationMinutes) * 60000);
        }
    }

    if (assetBase) {
        fetch(assetBase + "/portal-branding.json?v=" + version, { credentials: "same-origin", cache: "no-store" })
            .then(function (response) { return response.ok ? response.json() : null; })
            .then(function (value) { if (value) renderLoginBanner(value); })
            .catch(function () {});
    }

    frame.addEventListener("load", inspect);
    probeSession();
    window.setInterval(inspect, 500);
}());

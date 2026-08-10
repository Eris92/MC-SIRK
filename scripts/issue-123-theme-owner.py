from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
path = ROOT / "web/admin/admin.js"
source = path.read_text(encoding="utf-8")
start = source.index("    function colorParts(value) {")
end = source.index("    function element(tag, className, text) {", start)
new = r'''    function colorParts(value) {
        var match = String(value || "").match(/rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)(?:\D+([\d.]+))?/i);
        if (!match || (match[4] != null && Number(match[4]) === 0)) return null;
        return [Number(match[1]), Number(match[2]), Number(match[3])];
    }

    function hostBodyStyle() {
        var hostBody = hostDocument && hostDocument.body;
        if (!hostBody || !hostWindow || typeof hostWindow.getComputedStyle !== "function") return null;
        try { return hostWindow.getComputedStyle(hostBody); } catch (error) { return null; }
    }

    function hostIsDark() {
        var hostBody = hostDocument && hostDocument.body;
        var htmlTheme = hostDocument && hostDocument.documentElement && hostDocument.documentElement.getAttribute("data-bs-theme");
        if (htmlTheme === "dark") return true;
        if (htmlTheme === "light") return false;
        var bodyTheme = hostBody && hostBody.getAttribute("data-bs-theme");
        if (bodyTheme === "dark") return true;
        if (bodyTheme === "light") return false;
        if (hostBody && hostBody.classList.contains("night")) return true;
        if (typeof hostWindow.nightMode === "boolean") return hostWindow.nightMode;
        try {
            var storedMode = hostWindow.localStorage && hostWindow.localStorage.getItem("nightMode");
            if (storedMode === "1") return true;
            if (storedMode === "2") return false;
            if (storedMode === "0" && hostWindow.matchMedia) {
                return hostWindow.matchMedia("(prefers-color-scheme: dark)").matches;
            }
        } catch (error) {}

        var bodyStyle = hostBodyStyle();
        var background = bodyStyle && colorParts(bodyStyle.backgroundColor);
        if (background) return ((background[0] * 299 + background[1] * 587 + background[2] * 114) / 1000) < 145;
        var foreground = bodyStyle && colorParts(bodyStyle.color);
        return foreground ? ((foreground[0] * 299 + foreground[1] * 587 + foreground[2] * 114) / 1000) > 160 : false;
    }

    function syncHostTheme() {
        var theme = hostIsDark() ? "dark" : "light";
        root.setAttribute("data-host-theme", theme);
        if (root.parentElement) {
            root.parentElement.classList.add("sirk-admin-host");
            root.parentElement.setAttribute("data-sirk-host-theme", theme);
            try {
                var hostStyle = hostBodyStyle();
                if (hostStyle) {
                    root.parentElement.style.backgroundColor = hostStyle.backgroundColor || "";
                    root.parentElement.style.color = hostStyle.color || "";
                }
            } catch (error) {}
        }
    }

    function observeHostTheme() {
        syncHostTheme();
        if (hostWindow === window || !hostDocument) return;
        if (typeof hostWindow.MutationObserver === "function") {
            var observer = new hostWindow.MutationObserver(syncHostTheme);
            if (hostDocument.documentElement) {
                observer.observe(hostDocument.documentElement, { attributes: true, attributeFilter: ["class", "data-bs-theme"] });
            }
            if (hostDocument.body && hostDocument.body !== hostDocument.documentElement) {
                observer.observe(hostDocument.body, { attributes: true, attributeFilter: ["class", "style", "data-bs-theme"] });
            }
        }
        if (hostWindow.matchMedia) {
            var systemTheme = hostWindow.matchMedia("(prefers-color-scheme: dark)");
            if (typeof systemTheme.addEventListener === "function") systemTheme.addEventListener("change", syncHostTheme);
            else if (typeof systemTheme.addListener === "function") systemTheme.addListener(syncHostTheme);
        }
    }

'''
path.write_text(source[:start] + new + source[end:], encoding="utf-8")
print("Replaced speculative page-43 surface tracking with canonical MeshCentral body theme state.")

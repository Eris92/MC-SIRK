"use strict";

var fs = require("fs");
var path = require("path");
var https = require("https");
var VERSION = require("../../config.json").version;

var MAINTENANCE_DEFAULTS = {
    enabled: false,
    title: "Przerwa serwisowa",
    text: "System jest chwilowo niedostępny z powodu zaplanowanych prac serwisowych.",
    backgroundColor: "#0f172a",
    textColor: "#ffffff",
    estimatedEnd: "",
    allowedIps: ["127.0.0.1", "::1"],
    showNoticeToAllowed: true,
    blockNative: true
};

var RELEASE_DEFAULTS = {
    enabled: false,
    showAfterUpdate: true,
    title: "Co nowego",
    maxCommits: 12
};

var BUILT_IN_ANIMATIONS = [
    {
        id: "snow",
        builtIn: true,
        name: "Padający śnieg",
        type: "snow",
        enabled: false,
        symbol: "❄",
        colors: ["#ffffff", "#dbeafe", "#bfdbfe"],
        intensity: 45,
        speed: 1,
        size: 18,
        opacity: 0.9,
        durationSeconds: 0,
        startAt: "",
        endAt: "",
        layer: "foreground"
    },
    {
        id: "confetti",
        builtIn: true,
        name: "Confetti",
        type: "confetti",
        enabled: false,
        symbol: "",
        colors: ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"],
        intensity: 70,
        speed: 1.2,
        size: 12,
        opacity: 0.95,
        durationSeconds: 15,
        startAt: "",
        endAt: "",
        layer: "foreground"
    },
    {
        id: "walker",
        builtIn: true,
        name: "Postać przechodząca przez stronę",
        type: "walker",
        enabled: false,
        symbol: "🚶",
        colors: ["#2563eb"],
        intensity: 1,
        speed: 0.8,
        size: 44,
        opacity: 1,
        durationSeconds: 0,
        startAt: "",
        endAt: "",
        layer: "foreground"
    },
    {
        id: "christmas",
        builtIn: true,
        name: "Motyw świąteczny",
        type: "christmas",
        enabled: false,
        symbol: "❄ 🎄 ⭐ 🎁",
        colors: ["#ffffff", "#dc2626", "#16a34a", "#facc15"],
        intensity: 36,
        speed: 0.85,
        size: 22,
        opacity: 0.92,
        durationSeconds: 0,
        startAt: "",
        endAt: "",
        layer: "foreground"
    }
];

var ANIMATIONS_DEFAULTS = {
    enabled: false,
    showOnPortal: true,
    showOnLogin: false,
    respectReducedMotion: true,
    effects: BUILT_IN_ANIMATIONS
};

var ALLOWED_ANIMATION_TYPES = ["snow", "confetti", "walker", "christmas", "fall", "float"];

function objectValue(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function copy(value) {
    return JSON.parse(JSON.stringify(value == null ? {} : value));
}

function clamp(value, minimum, maximum, fallback) {
    value = Number(value);
    if (!Number.isFinite(value)) value = fallback;
    return Math.max(minimum, Math.min(maximum, value));
}

function maintenance(value) {
    value = objectValue(value);
    return {
        enabled: value.enabled === true,
        title: String(value.title || MAINTENANCE_DEFAULTS.title),
        text: String(value.text != null ? value.text : MAINTENANCE_DEFAULTS.text),
        backgroundColor: String(value.backgroundColor || MAINTENANCE_DEFAULTS.backgroundColor),
        textColor: String(value.textColor || MAINTENANCE_DEFAULTS.textColor),
        estimatedEnd: String(value.estimatedEnd || ""),
        allowedIps: (Array.isArray(value.allowedIps) ? value.allowedIps : MAINTENANCE_DEFAULTS.allowedIps)
            .map(String).map(function (item) { return item.trim(); }).filter(Boolean).slice(0, 128),
        showNoticeToAllowed: value.showNoticeToAllowed !== false,
        blockNative: value.blockNative !== false
    };
}

function release(value) {
    value = objectValue(value);
    return {
        enabled: value.enabled === true,
        showAfterUpdate: value.showAfterUpdate !== false,
        title: String(value.title || RELEASE_DEFAULTS.title),
        maxCommits: Math.round(clamp(value.maxCommits, 1, 50, RELEASE_DEFAULTS.maxCommits))
    };
}

function safeAnimationId(value, fallback) {
    value = String(value || fallback || "animation").toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    return (value || "animation").slice(0, 64);
}

function normalizeColors(value, fallback) {
    var colors = Array.isArray(value) ? value : fallback;
    return colors.map(String).map(function (item) { return item.trim(); }).filter(Boolean).slice(0, 12);
}

function normalizeEffect(value, fallback, customIndex) {
    value = objectValue(value);
    fallback = objectValue(fallback);
    var type = String(value.type || fallback.type || "fall").toLowerCase();
    if (ALLOWED_ANIMATION_TYPES.indexOf(type) < 0) type = "fall";
    var id = safeAnimationId(value.id, fallback.id || ("custom-" + customIndex));
    return {
        id: id,
        builtIn: fallback.builtIn === true,
        name: String(value.name || fallback.name || "Własna animacja").slice(0, 120),
        type: type,
        enabled: value.enabled === true,
        symbol: String(value.symbol != null ? value.symbol : (fallback.symbol || "✨")).slice(0, 80),
        colors: normalizeColors(value.colors, fallback.colors || ["#60a5fa"]),
        intensity: Math.round(clamp(value.intensity, 1, 200, fallback.intensity || 24)),
        speed: clamp(value.speed, 0.1, 5, fallback.speed || 1),
        size: Math.round(clamp(value.size, 8, 120, fallback.size || 20)),
        opacity: clamp(value.opacity, 0.1, 1, fallback.opacity || 0.9),
        durationSeconds: Math.round(clamp(value.durationSeconds, 0, 86400, fallback.durationSeconds || 0)),
        startAt: String(value.startAt || "").slice(0, 64),
        endAt: String(value.endAt || "").slice(0, 64),
        layer: String(value.layer || fallback.layer || "foreground") === "background" ? "background" : "foreground"
    };
}

function animations(value) {
    value = objectValue(value);
    var incoming = Array.isArray(value.effects) ? value.effects : [];
    var byId = {};
    incoming.forEach(function (effect) {
        var id = safeAnimationId(effect && effect.id, "");
        if (id) byId[id] = effect;
    });

    var effects = BUILT_IN_ANIMATIONS.map(function (fallback, index) {
        return normalizeEffect(byId[fallback.id] || fallback, fallback, index);
    });

    incoming.forEach(function (effect, index) {
        var id = safeAnimationId(effect && effect.id, "custom-" + index);
        if (BUILT_IN_ANIMATIONS.some(function (builtIn) { return builtIn.id === id; })) return;
        if (effects.length >= 24) return;
        var normalized = normalizeEffect(effect, {
            id: id,
            builtIn: false,
            name: "Własna animacja",
            type: "fall",
            symbol: "✨",
            colors: ["#60a5fa", "#a78bfa"],
            intensity: 24,
            speed: 1,
            size: 20,
            opacity: 0.9,
            durationSeconds: 0,
            layer: "foreground"
        }, index);
        normalized.builtIn = false;
        effects.push(normalized);
    });

    return {
        enabled: value.enabled === true,
        showOnPortal: value.showOnPortal !== false,
        showOnLogin: value.showOnLogin === true,
        respectReducedMotion: value.respectReducedMotion !== false,
        effects: effects
    };
}

function read(file, fallback) {
    try { return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")); }
    catch (error) { return fallback; }
}

function extend(runtime, pluginRoot) {
    if (!runtime || runtime.__sirkExperienceExtended) return runtime;
    runtime.__sirkExperienceExtended = true;

    var context = runtime.context;
    var root = pluginRoot || path.resolve(__dirname, "..", "..");
    var branding = path.join(root, "public", "portal", "standalone", "branding.json");
    var stateFile = path.join(context.dataRoot || path.join(root, "data"), "updates", "state.json");
    var historyFile = path.join(root, "version-history.json");
    var remote = null;

    function branch() {
        return { stable: "main", beta: "beta", dev: "develop" }[
            String(read(stateFile, { channel: "stable" }).channel || "stable")
        ] || "main";
    }

    function releaseData() {
        if (remote && remote.commits.length) return copy(remote);
        var state = read(stateFile, { history: [] });
        var entry = (Array.isArray(state.history) ? state.history : []).find(function (item) {
            return item && item.type === "update" && (String(item.to || "") === VERSION || Array.isArray(item.commits));
        });
        var commits = entry && Array.isArray(entry.commits) ? entry.commits : [];
        commits = commits.map(function (item) {
            return {
                sha: String(item && item.sha || "").slice(0, 12),
                message: String(item && item.message || ""),
                url: String(item && item.url || ""),
                author: String(item && item.author || ""),
                date: String(item && item.date || "")
            };
        }).filter(function (item) { return item.sha || item.message; });
        if (!commits.length) {
            var history = read(historyFile, []);
            var releaseEntry = Array.isArray(history) && history.find(function (item) {
                return String(item && item.version || "") === VERSION;
            });
            commits = releaseEntry && Array.isArray(releaseEntry.changes)
                ? releaseEntry.changes.map(function (message) {
                    return { sha: "", message: String(message), url: "", author: "", date: String(releaseEntry.date || "") };
                }) : [];
        }
        return {
            version: String(entry && (entry.to || entry.version) || VERSION),
            at: String(entry && entry.at || ""),
            commits: commits
        };
    }

    function portal() {
        var current = context.settings.read();
        return current && current.modules && current.modules.portal || {};
    }

    function publicConfig(portalSettings) {
        portalSettings = objectValue(portalSettings);
        var maintenanceConfig = maintenance(portalSettings.maintenance);
        delete maintenanceConfig.allowedIps;
        var releaseSettings = release(portalSettings.release);
        var releaseInfo = releaseData();
        releaseInfo.commits = (releaseInfo.commits || []).slice(0, releaseSettings.maxCommits);
        return {
            siteName: String(portalSettings.siteName || "SIRK Platform"),
            siteIconUrl: String(portalSettings.siteIconUrl || ""),
            showPasswordReset: portalSettings.showPasswordReset !== false,
            passwordResetUrl: String(portalSettings.passwordResetUrl || "https://passwordreset.microsoftonline.com/"),
            banner: copy(portalSettings.banner || {}),
            maintenance: maintenanceConfig,
            release: Object.assign(releaseSettings, releaseInfo),
            animations: animations(portalSettings.animations)
        };
    }

    function sync() {
        try { fs.writeFileSync(branding, JSON.stringify(publicConfig(portal()), null, 2) + "\n", "utf8"); }
        catch (error) {}
    }

    function refresh() {
        var url = "https://api.github.com/repos/Eris92/SIRK-Portal/commits?sha=" + encodeURIComponent(branch()) + "&per_page=30";
        https.get(url, { headers: { "User-Agent": "SIRK-Portal-Release", Accept: "application/vnd.github+json" } }, function (response) {
            if (response.statusCode !== 200) { response.resume(); return; }
            var chunks = [];
            response.on("data", function (chunk) { chunks.push(chunk); });
            response.on("end", function () {
                try {
                    var values = JSON.parse(Buffer.concat(chunks).toString("utf8"));
                    remote = {
                        version: VERSION,
                        at: new Date().toISOString(),
                        commits: (Array.isArray(values) ? values : []).map(function (item) {
                            var commit = item && item.commit || {};
                            var author = commit.author || {};
                            return {
                                sha: String(item && item.sha || "").slice(0, 12),
                                message: String(commit.message || "").split(/\r?\n/)[0],
                                url: String(item && item.html_url || ""),
                                author: String(author.name || ""),
                                date: String(author.date || "")
                            };
                        }).filter(function (item) { return item.sha && item.message; })
                    };
                    sync();
                } catch (error) {}
            });
        }).on("error", function () {});
    }

    var baseSave = runtime.saveAdminSettings;
    runtime.saveAdminSettings = function (user, payload) {
        payload = copy(payload || {});
        payload.moduleOptions = objectValue(payload.moduleOptions);
        var portalSettings = objectValue(payload.portal || payload.moduleOptions.portal);
        portalSettings.maintenance = maintenance(portalSettings.maintenance);
        portalSettings.release = release(portalSettings.release);
        portalSettings.animations = animations(portalSettings.animations);
        payload.portal = copy(portalSettings);
        payload.moduleOptions.portal = copy(portalSettings);

        return baseSave(user, payload).then(function () {
            return context.settings.update(function (current) {
                current.modules = current.modules || {};
                current.modules.portal = Object.assign({}, current.modules.portal || {}, {
                    maintenance: maintenance(portalSettings.maintenance),
                    release: release(portalSettings.release),
                    animations: animations(portalSettings.animations)
                });
                return current;
            });
        }).then(function () {
            sync();
            return runtime.adminSnapshot(user);
        });
    };

    var baseSnapshot = runtime.adminSnapshot;
    runtime.adminSnapshot = function (user) {
        var value = baseSnapshot(user);
        if (value) {
            value.moduleSettings = value.moduleSettings || {};
            value.moduleSettings.portal = value.moduleSettings.portal || {};
            value.moduleSettings.portal.maintenance = maintenance(value.moduleSettings.portal.maintenance);
            value.moduleSettings.portal.release = release(value.moduleSettings.portal.release);
            value.moduleSettings.portal.animations = animations(value.moduleSettings.portal.animations);
            value.release = releaseData();
        }
        return value;
    };

    var baseBootstrap = runtime.bootstrap;
    runtime.bootstrap = function (user) {
        var value = baseBootstrap(user);
        var portalModule = value && value.modules && value.modules.portal;
        if (portalModule) {
            portalModule.config = portalModule.config || {};
            portalModule.config.maintenance = maintenance(portalModule.config.maintenance);
            portalModule.config.release = release(portalModule.config.release);
            portalModule.config.animations = animations(portalModule.config.animations);
        }
        return value;
    };

    sync();
    refresh();
    return runtime;
}

module.exports = {
    extend: extend,
    maintenanceDefaults: MAINTENANCE_DEFAULTS,
    releaseDefaults: RELEASE_DEFAULTS,
    animationDefaults: ANIMATIONS_DEFAULTS,
    normalizeAnimations: animations
};

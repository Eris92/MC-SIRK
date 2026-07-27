(function () {
    "use strict";

    var state = { snapshot: null, activeJob: "", timer: 0, section: "updates" };

    function escapeHtml(value) {
        return String(value == null ? "" : value).replace(/[&<>\"]/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[character];
        });
    }

    function updateBase() {
        var path = String(window.location.pathname || "/");
        var portal = path.match(/^(.*?\/sirkportal)(?:\/.*)?$/i);
        return portal ? portal[1] + "/api/system/updates/" : "/api/system/updates/";
    }

    function api(action, method, body) {
        return fetch(updateBase() + action, {
            method: method || "GET",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: body ? JSON.stringify(body) : undefined
        }).then(function (response) {
            return response.json().catch(function () { throw new Error("Update API returned an invalid response."); });
        }).then(function (payload) {
            if (!payload.ok) throw new Error(payload.error || "Update operation failed.");
            return payload.value;
        });
    }

    function busy(snapshot) {
        return Object.keys(snapshot && snapshot.jobs || {}).some(function (id) {
            var job = snapshot.jobs[id];
            return job && (job.status === "queued" || job.status === "running");
        });
    }

    function latestJob(snapshot) {
        return Object.keys(snapshot && snapshot.jobs || {}).map(function (id) { return snapshot.jobs[id]; }).sort(function (a, b) {
            return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        })[0] || null;
    }

    function jobMarkup(job) {
        if (!job) return "";
        return '<div class="sirk-update-job ' + escapeHtml(job.status || "") + '"><strong>' + escapeHtml(job.type || "operacja") + '</strong>' +
            '<span>' + escapeHtml(job.message || job.status || "") + '</span>' +
            '<progress max="100" value="' + Number(job.progress || 0) + '"></progress><small>' + Number(job.progress || 0) + '%</small></div>';
    }

    function renderUpdates(host, snapshot) {
        var remote = snapshot.remote || {};
        var current = snapshot.current || {};
        var job = latestJob(snapshot);
        var restartButton = current.pending ? '<button type="button" class="sirk-button" data-update-action="restart">Uruchom ponownie MeshCentral</button>' : '';
        host.innerHTML = '<div class="sirk-update-section"><div class="sirk-update-actions">' +
            '<button type="button" class="sirk-button" data-update-action="check">Sprawdź aktualizacje</button>' +
            '<button type="button" class="sirk-button" data-update-action="install"' + (busy(snapshot) || current.pending ? ' disabled' : '') + '>Aktualizuj</button></div>' +
            '<div class="sirk-update-summary"><p>Aktualna wersja: <strong>' + escapeHtml(current.version || "—") + '</strong></p>' +
            '<p>Dostępna wersja: <strong>' + escapeHtml(remote.availableVersion || remote.error || "—") + '</strong></p>' +
            '<p>Aktywny kanał: <strong>' + escapeHtml(current.channel || "—") + '</strong> · <code>' + escapeHtml(current.branch || "—") + '</code></p>' +
            '<p>Status: <strong>' + (remote.updateAvailable ? 'Dostępna aktualizacja' : 'Aktualne') + '</strong></p></div>' +
            jobMarkup(job) + (current.pending ? '<p class="sirk-update-warning">Operacja została przygotowana. Uruchom ponownie MeshCentral, aby wykonać atomową podmianę plików.<br>' + restartButton + '</p>' : '') + '</div>';
    }

    function renderBackups(host, snapshot) {
        var items = snapshot.backups || [];
        host.innerHTML = '<div class="sirk-update-section"><div class="sirk-update-actions"><button type="button" class="sirk-button" data-update-action="backup"' + (busy(snapshot) ? ' disabled' : '') + '>Utwórz backup</button></div>' +
            '<div class="sirk-update-list">' + (items.length ? items.map(function (backup) {
                return '<article><div><strong>' + escapeHtml(backup.version || backup.id) + '</strong><small>' + escapeHtml(backup.createdAt || "") + '</small><small>' + escapeHtml(backup.reason || "") + '</small></div>' +
                    '<button type="button" class="sirk-button" data-restore-id="' + escapeHtml(backup.id) + '"' + (busy(snapshot) ? ' disabled' : '') + '>Przywróć</button></article>';
            }).join("") : '<p>Brak backupów.</p>') + '</div></div>';
    }

    function renderHistory(host, snapshot) {
        var history = (snapshot.history || []).slice().reverse();
        var jobs = Object.keys(snapshot.jobs || {}).map(function (id) { return snapshot.jobs[id]; }).sort(function (a, b) {
            return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
        });
        host.innerHTML = '<div class="sirk-update-section"><h3>Historia zakończonych operacji</h3>' +
            (history.length ? history.map(function (entry) { return '<p><strong>' + escapeHtml(entry.type || "operacja") + '</strong> · ' + escapeHtml(entry.at || "") + ' · ' + escapeHtml(entry.to || entry.version || "") + '</p>'; }).join("") : '<p>Brak zakończonych operacji.</p>') +
            '<h3>Zadania</h3>' + (jobs.length ? jobs.map(jobMarkup).join("") : '<p>Brak zadań.</p>') + '</div>';
    }

    function renderChannel(host, snapshot) {
        var current = snapshot.current || {};
        host.innerHTML = '<div class="sirk-update-section"><label class="sirk-update-channel-label">Kanał aktualizacji<select data-update-channel>' +
            '<option value="stable">Normalny — main</option><option value="beta">Beta — beta</option><option value="dev">Developerski — develop</option></select></label>' +
            '<div class="sirk-update-actions"><button type="button" class="sirk-button" data-update-action="save-channel"' + (busy(snapshot) || current.pending ? ' disabled' : '') + '>Zapisz</button></div>' +
            '<p>Zmiana kanału zacznie obowiązywać dopiero po kliknięciu <strong>Zapisz</strong>.</p></div>';
        host.querySelector("[data-update-channel]").value = current.channel || "stable";
    }

    function render(host, section) {
        var snapshot = state.snapshot || { current: {}, remote: {}, backups: [], history: [], jobs: {}, health: { checks: [] } };
        if (section === "backups") renderBackups(host, snapshot);
        else if (section === "history") renderHistory(host, snapshot);
        else if (section === "channel") renderChannel(host, snapshot);
        else renderUpdates(host, snapshot);
    }

    function load(host, section) {
        host.innerHTML = '<div class="sirk-update-loading">Ładowanie…</div>';
        return api("status").then(function (snapshot) {
            state.snapshot = snapshot;
            render(host, section);
            if (busy(snapshot)) schedule(host, section);
        }).catch(function (error) {
            host.innerHTML = '<div class="sirk-error">' + escapeHtml(error.message) + '</div>';
        });
    }

    function schedule(host, section) {
        clearTimeout(state.timer);
        state.timer = setTimeout(function () { load(host, section); }, 1200);
    }

    function startJob(host, section, action, body) {
        return api(action, "POST", body).then(function (result) {
            state.activeJob = result.jobId || "";
            return load(host, section);
        }).catch(function (error) {
            window.alert(error.message);
            return load(host, section);
        });
    }

    function mount(host, section) {
        section = section || "updates";
        state.section = section;
        clearTimeout(state.timer);
        host.onclick = function (event) {
            var actionNode = event.target.closest("[data-update-action]");
            var restoreNode = event.target.closest("[data-restore-id]");
            if (actionNode) {
                var action = actionNode.getAttribute("data-update-action");
                if (action === "check") api("check", "POST", { channel: state.snapshot.current.channel }).then(function () { load(host, section); }).catch(function (error) { window.alert(error.message); });
                if (action === "backup") startJob(host, section, "backup", { reason: "manual" });
                if (action === "install" && window.confirm("Utworzyć backup i przygotować aktualizację z zapisanego kanału?")) startJob(host, section, "update", { channel: state.snapshot.current.channel });
                if (action === "save-channel") {
                    var channel = host.querySelector("[data-update-channel]");
                    api("channel", "POST", { channel: channel.value }).then(function () { return load(host, section); }).catch(function (error) { window.alert(error.message); });
                }
                if (action === "restart" && window.confirm("Uruchomić ponownie MeshCentral teraz?")) {
                    actionNode.disabled = true;
                    api("restart", "POST", {}).catch(function (error) { window.alert(error.message); actionNode.disabled = false; });
                }
            }
            if (restoreNode && window.confirm("Przywrócić wybrany backup?")) startJob(host, section, "restore", { backupId: restoreNode.getAttribute("data-restore-id") });
        };
        load(host, section);
    }

    function settingsLayout(host) {
        if (!host || host.getAttribute("data-system-settings-ready") === "1") return;
        host.setAttribute("data-system-settings-ready", "1");

        var original = document.createElement("div");
        original.className = "sirk-settings-original";
        while (host.firstChild) original.appendChild(host.firstChild);

        var shell = document.createElement("section");
        shell.className = "sirk-standalone-view-scroll";
        shell.innerHTML = '<div class="sirk-toolbar-host"><div class="sirk-toolbar"><strong>Ustawienia</strong></div></div>' +
            '<div class="sirk-layout-host"><div class="sirk-layout"><aside class="sirk-column-primary">' +
            '<button type="button" class="sirk-nav-item is-active" data-settings-group="portal">Portal</button>' +
            '<button type="button" class="sirk-nav-item" data-settings-group="system">System</button></aside>' +
            '<aside class="sirk-column-secondary" data-settings-secondary></aside>' +
            '<div class="sirk-column-details" data-settings-details></div></div></div>';
        host.appendChild(shell);

        var secondary = shell.querySelector("[data-settings-secondary]");
        var details = shell.querySelector("[data-settings-details]");

        function selectGroup(group) {
            Array.prototype.forEach.call(shell.querySelectorAll("[data-settings-group]"), function (item) {
                item.classList.toggle("is-active", item.getAttribute("data-settings-group") === group);
            });
            secondary.innerHTML = "";
            details.innerHTML = "";
            if (group === "system") {
                secondary.innerHTML = '<button type="button" class="sirk-nav-item is-active" data-system-section="updates">Aktualizacje</button>' +
                    '<button type="button" class="sirk-nav-item" data-system-section="backups">Backupy</button>' +
                    '<button type="button" class="sirk-nav-item" data-system-section="history">Historia</button>' +
                    '<button type="button" class="sirk-nav-item" data-system-section="channel">Kanał aktualizacji</button>';
                mount(details, "updates");
            } else {
                details.appendChild(original);
            }
        }

        shell.addEventListener("click", function (event) {
            var group = event.target.closest("[data-settings-group]");
            if (group) {
                selectGroup(group.getAttribute("data-settings-group"));
                return;
            }
            var button = event.target.closest("[data-system-section]");
            if (!button) return;
            Array.prototype.forEach.call(shell.querySelectorAll("[data-system-section]"), function (item) {
                item.classList.toggle("is-active", item === button);
            });
            mount(details, button.getAttribute("data-system-section"));
        });

        selectGroup("portal");
    }

    function installSettingsIntegration() {
        function apply() {
            var content = document.getElementById("sirkStandaloneContent");
            if (!content || content.getAttribute("data-active-view") !== "settings") return;
            var host = content.querySelector(".sirk-portal-view-host") || content.firstElementChild;
            settingsLayout(host);
        }
        new MutationObserver(apply).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-active-view"] });
        apply();
    }

    window.SirkSystemUpdates = { mount: mount, refresh: load };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", installSettingsIntegration);
    else installSettingsIntegration();
}());

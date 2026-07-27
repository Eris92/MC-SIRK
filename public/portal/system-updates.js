(function () {
    "use strict";

    var state = { snapshot: null, timer: 0, section: "updates" };
    var RESTART_KEY = "sirkPortal.restartState";

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
        var requestMethod = method || "GET";
        var endpoint = updateBase() + action;
        if (requestMethod === "GET") endpoint += (endpoint.indexOf("?") >= 0 ? "&" : "?") + "sirk_refresh=" + Date.now() + "_" + Math.random().toString(16).slice(2);
        return fetch(endpoint, {
            method: requestMethod,
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Content-Type": "application/json", "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache" },
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

    function saveRestartState(value) {
        try { sessionStorage.setItem(RESTART_KEY, JSON.stringify(value)); } catch (error) {}
    }

    function clearRestartState() {
        try { sessionStorage.removeItem(RESTART_KEY); } catch (error) {}
    }

    function ensureOverlay() {
        var overlay = document.getElementById("sirkUpdateFullscreen");
        if (overlay) return overlay;
        overlay = document.createElement("div");
        overlay.id = "sirkUpdateFullscreen";
        overlay.setAttribute("role", "status");
        overlay.setAttribute("aria-live", "polite");
        overlay.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:28px;background:var(--sirk-bg,#f3f6fb);color:var(--sirk-text,#172033);box-sizing:border-box";
        document.body.appendChild(overlay);
        return overlay;
    }

    function fullScreen(message, detail, progress, logs, failed) {
        var overlay = ensureOverlay();
        var value = Math.max(0, Math.min(100, Number(progress || 0)));
        overlay.innerHTML = '<div style="width:min(760px,100%);padding:28px;border:1px solid var(--sirk-border,#dce3ec);border-radius:14px;background:var(--sirk-panel,#fff);box-shadow:0 24px 70px rgba(15,23,42,.2)">' +
            '<div class="sirk-restart-spinner" aria-hidden="true"' + (failed ? ' style="display:none"' : '') + '></div>' +
            '<h1 style="margin:14px 0 8px;font-size:28px">' + escapeHtml(message) + '</h1>' +
            '<p style="margin:0 0 20px;color:var(--sirk-muted,#657187)">' + escapeHtml(detail || "") + '</p>' +
            '<progress max="100" value="' + value + '" style="width:100%;height:18px"></progress>' +
            '<div style="margin-top:8px;text-align:right;font-weight:700">' + value + '%</div>' +
            (logs ? '<pre style="max-height:260px;overflow:auto;margin:20px 0 0;padding:14px;border:1px solid var(--sirk-border,#dce3ec);border-radius:8px;white-space:pre-wrap;background:var(--sirk-bg,#f3f6fb)">' + escapeHtml(logs) + '</pre>' : '') +
            (failed ? '<button type="button" class="sirk-button" data-update-close style="margin-top:18px">Wróć do ustawień</button>' : '') + '</div>';
        var close = overlay.querySelector("[data-update-close]");
        if (close) close.onclick = function () { overlay.remove(); };
    }

    function loginRedirect() {
        clearRestartState();
        window.location.replace(String(window.__SIRK_PLATFORM_LOGOUT_URL__ || "/logout"));
    }

    function waitForRestart() {
        clearTimeout(state.timer);
        fullScreen("Ponowne uruchamianie MeshCentral…", "Usługa jest restartowana. Portal czeka na jej powrót, a następnie otworzy panel logowania.", 100, "Aktualizacja zakończona.\nRestart usługi MeshCentral…", false);
        var started = Date.now();
        function poll() {
            if (Date.now() - started < 4500) { state.timer = setTimeout(poll, 800); return; }
            api("status").then(function (snapshot) {
                if (!snapshot || !snapshot.current) throw new Error("Usługa nie jest jeszcze gotowa.");
                loginRedirect();
            }).catch(function () {
                if (Date.now() - started > 120000) {
                    fullScreen("Nie udało się potwierdzić powrotu usługi", "Sprawdź stan MeshCentral i odśwież stronę.", 100, "Przekroczono czas oczekiwania na usługę.", true);
                    return;
                }
                state.timer = setTimeout(poll, 1200);
            });
        }
        poll();
    }

    function runUpdate() {
        var channel = state.snapshot && state.snapshot.current && state.snapshot.current.channel || "stable";
        fullScreen("Przygotowanie aktualizacji…", "Tworzenie backupu i przygotowanie plików aktualizacji.", 2, "Rozpoczynanie zadania aktualizacji…", false);
        api("update", "POST", { channel: channel }).then(function () {
            function monitor() {
                api("status").then(function (snapshot) {
                    state.snapshot = snapshot;
                    var job = latestJob(snapshot);
                    if (!job) { state.timer = setTimeout(monitor, 1000); return; }
                    var message = job.status === "queued" ? "Aktualizacja oczekuje…" : job.status === "running" ? "Aktualizowanie systemu…" : job.status === "failed" ? "Aktualizacja nie powiodła się" : "Aktualizacja przygotowana";
                    var log = ["Typ: " + (job.type || "update"), "Status: " + (job.status || "—"), job.message || "", job.error || ""].filter(Boolean).join("\n");
                    fullScreen(message, job.message || "", job.progress || (job.status === "completed" ? 100 : 0), log, job.status === "failed");
                    if (job.status === "failed") return;
                    if (job.status === "completed") {
                        saveRestartState({ pending: true, section: "updates", startedAt: Date.now() });
                        api("restart", "POST", {}).then(waitForRestart).catch(function (error) {
                            clearRestartState();
                            fullScreen("Nie udało się zrestartować usługi", error.message, 100, log, true);
                        });
                        return;
                    }
                    state.timer = setTimeout(monitor, 1000);
                }).catch(function (error) {
                    fullScreen("Utracono połączenie z usługą", "Portal ponawia sprawdzanie stanu aktualizacji.", 50, error.message, false);
                    state.timer = setTimeout(monitor, 1400);
                });
            }
            monitor();
        }).catch(function (error) {
            fullScreen("Nie udało się rozpocząć aktualizacji", error.message, 0, error.message, true);
        });
    }

    function stateMarkup(remote, current) {
        if (remote.error) return '<div class="sirk-card"><strong>Nie udało się sprawdzić aktualizacji</strong><p>' + escapeHtml(remote.error) + '</p></div>';
        if (remote.updateAvailable) return '<div class="sirk-card"><strong>Dostępna jest aktualizacja systemu</strong><p>Możesz zaktualizować system z wersji <strong>' + escapeHtml(current.version || "—") + '</strong> do <strong>' + escapeHtml(remote.availableVersion || "—") + '</strong>.</p></div>';
        return '<div class="sirk-card"><strong>System jest aktualny</strong><p>Zainstalowana jest najnowsza dostępna wersja dla wybranego kanału.</p></div>';
    }

    function renderUpdates(host, snapshot) {
        var remote = snapshot.remote || {};
        var current = snapshot.current || {};
        host.innerHTML = '<div class="sirk-update-section"><div class="sirk-update-actions"><button type="button" class="sirk-button" data-update-action="check">Sprawdź aktualizacje</button><button type="button" class="sirk-button" data-update-action="install"' + (busy(snapshot) || !remote.updateAvailable ? ' disabled' : '') + '>Aktualizuj system</button></div><div class="sirk-update-summary"><p>Aktualna wersja: <strong>' + escapeHtml(current.version || "—") + '</strong></p><p>Dostępna wersja: <strong>' + escapeHtml(remote.availableVersion || remote.error || "—") + '</strong></p><p>Aktywny kanał: <strong>' + escapeHtml(current.channel || "—") + '</strong> · <code>' + escapeHtml(current.branch || "—") + '</code></p></div>' + stateMarkup(remote, current) + '</div>';
    }

    function renderBackups(host, snapshot) {
        var items = snapshot.backups || [];
        var disabled = busy(snapshot) ? " disabled" : "";
        host.innerHTML = '<div class="sirk-update-section"><div class="sirk-update-actions"><button type="button" class="sirk-button" data-update-action="backup"' + disabled + '>Utwórz backup</button></div><div class="sirk-update-list">' +
            (items.length ? items.map(function (backup) {
                return '<article><div><strong>' + escapeHtml(backup.version || backup.id) + '</strong><small>' + escapeHtml(backup.createdAt || "") + '</small><small>' + escapeHtml(backup.reason || "") + '</small></div><div class="sirk-update-backup-actions"><button type="button" class="sirk-button" data-restore-id="' + escapeHtml(backup.id) + '"' + disabled + '>Przywróć</button><button type="button" class="sirk-button sirk-button-danger" data-delete-backup-id="' + escapeHtml(backup.id) + '"' + disabled + '>Usuń</button></div></article>';
            }).join("") : '<p>Brak backupów.</p>') + '</div></div>';
    }

    function renderHistory(host, snapshot) {
        var rows = (snapshot.history || []).map(function (entry) { return { type: entry.type || "operacja", at: entry.at, version: entry.to || entry.version || "—", status: entry.error ? "Nieudana" : "Zakończona", message: entry.error || "" }; });
        host.innerHTML = '<div class="sirk-update-section"><h3>Historia aktualizacji</h3>' + (rows.length ? '<div class="sirk-update-history-table-wrap"><table class="sirk-update-history-table"><thead><tr><th>Operacja</th><th>Data</th><th>Wersja</th><th>Status</th><th>Informacja</th></tr></thead><tbody>' + rows.map(function (row) { return '<tr><td>' + escapeHtml(row.type) + '</td><td>' + escapeHtml(row.at || "—") + '</td><td>' + escapeHtml(row.version) + '</td><td>' + escapeHtml(row.status) + '</td><td>' + escapeHtml(row.message || "—") + '</td></tr>'; }).join("") + '</tbody></table></div>' : '<p>Brak operacji.</p>') + '</div>';
    }

    function renderChannel(host, snapshot) {
        var current = snapshot.current || {};
        host.innerHTML = '<div class="sirk-update-section"><label class="sirk-update-channel-label">Kanał aktualizacji<select data-update-channel><option value="stable">Normalny — main</option><option value="beta">Beta — beta</option><option value="dev">Developerski — develop</option></select></label><div class="sirk-update-actions"><button type="button" class="sirk-button" data-update-action="save-channel">Zapisz</button></div></div>';
        host.querySelector("[data-update-channel]").value = current.channel || "stable";
    }

    function render(host, section) {
        var snapshot = state.snapshot || { current: {}, remote: {}, backups: [], history: [], jobs: {} };
        if (section === "backups") renderBackups(host, snapshot);
        else if (section === "history") renderHistory(host, snapshot);
        else if (section === "channel") renderChannel(host, snapshot);
        else renderUpdates(host, snapshot);
    }

    function load(host, section) {
        if (!host.firstElementChild) host.innerHTML = '<div class="sirk-update-loading">Ładowanie…</div>';
        return api("status").then(function (snapshot) { state.snapshot = snapshot; render(host, section); }).catch(function (error) { host.innerHTML = '<div class="sirk-error">' + escapeHtml(error.message) + '</div>'; });
    }

    function startJob(host, section, action, body) {
        return api(action, "POST", body).then(function () { return load(host, section); }).catch(function (error) { window.alert(error.message); return load(host, section); });
    }

    function mount(host, section) {
        section = section || "updates";
        state.section = section;
        clearTimeout(state.timer);
        host.onclick = function (event) {
            var actionNode = event.target.closest("[data-update-action]");
            var restoreNode = event.target.closest("[data-restore-id]");
            var deleteNode = event.target.closest("[data-delete-backup-id]");
            if (actionNode) {
                var action = actionNode.getAttribute("data-update-action");
                if (action === "check") api("check", "POST", { channel: state.snapshot.current.channel }).then(function () { load(host, section); }).catch(function (error) { window.alert(error.message); });
                if (action === "backup") startJob(host, section, "backup", { reason: "manual" });
                if (action === "install" && window.confirm("Utworzyć backup, zaktualizować system i automatycznie zrestartować MeshCentral?")) runUpdate();
                if (action === "save-channel") {
                    var channel = host.querySelector("[data-update-channel]");
                    api("channel", "POST", { channel: channel.value }).then(function () { return load(host, section); }).catch(function (error) { window.alert(error.message); });
                }
            }
            if (restoreNode && window.confirm("Przywrócić wybrany backup?")) startJob(host, section, "restore", { backupId: restoreNode.getAttribute("data-restore-id") });
            if (deleteNode && window.confirm("Trwale usunąć wybrany backup? Tej operacji nie można cofnąć.")) {
                deleteNode.disabled = true;
                api("delete-backup", "POST", { backupId: deleteNode.getAttribute("data-delete-backup-id") }).then(function () { return load(host, section); }).catch(function (error) { window.alert(error.message); return load(host, section); });
            }
        };
        load(host, section);
    }

    window.SirkSystemUpdates = { mount: mount, refresh: load };
}());

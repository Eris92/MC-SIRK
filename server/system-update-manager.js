"use strict";

var fs = require("fs");
var path = require("path");
var https = require("https");
var crypto = require("crypto");
var childProcess = require("child_process");
var util = require("util");

var execFile = util.promisify(childProcess.execFile);
var CHANNELS = Object.freeze({ stable: "main", beta: "beta", dev: "develop" });

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function safeName(value) {
    return String(value || "").replace(/[^a-z0-9._-]/gi, "_");
}

function request(url) {
    return new Promise(function (resolve, reject) {
        https.get(url, { headers: { "User-Agent": "SIRK-Portal-Updater", Accept: "application/json" } }, function (res) {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                request(res.headers.location).then(resolve, reject);
                return;
            }
            if (res.statusCode !== 200) {
                reject(new Error("Remote server returned HTTP " + res.statusCode + "."));
                res.resume();
                return;
            }
            var chunks = [];
            res.on("data", function (chunk) { chunks.push(chunk); });
            res.on("end", function () { resolve(Buffer.concat(chunks)); });
        }).on("error", reject);
    });
}

function create(options) {
    options = options || {};
    var appRoot = path.resolve(options.appRoot || path.join(__dirname, ".."));
    var dataRoot = path.resolve(options.dataRoot || path.join(path.dirname(appRoot), "sirk-platform-data"));
    var updateRoot = path.join(dataRoot, "updates");
    var backupRoot = path.join(updateRoot, "backups");
    var workRoot = path.join(updateRoot, "work");
    var stateFile = path.join(updateRoot, "state.json");
    var activeJobs = Object.create(null);

    function loadState() {
        try { return Object.assign({ channel: "stable", history: [], pending: null, jobs: {} }, readJson(stateFile)); }
        catch (error) { return { channel: "stable", history: [], pending: null, jobs: {} }; }
    }

    function saveState(value) {
        fs.mkdirSync(updateRoot, { recursive: true });
        fs.writeFileSync(stateFile, JSON.stringify(value, null, 2));
    }

    function branch(channel) {
        channel = String(channel || loadState().channel || "stable").toLowerCase();
        if (!CHANNELS[channel]) throw new Error("Unknown update channel.");
        return CHANNELS[channel];
    }

    function installedVersion() {
        var packageVersion = "";
        var configVersion = "";
        try { packageVersion = String(readJson(path.join(appRoot, "package.json")).version || ""); } catch (error) {}
        try { configVersion = String(readJson(path.join(appRoot, "config.json")).version || ""); } catch (error) {}
        return configVersion || packageVersion || "unknown";
    }

    function current() {
        var state = loadState();
        return {
            version: installedVersion(),
            channel: state.channel,
            branch: branch(state.channel),
            pending: state.pending || null,
            jobs: state.jobs || {}
        };
    }

    function health(target) {
        target = path.resolve(target || appRoot);
        var checks = [];
        function check(name, callback) {
            try { callback(); checks.push({ name: name, ok: true }); }
            catch (error) { checks.push({ name: name, ok: false, error: String(error.message || error) }); }
        }
        check("package", function () { if (!readJson(path.join(target, "package.json")).version) throw new Error("version missing"); });
        check("config", function () { if (readJson(path.join(target, "config.json")).shortName !== "SIRKPortal") throw new Error("identity mismatch"); });
        check("entrypoint", function () { if (!fs.existsSync(path.join(target, "SIRKPortal.js"))) throw new Error("entrypoint missing"); });
        check("standalone", function () { if (!fs.existsSync(path.join(target, "server", "standalone.js"))) throw new Error("standalone server missing"); });
        check("update-helper", function () { if (!fs.existsSync(path.join(target, "server", "update-helper.js"))) throw new Error("update helper missing"); });
        return { ok: checks.every(function (item) { return item.ok; }), checks: checks };
    }

    function listBackups() {
        fs.mkdirSync(backupRoot, { recursive: true });
        return fs.readdirSync(backupRoot, { withFileTypes: true }).filter(function (entry) {
            return entry.isDirectory();
        }).map(function (entry) {
            var manifest = {};
            try { manifest = readJson(path.join(backupRoot, entry.name, "manifest.json")); } catch (error) {}
            return Object.assign({ id: entry.name }, manifest);
        }).sort(function (left, right) {
            return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
        });
    }

    function updateJob(jobId, patch) {
        var state = loadState();
        state.jobs = state.jobs || {};
        state.jobs[jobId] = Object.assign({}, state.jobs[jobId] || {}, patch, { updatedAt: new Date().toISOString() });
        saveState(state);
        return state.jobs[jobId];
    }

    function startJob(type, task) {
        var state = loadState();
        var busy = Object.keys(state.jobs || {}).some(function (id) {
            return state.jobs[id] && (state.jobs[id].status === "queued" || state.jobs[id].status === "running");
        });
        if (busy || state.pending) throw new Error("Another update, backup or restore operation is already running.");
        var jobId = Date.now() + "-" + type + "-" + crypto.randomBytes(4).toString("hex");
        updateJob(jobId, { id: jobId, type: type, status: "queued", progress: 0, message: "Queued", createdAt: new Date().toISOString() });
        activeJobs[jobId] = true;
        setImmediate(function () {
            updateJob(jobId, { status: "running", progress: 1, message: "Starting" });
            Promise.resolve().then(function () {
                return task(function (progress, message) { updateJob(jobId, { progress: progress, message: message }); });
            }).then(function (result) {
                updateJob(jobId, { status: "completed", progress: 100, message: "Completed", result: result });
                delete activeJobs[jobId];
            }).catch(function (error) {
                updateJob(jobId, { status: "failed", progress: 100, message: String(error.message || error), error: String(error.message || error) });
                delete activeJobs[jobId];
            });
        });
        return { jobId: jobId, status: "queued" };
    }

    async function createBackupNow(reason, progress) {
        var installed = current();
        var id = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 17) + "-" + safeName(installed.version) + "-" + safeName(reason || "manual");
        var directory = path.join(backupRoot, id);
        var payload = path.join(directory, "app");
        await fs.promises.mkdir(directory, { recursive: true });
        if (progress) progress(15, "Copying application files");
        await fs.promises.cp(appRoot, payload, {
            recursive: true,
            errorOnExist: true,
            filter: function (source) { return path.resolve(source).indexOf(path.resolve(updateRoot)) !== 0; }
        });
        var manifest = { id: id, version: installed.version, channel: installed.channel, branch: installed.branch, reason: reason || "manual", createdAt: new Date().toISOString() };
        await fs.promises.writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2));
        if (progress) progress(95, "Writing backup manifest");
        return manifest;
    }

    function backup(reason) {
        return startJob("backup", function (progress) { return createBackupNow(reason || "manual", progress); });
    }

    function check(channel) {
        var selectedBranch = branch(channel);
        var base = "https://raw.githubusercontent.com/Eris92/SIRK-Portal/" + selectedBranch + "/";
        return Promise.all([request(base + "package.json"), request(base + "config.json")]).then(function (values) {
            var packageJson = JSON.parse(values[0].toString("utf8"));
            var config = JSON.parse(values[1].toString("utf8"));
            if (config.shortName !== "SIRKPortal") throw new Error("Remote package identity mismatch.");
            var installed = current();
            var remoteVersion = String(config.version || packageJson.version || "");
            return {
                channel: Object.keys(CHANNELS).find(function (key) { return CHANNELS[key] === selectedBranch; }),
                branch: selectedBranch,
                currentVersion: installed.version,
                availableVersion: remoteVersion,
                downloadUrl: "https://codeload.github.com/Eris92/SIRK-Portal/zip/refs/heads/" + selectedBranch,
                updateAvailable: remoteVersion !== String(installed.version)
            };
        });
    }

    async function extract(zipFile, destination) {
        await fs.promises.mkdir(destination, { recursive: true });
        if (process.platform === "win32") {
            await execFile("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Expand-Archive -LiteralPath '" + zipFile.replace(/'/g, "''") + "' -DestinationPath '" + destination.replace(/'/g, "''") + "' -Force"]);
        } else {
            await execFile("unzip", ["-q", zipFile, "-d", destination]);
        }
    }

    async function scheduleSwap(staged, token, history, channel) {
        var operationRoot = path.join(workRoot, token, "operation");
        var helperCopy = path.join(operationRoot, "update-helper.js");
        var manifestFile = path.join(operationRoot, "pending.json");
        await fs.promises.mkdir(operationRoot, { recursive: true });
        await fs.promises.copyFile(path.join(appRoot, "server", "update-helper.js"), helperCopy);
        var manifest = { token: token, parentPid: process.pid, target: appRoot, staged: staged, stateFile: stateFile, history: history };
        await fs.promises.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
        var state = loadState();
        state.pending = { token: token, type: history.type, targetVersion: history.to || history.version || "", backupId: history.backupId || "", createdAt: new Date().toISOString() };
        if (channel) state.channel = channel;
        saveState(state);
        var child = childProcess.spawn(process.execPath, [helperCopy, manifestFile], { cwd: path.dirname(appRoot), detached: true, stdio: "ignore", windowsHide: true });
        child.unref();
        return state.pending;
    }

    function install(channel) {
        return startJob("update", async function (progress) {
            progress(5, "Checking selected channel");
            var remote = await check(channel);
            progress(12, "Creating safety backup");
            var backupManifest = await createBackupNow("before-update", function (value, message) { progress(12 + Math.round(value * 0.28), message); });
            var token = Date.now() + "-" + crypto.randomBytes(4).toString("hex");
            var work = path.join(workRoot, token);
            var zipFile = path.join(work, "source.zip");
            var extracted = path.join(work, "extract");
            await fs.promises.mkdir(work, { recursive: true });
            progress(45, "Downloading update");
            var archive = await request(remote.downloadUrl);
            await fs.promises.writeFile(zipFile, archive);
            progress(62, "Extracting update");
            await extract(zipFile, extracted);
            var directories = await fs.promises.readdir(extracted);
            if (directories.length !== 1) throw new Error("Unexpected update archive layout.");
            var staged = path.join(extracted, directories[0]);
            progress(78, "Running health checks");
            var stagedHealth = health(staged);
            if (!stagedHealth.ok) throw new Error("Downloaded update failed health checks.");
            var history = { type: "update", at: new Date().toISOString(), from: backupManifest.version, to: remote.availableVersion, backupId: backupManifest.id, channel: remote.channel };
            progress(90, "Scheduling atomic swap");
            var pending = await scheduleSwap(staged, token, history, remote.channel);
            return { staged: true, restartRequired: true, version: remote.availableVersion, backupId: backupManifest.id, pending: pending, health: stagedHealth };
        });
    }

    function restore(backupId) {
        return startJob("restore", async function (progress) {
            backupId = String(backupId || "");
            if (!/^[a-z0-9._-]+$/i.test(backupId)) throw new Error("Invalid backup identifier.");
            var source = path.join(backupRoot, backupId, "app");
            if (!fs.existsSync(source)) throw new Error("Backup was not found.");
            var backupManifest = readJson(path.join(backupRoot, backupId, "manifest.json"));
            progress(10, "Creating safety backup");
            var safety = await createBackupNow("before-restore", function (value, message) { progress(10 + Math.round(value * 0.3), message); });
            var token = Date.now() + "-restore-" + crypto.randomBytes(4).toString("hex");
            var staged = path.join(workRoot, token, "restore");
            await fs.promises.mkdir(path.dirname(staged), { recursive: true });
            progress(48, "Copying selected backup");
            await fs.promises.cp(source, staged, { recursive: true, errorOnExist: true });
            progress(75, "Running health checks");
            var stagedHealth = health(staged);
            if (!stagedHealth.ok) { await fs.promises.rm(staged, { recursive: true, force: true }); throw new Error("Backup failed health checks."); }
            var history = { type: "restore", at: new Date().toISOString(), version: backupManifest.version, backupId: backupId, safetyBackupId: safety.id, channel: backupManifest.channel || loadState().channel };
            progress(90, "Scheduling restore");
            var pending = await scheduleSwap(staged, token, history, history.channel);
            return { staged: true, restartRequired: true, backupId: backupId, safetyBackupId: safety.id, pending: pending, health: stagedHealth };
        });
    }

    function setChannel(channel) {
        var state = loadState();
        if (state.pending) throw new Error("The update channel cannot be changed while an operation is pending.");
        var selectedBranch = branch(channel);
        state.channel = Object.keys(CHANNELS).find(function (key) { return CHANNELS[key] === selectedBranch; });
        saveState(state);
        return current();
    }

    function restart() {
        if (typeof options.restart === "function") return Promise.resolve(options.restart());
        return { scheduled: false, reason: "Restart is managed by the host service." };
    }

    function job(jobId) {
        return (loadState().jobs || {})[String(jobId || "")] || null;
    }

    return { channels: CHANNELS, current: current, state: loadState, setChannel: setChannel, check: check, backup: backup, backups: listBackups, install: install, restore: restore, health: health, job: job, restart: restart };
}

module.exports = { create: create, channels: CHANNELS };

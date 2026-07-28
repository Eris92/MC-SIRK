"use strict";

var path = require("path");
var fs = require("fs");
var childProcess = require("child_process");
var execFile = require("util").promisify(childProcess.execFile);
var standalone = require("../server/standalone.js");

if (process.argv.indexOf("--live") === -1) {
    throw new Error("Live service E2E requires the explicit --live flag.");
}

var port = Number(process.env.SIRK_AGENT_E2E_PORT || 18080);
var dataRoot = path.resolve(process.env.SIRK_AGENT_E2E_DATA ||
    path.join(__dirname, "..", ".tmp", "agent-service-e2e"));
var agentRoot = path.join(process.env.ProgramData || "C:\\ProgramData", "SIRK", "Agent");
var credentialPath = path.join(agentRoot, "portal-credential.bin");
var registryPath = path.join(dataRoot, "agent-registry.json");
var previousCredential = fs.existsSync(credentialPath) ? fs.readFileSync(credentialPath) : null;
var enrollmentToken = "sirk-local-enrollment-only";
var tokenPath = path.join(dataRoot, "enrollment-token.txt");
var cliPath = process.env.SIRK_AGENT_E2E_CLI ||
    "C:\\Program Files\\SIRK Agent\\sirkctl.exe";
var policyFile = process.env.SIRK_AGENT_E2E_POLICY_FILE || "";
var policy = policyFile ? JSON.parse(fs.readFileSync(policyFile, "utf8")) : null;
var policyOutboxFile = policy ? path.join(dataRoot, "agent-policy-outbox", policy.tenantId,
    policy.deviceId, path.basename(policyFile)) : "";

standalone.start({
    host: "127.0.0.1",
    port: port,
    dataRoot: dataRoot,
    agentEnrollmentToken: enrollmentToken
}).then(async function (server) {
    var deadline = Date.now() + 90000;
    fs.mkdirSync(dataRoot, { recursive: true });
    if (fs.existsSync(registryPath)) fs.unlinkSync(registryPath);
    if (policy) {
        fs.mkdirSync(path.dirname(policyOutboxFile), { recursive: true });
        fs.copyFileSync(policyFile, policyOutboxFile);
    }
    fs.writeFileSync(tokenPath, enrollmentToken + "\n", { encoding: "utf8", mode: 0o600 });
    await execFile(cliPath, [
        "enroll",
        "--endpoint", "http://127.0.0.1:" + port + "/api/agent/v1/enroll",
        "--bootstrap-token-file", tokenPath
    ], { encoding: "utf8", windowsHide: true });
    return new Promise(function (resolve, reject) {
        var timer = setInterval(function () {
            try {
                var registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
                var keys = Object.keys(registry.devices || {});
                var checkedIn = keys.map(function (key) { return registry.devices[key]; })
                    .find(function (device) {
                        if (!device || !device.lastSeenUtc || !device.agentVersion) return false;
                        if (!policy) return true;
                        return device.management && device.management.lastPolicyId === policy.policyId &&
                            !fs.existsSync(policyOutboxFile);
                    });
                if (checkedIn) {
                    clearInterval(timer);
                    resolve({
                        ready: true,
                        address: server.address(),
                        dataRoot: dataRoot,
                        device: checkedIn
                    });
                } else if (Date.now() >= deadline) {
                    clearInterval(timer);
                    reject(new Error("Agent did not check in within 90 seconds."));
                }
            } catch (error) {
                if (Date.now() >= deadline) {
                    clearInterval(timer);
                    reject(new Error("Agent registry was not created within 90 seconds."));
                }
            }
        }, 1000);
    }).then(function (result) {
        console.log(JSON.stringify(result, null, 2));
    }).finally(function () {
        if (previousCredential) fs.writeFileSync(credentialPath, previousCredential);
        else if (fs.existsSync(credentialPath)) fs.unlinkSync(credentialPath);
        if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
        server.closeAllConnections();
        server.close();
    }).then(function () {
        process.exit(0);
    });
}).catch(function (error) {
    if (previousCredential) fs.writeFileSync(credentialPath, previousCredential);
    else if (fs.existsSync(credentialPath)) fs.unlinkSync(credentialPath);
    if (fs.existsSync(tokenPath)) fs.unlinkSync(tokenPath);
    console.error(error);
    process.exit(1);
});

"use strict";

var path = require("path");
var fs = require("fs");
var standalone = require("../server/standalone.js");

if (process.argv.indexOf("--live") === -1) {
    throw new Error("Live service E2E requires the explicit --live flag.");
}

var port = Number(process.env.SIRK_AGENT_E2E_PORT || 18080);
var dataRoot = path.resolve(process.env.SIRK_AGENT_E2E_DATA ||
    path.join(__dirname, "..", ".tmp", "agent-service-e2e"));
var agentRoot = path.join(process.env.ProgramData || "C:\\ProgramData", "SIRK", "Agent");
var configPath = path.join(agentRoot, "management.json");
var registryPath = path.join(dataRoot, "agent-registry.json");
var previousConfig = fs.existsSync(configPath) ? fs.readFileSync(configPath) : null;
var token = "sirk-local-e2e-only";

standalone.start({
    host: "127.0.0.1",
    port: port,
    dataRoot: dataRoot,
    agentToken: token
}).then(function (server) {
    var deadline = Date.now() + 60000;
    fs.writeFileSync(configPath + ".tmp", JSON.stringify({
        enabled: false,
        telemetryEndpoint: null,
        bearerToken: null,
        batchSize: 25,
        timeoutSeconds: 10,
        portalEnabled: true,
        portalEndpoint: "http://127.0.0.1:" + port + "/api/agent/v1/checkin",
        deviceToken: token
    }, null, 2) + "\n");
    fs.renameSync(configPath + ".tmp", configPath);

    return new Promise(function (resolve, reject) {
        var timer = setInterval(function () {
            try {
                var registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
                var keys = Object.keys(registry.devices || {});
                if (keys.length) {
                    clearInterval(timer);
                    resolve({
                        ready: true,
                        address: server.address(),
                        dataRoot: dataRoot,
                        device: registry.devices[keys[0]]
                    });
                } else if (Date.now() >= deadline) {
                    clearInterval(timer);
                    reject(new Error("Agent did not check in within 60 seconds."));
                }
            } catch (error) {
                if (Date.now() >= deadline) {
                    clearInterval(timer);
                    reject(new Error("Agent registry was not created within 60 seconds."));
                }
            }
        }, 1000);
    }).then(function (result) {
        console.log(JSON.stringify(result, null, 2));
    }).finally(function () {
        if (previousConfig) fs.writeFileSync(configPath, previousConfig);
        else if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
        server.close();
    });
}).catch(function (error) {
    if (previousConfig) fs.writeFileSync(configPath, previousConfig);
    else if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    console.error(error);
    process.exitCode = 1;
});

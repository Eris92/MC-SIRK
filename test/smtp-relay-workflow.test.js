"use strict";

var assert = require("assert");
var childProcess = require("child_process");
var fs = require("fs");
var path = require("path");
var integrationFactory = require("../server/core/integration-service.js");
var libraryFactory = require("../server/core/script-confirmation-library.js");
var executorFactory = require("../server/core/server-script-executor.js");

var root = path.resolve(__dirname, "..");
var state = { integrations: {} };
var secretState = {};
var integrations = integrationFactory.createIntegrationService({
    parent: {},
    settings: {
        read: function () { return state; },
        update: function (callback) { state = callback(state); return Promise.resolve(state); }
    },
    secrets: {
        get: function () { return secretState; },
        set: function (key, value) { secretState = value; }
    }
});

(async function () {
    var snapshot = await integrations.save({ siteadmin: 0xFFFFFFFF }, {
        integrations: { smtp: {
            host: "mailrelay.example.test",
            port: 25,
            defaultFrom: "automation@example.test",
            enableSsl: false,
            attachmentRoot: "C:\\SIRK\\Attachments",
            maxAttachmentMb: 20
        } }
    });
    assert.strictEqual(snapshot.configured.smtp, true);
    assert.strictEqual(snapshot.values.smtp.host, "mailrelay.example.test");
    assert.strictEqual(snapshot.values.smtp.maxAttachmentMb, 20);
    assert.throws(function () { return integrations.save({ siteadmin: 0xFFFFFFFF }, {
        integrations: { smtp: { host: "mail relay", port: 25, defaultFrom: "automation@example.test" } }
    }); }, /host is invalid/);

    var scriptsRoot = path.join(root, "seed", "MyScripts");
    var library = libraryFactory.createScriptLibrary({ fs: fs, path: path, root: scriptsRoot, readOnly: true, allowWrite: false });
    var scriptPath = "Mail/Send Relay Mail.ps1";
    var script = library.getScript(scriptPath, true);
    assert.ok(script, "SMTP Relay mail script must be available in My Scripts.");
    assert.strictEqual(script.variables.find(function (item) { return item.name === "Body"; }).multiline, true);
    assert.strictEqual(script.variables.find(function (item) { return item.name === "Attachments"; }).multiline, true);
    assert.ok(script.extraHeaders.indexOf("SirkWorkflow: RelayMailSend") >= 0);
    assert.ok(script.extraHeaders.indexOf("SirkSystemCredential: SMTP") >= 0);

    var source = fs.readFileSync(path.join(scriptsRoot, "Mail", "Send Relay Mail.ps1"), "utf8");
    assert.ok(/StartsWith\(\$rootPrefix/.test(source), "Attachments must stay inside the configured server root.");
    assert.ok(/MYSCRIPTS_SMTP_MAX_ATTACHMENT_BYTES/.test(source), "Total attachment size must be bounded.");
    assert.ok(/IsBodyHtml/.test(source) && /MailMessage/.test(source) && /SmtpClient/.test(source));
    assert.strictEqual(source.indexOf("Write-Host"), -1, "Mail content and addresses must not be copied to console output.");

    var assignmentNamespace = "script-secrets.myscripts.system-credentials";
    var assignments = {}; assignments[scriptPath.toLowerCase()] = ["smtp"];
    var captured = null;
    var originalExecFile = childProcess.execFile;
    childProcess.execFile = function (file, args, options, callback) {
        captured = { file: file, args: args, options: options };
        callback(null, '{"success":true}', "");
    };
    var executor = executorFactory.createServerScriptExecutor({
        context: {
            fs: fs,
            nativePath: path,
            pluginRoot: root,
            settings: { read: function () { return { modules: { myscripts: { runTimeoutSeconds: 60 } } }; } },
            secrets: { get: function (name) { return name === assignmentNamespace ? assignments : {}; } },
            integrations: {
                configured: function () { return { smtp: true }; },
                get: function () { return snapshot.values.smtp; }
            }
        },
        library: library,
        admin: { secretValues: function () { return {}; } },
        assignmentNamespace: assignmentNamespace
    });
    try {
        await executor.execute({
            scriptPath: scriptPath,
            scriptHash: script.hash,
            variableValues: { To: "recipient@example.test", Subject: "Test", Body: "Line 1\nLine 2", BodyAsHtml: false }
        }, { id: "smtp-test", requester: { name: "Admin" } });
    } finally { childProcess.execFile = originalExecFile; }
    assert.strictEqual(captured.options.env.MYSCRIPTS_SMTP_SERVER, "mailrelay.example.test");
    assert.strictEqual(captured.options.env.MYSCRIPTS_SMTP_PORT, "25");
    assert.strictEqual(captured.options.env.MYSCRIPTS_SMTP_FROM, "automation@example.test");
    assert.strictEqual(captured.options.env.MYSCRIPTS_SMTP_ATTACHMENT_ROOT, "C:\\SIRK\\Attachments");
    assert.strictEqual(captured.options.env.MYSCRIPTS_SMTP_MAX_ATTACHMENT_BYTES, String(20 * 1024 * 1024));
    console.log("SMTP Relay integration, multiline mail and bounded attachments: OK");
})().catch(function (error) {
    console.error(error && error.stack || error);
    process.exitCode = 1;
});

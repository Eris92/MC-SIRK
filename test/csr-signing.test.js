"use strict";

// #407: CSR file input, upload staging, Enterprise CA execution contract and
// verified certificate download artifact.

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");

var root = path.resolve(__dirname, "..");
var fixtures = path.join(root, "test", "fixtures", "csr");
var csrService = require(path.join(root, "server/core/csr-service.js"));
var artifactFactory = require(path.join(root, "server/core/artifact-service.js"));
var temporary = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-csr-"));

var rsaPem = fs.readFileSync(path.join(fixtures, "rsa.csr"));
var rsaDer = fs.readFileSync(path.join(fixtures, "rsa.der"));
var ecPem = fs.readFileSync(path.join(fixtures, "ec.csr"));
var issued = fs.readFileSync(path.join(fixtures, "rsa-issued.cer"));

// 1. Parser contract: PEM and DER PKCS#10, proof-of-possession, bounded size.
var parsedPem = csrService.parseCsr(rsaPem);
var parsedDer = csrService.parseCsr(rsaDer);
assert.ok(parsedPem.spki.equals(parsedDer.spki), "PEM and DER encodings of the same CSR are equivalent");
assert.ok(/^-----BEGIN NEW CERTIFICATE REQUEST-----\r\n/.test(parsedPem.pem), "normalized PEM is produced for certreq");
assert.strictEqual(csrService.parseCsr(ecPem).algorithm, "1.2.840.10045.4.3.2", "ECDSA P-256 CSR is accepted");
function rejects(input, pattern, message) {
    assert.throws(function () { csrService.parseCsr(input); }, pattern, message);
}
rejects(Buffer.alloc(0), /empty/, "empty file rejected");
rejects(Buffer.from("random text that is not a CSR"), /not a valid PKCS#10/, "random file rejected");
rejects(Buffer.concat([rsaDer, Buffer.alloc(csrService.MAX_CSR_BYTES)]), /larger than 32 KB/, "oversized file rejected");
rejects(Buffer.concat([rsaDer, Buffer.from([0])]), /not a valid PKCS#10/, "trailing data rejected");
var tampered = Buffer.from(rsaDer);
tampered[tampered.length - 4] ^= 0x01;
rejects(tampered, /signature is invalid/, "tampered signature rejected");
rejects(issued, /not a valid PKCS#10/, "a certificate is not accepted as CSR");
rejects(Buffer.from("-----BEGIN CERTIFICATE REQUEST-----\nAAAA\u0000\n-----END CERTIFICATE REQUEST-----\n"), /not a valid PKCS#10/, "NUL in PEM rejected");

// 2. Issued-certificate verification: key match and expected issuer, fail closed.
var verified = csrService.verifyIssued(issued, parsedPem, "Example Issuing CA");
assert.ok(verified.der.length > 0 && verified.serialNumber, "matching certificate is accepted");
assert.throws(function () { csrService.verifyIssued(issued, parsedPem, "Other CA"); }, /not issued by the configured CA/);
assert.throws(function () { csrService.verifyIssued(issued, csrService.parseCsr(ecPem), ""); }, /does not match the CSR public key/);
assert.throws(function () { csrService.verifyIssued(Buffer.from("pending"), parsedPem, ""); }, /not a valid certificate/);

// 3. Script metadata: VariableFile directive creates a typed file input.
var libraryFactory = require(path.join(root, "server/core/script-confirmation-library.js"));
var library = libraryFactory.createScriptLibrary({ fs: fs, path: path, root: path.join(root, "seed", "MyScripts"), readOnly: true, allowWrite: false });
var script = library.getScript("CA/Sign CSR.ps1", true);
assert.ok(script, "CA/Sign CSR.ps1 is discovered in the canonical My Scripts root");
var fileVariable = script.variables.filter(function (variable) { return variable.name === "CsrFile"; })[0];
assert.ok(fileVariable && fileVariable.control === "file" && fileVariable.fileFormat === "csr" && fileVariable.required === true, "CsrFile is a required csr file input");
assert.strictEqual(fileVariable.defaultValue, "", "a file input never exposes a default value");
var signSource = fs.readFileSync(path.join(root, "seed", "MyScripts", "CA", "Sign CSR.ps1"), "utf8");
assert.ok(/^# SirkSystemCredential: CA$/m.test(signSource), "script binds the CA integration");
assert.ok(signSource.indexOf("$arguments = @('-submit', '-q', '-config', $caConfig, '-attrib'") >= 0 && signSource.indexOf("& $certreq @arguments") >= 0, "certreq receives separate arguments");
assert.ok(!/Invoke-Expression|cmd\.exe|Start-Process|ExecutionPolicy|-----BEGIN|Get-Content\s+\$csrPath|Export-Pfx/i.test(signSource), "no shell string, CSR echo or key export");
assert.ok(/pending\|taken under submission/.test(signSource) && /denied/.test(signSource), "pending and denied answers fail closed");
assert.ok(/finally \{\s*if \(Test-Path -LiteralPath \$work\)/.test(signSource), "script cleans its working directory");

// 4. Upload staging: server-generated names, owner/script/variable binding, cleanup.
var store = artifactFactory.createArtifactService({ fs: fs, path: path, dataRoot: temporary });
var token = store.stageUpload({ ownerId: "user/domain/a", scriptPath: "CA/Sign CSR.ps1", variable: "CsrFile", format: "csr", data: Buffer.from(parsedPem.pem) });
assert.ok(/^upload-[a-f0-9]{48}$/.test(token), "token is server generated");
var expected = { ownerId: "user/domain/a", scriptPath: "CA/Sign CSR.ps1", variable: "CsrFile" };
assert.strictEqual(fs.readFileSync(store.resolveUpload(token, expected).path, "utf8"), parsedPem.pem);
[
    { ownerId: "user/domain/b", scriptPath: "CA/Sign CSR.ps1", variable: "CsrFile" },
    { ownerId: "user/domain/a", scriptPath: "Other.ps1", variable: "CsrFile" },
    { ownerId: "user/domain/a", scriptPath: "CA/Sign CSR.ps1", variable: "Other" }
].forEach(function (other) {
    assert.throws(function () { store.resolveUpload(token, other); }, /not found or expired/, "upload is bound to owner, script and variable");
});
assert.throws(function () { store.resolveUpload("../" + token, expected); }, /not found/, "path traversal token rejected");
assert.throws(function () { store.create(token, { type: "certificate", data: Buffer.from("x") }); }, /Invalid artifact identifier/, "request ids cannot address staging directories");
if (process.platform !== "win32") {
    assert.strictEqual(fs.statSync(path.join(store.root, token)).mode & 0o777, 0o700, "staging directory is private");
    assert.strictEqual(fs.statSync(path.join(store.root, token, "input.bin")).mode & 0o777, 0o600, "staged file is private");
}
store.discardUpload(token);
assert.ok(!fs.existsSync(path.join(store.root, token)), "discard removes the upload");
var shortLived = artifactFactory.createArtifactService({ fs: fs, path: path, dataRoot: temporary, retentionMs: 60 * 1000 });
var expiring = shortLived.stageUpload({ ownerId: "u", scriptPath: "s", variable: "v", format: "csr", data: Buffer.from("x") });
var metadataPath = path.join(shortLived.root, expiring, "upload.json");
var metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));
metadata.createdAt -= 2 * 60 * 1000;
fs.writeFileSync(metadataPath, JSON.stringify(metadata));
assert.throws(function () { shortLived.resolveUpload(expiring, { ownerId: "u", scriptPath: "s", variable: "v" }); }, /expired/, "expired upload fails closed");
shortLived.discardUpload(expiring);

// 5. Certificate artifacts are request scoped and always attachments.
var artifact = store.create("request123", { type: "certificate", data: verified.der, fileName: "certificate-1.cer" });
var resolved = store.resolve("request123", artifact.id);
assert.strictEqual(resolved.contentType, "application/pkix-cert");
assert.strictEqual(artifact.label, "Download certificate");
var adminSource = fs.readFileSync(path.join(root, "admin.js"), "utf8");
assert.ok(adminSource.indexOf('artifact.type === "pdf" && String(req && req.query && req.query.mode') >= 0, "only PDFs may be opened inline");
assert.ok(adminSource.indexOf("context.approval.getRequest(user, requestId)") >= 0, "artifact download keeps request authorization");

// 6. Request API: validates and stages before the CA is invoked.
var automationSource = fs.readFileSync(path.join(root, "server/modules/automation/index.js"), "utf8");
assert.ok(automationSource.indexOf("var stagedFiles = stageFileInputs(user, requestedScript, value.files, payload.variableValues);") >= 0, "uploads are staged by the request owner");
assert.ok(automationSource.indexOf("csrService.parseCsr(data).pem") >= 0, "CSR is validated before staging");

// 7. Shared dialog and renderer contracts.
var dialog = fs.readFileSync(path.join(root, "public/shared/ui/parameter-dialog.js"), "utf8");
assert.ok(dialog.indexOf('"assetmulti", "file"]') >= 0 && dialog.indexOf('control.type = "file"') >= 0, "shared dialog renders a file control");
assert.ok(dialog.indexOf("Select exactly one file.") >= 0 && dialog.indexOf("maxBytes: 32 * 1024") >= 0, "dialog blocks multiple and oversized files");
assert.ok(dialog.indexOf('control.setAttribute("multiple"') < 0, "file control is single-file");
var client = fs.readFileSync(path.join(root, "public/modules/automation/index.js"), "utf8");
assert.ok(client.indexOf("return splitFileValues(values).then(function (prepared) {") >= 0 && client.indexOf("files: prepared.files") >= 0, "file is read only on submit");
assert.ok(client.indexOf('download.textContent = "Download certificate"') >= 0 && client.indexOf('artifactUrl(artifact, "download")') >= 0, "Results offers a certificate download");

// 8. Executor end-to-end with a PowerShell test double (Linux CI).
function executorRun() {
    if (process.platform === "win32") return Promise.resolve();
    var executorFactory = require(path.join(root, "server/core/server-script-executor.js"));
    var trace = path.join(temporary, "trace.txt");
    process.env.SIRK_PLATFORM_POWERSHELL = path.join(fixtures, "fake-powershell.sh");
    process.env.SIRK_FAKE_TRACE = trace;
    process.env.SIRK_FAKE_CERT = path.join(fixtures, "rsa-issued.cer");
    var integrations = { ca: { config: "ca01.corp.local\\Example Issuing CA", template: "WebServer" } };
    var context = {
        fs: fs, path: path, nativePath: path, dataRoot: temporary, pluginRoot: root,
        settings: { read: function () { return { modules: { myscripts: { runTimeoutSeconds: 30 } } }; } },
        integrations: {
            get: function (name) { return integrations[name] || {}; },
            configured: function () { return { ca: !!integrations.ca.config }; }
        },
        secrets: { get: function () { return {}; } }
    };
    var executor = executorFactory.createServerScriptExecutor({
        context: context,
        library: library,
        artifacts: store,
        admin: { systemProfiles: function () { return ["ca"]; }, secretValues: function () { return {}; } }
    });
    var requester = { id: "user/domain/a", name: "a" };
    function stage(pem, owner) {
        return store.stageUpload({ ownerId: owner || requester.id, scriptPath: script.path, variable: "CsrFile", format: "csr", data: Buffer.from(pem) });
    }
    function execute(mode, upload, requestId) {
        process.env.SIRK_FAKE_MODE = mode;
        return executor.execute({ scriptPath: script.path, scriptHash: script.hash, variableValues: { CsrFile: upload } }, { id: requestId, requester: requester });
    }
    function leftovers() {
        return fs.readdirSync(store.root).filter(function (name) { return /^(upload|work)-/.test(name); });
    }

    var first = stage(parsedPem.pem);
    return execute("issue", first, "reqissue01").then(function (result) {
        assert.ok(fs.readFileSync(trace, "utf8").indexOf(first) >= 0, "script received the server-controlled staged path");
        assert.strictEqual(result.artifacts.length, 1);
        assert.strictEqual(result.artifacts[0].type, "certificate");
        var download = store.resolve("reqissue01", result.artifacts[0].id);
        assert.ok(csrService.verifyIssued(fs.readFileSync(download.path), parsedPem, "Example Issuing CA"), "downloaded certificate matches CSR and CA");
        assert.strictEqual(result.output.indexOf("BEGIN"), -1, "CSR/certificate body never reaches output");
        assert.deepStrictEqual(leftovers(), [], "upload and workspace removed after success");
        return execute("pending", stage(parsedPem.pem), "reqpending1").then(function () { assert.fail("pending must fail"); }, function (error) {
            assert.match(error.message, /pending/);
            assert.ok(!fs.existsSync(path.join(store.root, "reqpending1")), "no artifact for pending");
            assert.deepStrictEqual(leftovers(), [], "cleanup after CA pending");
        });
    }).then(function () {
        return execute("silent", stage(parsedPem.pem), "reqsilent01").then(function () { assert.fail("missing certificate must fail"); }, function (error) {
            assert.match(error.message, /No certificate was issued/);
            assert.deepStrictEqual(leftovers(), [], "cleanup when CA returned nothing");
        });
    }).then(function () {
        return execute("issue", stage(ecPem), "reqmismatch").then(function () { assert.fail("mismatched certificate must fail"); }, function (error) {
            assert.match(error.message, /does not match the CSR public key/);
            assert.ok(!fs.existsSync(path.join(store.root, "reqmismatch")), "no artifact for mismatched certificate");
            assert.deepStrictEqual(leftovers(), [], "cleanup after verification failure");
        });
    }).then(function () {
        integrations.ca.config = "ca01.corp.local\\Another CA";
        return execute("issue", stage(parsedPem.pem), "reqissuer01").then(function () { assert.fail("unexpected issuer must fail"); }, function (error) {
            assert.match(error.message, /not issued by the configured CA/);
            integrations.ca.config = "ca01.corp.local\\Example Issuing CA";
        });
    }).then(function () {
        var foreign = stage(parsedPem.pem, "user/domain/other");
        return execute("issue", foreign, "reqforeign1").then(function () { assert.fail("foreign upload must fail"); }, function (error) {
            assert.match(error.message, /not found or expired/, "another user's upload cannot be used");
            store.discardUpload(foreign);
        });
    }).then(function () {
        return execute("issue", "", "reqmissing1").then(function () { assert.fail("missing file must fail"); }, function (error) {
            assert.match(error.message, /required/);
        });
    });
}

// 9. Request API functional negatives (runtime with My Scripts module).
function requestApi() {
    var data = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-csr-api-"));
    var admin = { _id: "user/domain/admin", name: "admin", siteadmin: 0xFFFFFFFF };
    var web = { users: {}, userGroups: {} };
    web.users[admin._id] = admin;
    var runtime = require(path.join(root, "server/core/runtime.js")).createRuntime({ parent: { fs: fs, path: path, pluginPath: root, parent: { datapath: data, webserver: web } }, pluginRoot: root, source: {} });
    var module = runtime.modules.myscripts;
    var csr = rsaDer.toString("base64");
    function post(body) {
        return Promise.resolve().then(function () { return module.apiPost("request", { body: body }, admin); });
    }
    function denied(body, pattern) {
        return post(body).then(function () { assert.fail("request must be rejected"); }, function (error) { assert.match(error.message, pattern); });
    }
    function uploads() {
        var directory = path.join(data, "sirk-platform-data", "artifacts");
        return fs.existsSync(directory) ? fs.readdirSync(directory).filter(function (name) { return /^upload-/.test(name); }) : [];
    }
    var base = "CA/Sign CSR.ps1";
    return Promise.resolve(module.initialize()).then(function () {
        return denied({ scriptPath: base, variableValues: { CsrFile: "/etc/passwd" } }, /CSR file is required/);
    }).then(function () {
        return denied({ scriptPath: base, files: { CsrFile: { name: "..\\x.csr", data: csr } } }, /Invalid file name/);
    }).then(function () {
        return denied({ scriptPath: base, files: { CsrFile: { name: "x\u0000.csr", data: csr } } }, /Invalid file name/);
    }).then(function () {
        return denied({ scriptPath: base, files: { CsrFile: [{ name: "a.csr", data: csr }, { name: "b.csr", data: csr }] } }, /exactly one file/);
    }).then(function () {
        return denied({ scriptPath: base, files: { CsrFile: { name: "x.csr", data: Buffer.from("junk").toString("base64") } } }, /not a valid PKCS#10/);
    }).then(function () {
        return denied({ scriptPath: base, files: { CsrFile: { name: "x.csr", data: Buffer.alloc(40 * 1024).toString("base64") } } }, /larger than 32 KB/);
    }).then(function () {
        return denied({ scriptPath: base, files: { Other: { name: "x.csr", data: csr } } }, /Unexpected file input/);
    }).then(function () {
        assert.deepStrictEqual(uploads(), [], "rejected uploads are never staged");
        return post({ scriptPath: base, files: { CsrFile: { name: "x.csr", data: csr } } });
    }).then(function (response) {
        var token = response.request.payload.variableValues.CsrFile;
        assert.ok(/^upload-[a-f0-9]{48}$/.test(token), "request carries only the staging token");
        assert.strictEqual(JSON.stringify(response.request).indexOf(csr.slice(0, 40)), -1, "CSR body is not stored in the request");
        assert.deepStrictEqual(uploads(), [token]);
        fs.rmSync(data, { recursive: true, force: true });
    });
}

executorRun().then(requestApi).then(function () {
    fs.rmSync(temporary, { recursive: true, force: true });
    console.log("CSR file input, upload staging, Enterprise CA execution and verified certificate download: OK");
}).catch(function (error) {
    console.error(error);
    process.exit(1);
});

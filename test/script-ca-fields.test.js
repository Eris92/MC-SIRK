"use strict";

// Per-script CA fields in the definition editor: # SirkCaTemplate and
// # SirkRdpSigningThumbprint are shown, saved, validated and removed when empty.

var assert = require("assert");
var fs = require("fs");
var os = require("os");
var path = require("path");
var libraryFactory = require("../server/core/script-confirmation-library.js");

var root = path.resolve(__dirname, "..");
var scripts = fs.mkdtempSync(path.join(os.tmpdir(), "sirk-ca-fields-"));
try {
    fs.writeFileSync(path.join(scripts, "rdp.ps1"), [
        "#EN Signed RDP",
        "# SirkSystemCredential: CA",
        "# SirkRdpSigningThumbprint:",
        "# SirkCaTemplate: RDP Signing",
        "",
        "# documentation comment",
        "Write-Output 'rdp'"
    ].join("\r\n"), "utf8");
    fs.writeFileSync(path.join(scripts, "plain.ps1"), ["#EN Plain", "# SirkSystemCredential: CA", "", "# notes", "Write-Output 'plain'"].join("\r\n"), "utf8");
    var library = libraryFactory.createScriptLibrary({ fs: fs, path: path, root: scripts, readOnly: true, allowWrite: true });

    var definition = library.getDefinition("rdp.ps1");
    assert.strictEqual(definition.caTemplate, "RDP Signing", "template visible in the editor");
    assert.strictEqual(definition.rdpSigningThumbprint, "", "empty thumbprint visible as empty");

    function save(file, extra) {
        var current = library.getDefinition(file);
        return library.saveDefinition(file, Object.assign({ locales: current.locales, approvalLevels: [], variables: [], secretVariables: [] }, extra));
    }

    var saved = save("rdp.ps1", { caTemplate: "Code Sign", rdpSigningThumbprint: "ab cd ef 01 23 45 67 89 ab cd ef 01 23 45 67 89 ab cd ef 01" });
    assert.strictEqual(saved.definition.caTemplate, "Code Sign");
    assert.strictEqual(saved.definition.rdpSigningThumbprint, "ABCDEF0123456789ABCDEF0123456789ABCDEF01", "thumbprint normalized");
    var text = fs.readFileSync(path.join(scripts, "rdp.ps1"), "utf8");
    assert.strictEqual((text.match(/^# SirkCaTemplate: Code Sign\r?$/gm) || []).length, 1, "template persisted once");
    assert.strictEqual((text.match(/SirkRdpSigningThumbprint/g) || []).length, 1, "thumbprint persisted once");
    assert.ok(text.indexOf("# SirkSystemCredential: CA") >= 0, "other Sirk headers preserved");
    assert.ok(library.getScript("rdp.ps1", true).extraHeaders.indexOf("SirkCaTemplate: Code Sign") >= 0, "runtime sees the new header");

    saved = save("rdp.ps1", { caTemplate: "", rdpSigningThumbprint: "" });
    text = fs.readFileSync(path.join(scripts, "rdp.ps1"), "utf8");
    assert.ok(!/SirkCaTemplate|SirkRdpSigningThumbprint/.test(text), "empty values remove the header lines (global default applies)");

    saved = save("plain.ps1", { caTemplate: "WebServer" });
    text = fs.readFileSync(path.join(scripts, "plain.ps1"), "utf8");
    assert.ok(/^# SirkCaTemplate: WebServer\r?$/m.test(text), "new header added");

    var before = fs.readFileSync(path.join(scripts, "plain.ps1"), "utf8");
    assert.throws(function () { save("plain.ps1", { caTemplate: "bad;name" }); }, /SirkCaTemplate/);
    assert.throws(function () { save("plain.ps1", { rdpSigningThumbprint: "1234" }); }, /SirkRdpSigningThumbprint/);
    assert.strictEqual(fs.readFileSync(path.join(scripts, "plain.ps1"), "utf8"), before, "invalid values write nothing");

    saved = save("plain.ps1", {});
    assert.strictEqual(saved.definition.caTemplate, "WebServer", "callers without the fields keep the header");
} finally {
    fs.rmSync(scripts, { recursive: true, force: true });
}

var editor = fs.readFileSync(path.join(root, "public/shared/ui/script-tools.js"), "utf8");
assert.ok(editor.indexOf("caTemplate: caTemplate.value") >= 0 && editor.indexOf("rdpSigningThumbprint: caThumbprint.value") >= 0, "definition editor shows and saves both fields");

console.log("Per-script CA fields in the definition editor: OK");

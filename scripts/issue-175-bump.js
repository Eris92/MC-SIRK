"use strict";

var fs = require("fs");
var next = "0.1.1-dev.12";
var previous = "0.1.1-dev.11";
var runtimeSha = "50e02d4c574cb91f01a4d306fc94d48469288fea";

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, value) { fs.writeFileSync(file, value, "utf8"); }
function replaceOne(text, pattern, replacement, label) {
    var nextText = text.replace(pattern, replacement);
    if (nextText === text) throw new Error("Replacement not found: " + label);
    return nextText;
}

var pkg = JSON.parse(read("package.json"));
pkg.version = next;
write("package.json", JSON.stringify(pkg, null, 2) + "\n");

var config = JSON.parse(read("config.json"));
config.version = next;
write("config.json", JSON.stringify(config, null, 2) + "\n");

var readme = read("README.md");
readme = replaceOne(readme, "# SIRK Management Platform " + previous, "# SIRK Management Platform " + next, "README title");
readme = replaceOne(readme, "docs/releases/" + previous + ".md", "docs/releases/" + next + ".md", "README current notes");
write("README.md", readme);

var state = read("docs/PROJECT-STATE.md");
state = replaceOne(state, /Current version: `[^`]+`/, "Current version: `" + next + "`", "project current version");
state = replaceOne(state, /package\.json -> [^\n]+/, "package.json -> " + next, "project package version");
state = replaceOne(state, /config\.json  -> [^\n]+/, "config.json  -> " + next, "project config version");
state = replaceOne(state, /Aktualne development notes: `docs\/releases\/[^`]+`\./, "Aktualne development notes: `docs/releases/" + next + ".md`.", "project notes");
write("docs/PROJECT-STATE.md", state);

var releases = read("docs/releases/README.md");
var marker = "Aktualna linia development:\n\n";
var bullet = "- [`" + next + "`](" + next + ".md) — bieżąca rewizja development z nieprzezroczystym, theme-safe surface dialogu Move Request po real smoke;\n";
if (releases.indexOf(bullet) < 0) releases = replaceOne(releases, marker, marker + bullet, "release index insertion");
releases = releases.replace("- [`" + previous + "`](" + previous + ".md) — bieżąca rewizja development", "- [`" + previous + "`](" + previous + ".md) — poprzednia rewizja development");
write("docs/releases/README.md", releases);

var changelog = read("changelog.md");
var changelogEntry = "## " + next + " — 2026-08-08\n\n" +
    "- Bump the pre-1.0 development revision so MeshCentral update detection installs the Move Request dialog surface fix from current `main`.\n" +
    "- Keep the existing native `MeshThemeAdapter.card()` ownership while guaranteeing an opaque dialog background through Bootstrap card/body tokens with a Classic/system `Canvas` fallback.\n" +
    "- Preserve Move Request submit/backend semantics and the existing #127 pending/success/error lifecycle.\n" +
    "- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.\n\n" +
    "Current development notes: `docs/releases/" + next + ".md`.\n\n";
if (changelog.indexOf("## " + next) < 0) changelog = replaceOne(changelog, "# Changelog\n\n", "# Changelog\n\n" + changelogEntry, "changelog insertion");
write("changelog.md", changelog);

var history = JSON.parse(read("version-history.json"));
if (!history.some(function (item) { return item.version === next; })) {
    history.unshift({
        version: next,
        date: "2026-08-08",
        changes: [
            "Bump the pre-1.0 development revision so MeshCentral update detection installs the Move Request dialog surface fix from current main.",
            "Guarantee an opaque Move Request dialog surface while preserving native MeshThemeAdapter card ownership and host theme tokens.",
            "Preserve Move Request submit/backend behavior and the existing guarded status lifecycle.",
            "Keep the change as a development revision below 1.0.0 with no automatic tag or GitHub Release."
        ]
    });
}
write("version-history.json", JSON.stringify(history, null, 2) + "\n");

var note = "# MC-SIRK " + next + " — development revision\n\n" +
    "Status: **development pre-1.0, not a product release**.\n\n" +
    "This revision exposes the Move Request dialog surface correction from PR #174 to MeshCentral update detection.\n\n" +
    "## Included runtime baseline\n\n" +
    "- The `Move Request` modal keeps the existing native `MeshThemeAdapter.card()` mapping.\n" +
    "- The dialog now has an opaque theme-safe fallback surface using Bootstrap card/body tokens, with a Classic/system `Canvas` fallback driven by host light/dark signals.\n" +
    "- Overlay dimming, inputs, buttons, submit guards and backend/Approval semantics remain unchanged.\n\n" +
    "## Version policy\n\n" +
    "`" + next + "` remains below `1.0.0`. It does not open the product release gate and does not create a tag or GitHub Release.\n\n" +
    "Runtime implementation baseline: PR #174, `main` commit `" + runtimeSha + "`.\n";
write("docs/releases/" + next + ".md", note);

console.log("Prepared " + next + " metadata bump.");

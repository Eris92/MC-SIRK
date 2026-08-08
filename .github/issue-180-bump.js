"use strict";

var fs = require("fs");
var oldVersion = "0.1.1-dev.12";
var nextVersion = "0.1.1-dev.13";
var runtimeCommit = "4b7c30b59cfa95f60ae63a225c1ce8617556faac";

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, content) { fs.writeFileSync(file, content, "utf8"); }
function replaceRequired(content, from, to, file) {
    if (content.indexOf(from) < 0) throw new Error(file + ": missing expected text: " + from);
    return content.replace(from, to);
}

var packageJson = JSON.parse(read("package.json"));
packageJson.version = nextVersion;
write("package.json", JSON.stringify(packageJson, null, 2) + "\n");

var config = JSON.parse(read("config.json"));
config.version = nextVersion;
write("config.json", JSON.stringify(config, null, 2) + "\n");

var readme = read("README.md");
readme = replaceRequired(readme, "# SIRK Management Platform " + oldVersion, "# SIRK Management Platform " + nextVersion, "README.md");
readme = replaceRequired(readme, "[Aktualne development notes](docs/releases/" + oldVersion + ".md)", "[Aktualne development notes](docs/releases/" + nextVersion + ".md)", "README.md");
write("README.md", readme);

var state = read("docs/PROJECT-STATE.md");
state = replaceRequired(state, "Current version: `" + oldVersion + "`", "Current version: `" + nextVersion + "`", "docs/PROJECT-STATE.md");
state = replaceRequired(state, "package.json -> " + oldVersion, "package.json -> " + nextVersion, "docs/PROJECT-STATE.md");
state = replaceRequired(state, "config.json  -> " + oldVersion, "config.json  -> " + nextVersion, "docs/PROJECT-STATE.md");
state = replaceRequired(state, "Aktualne development notes: `docs/releases/" + oldVersion + ".md`.", "Aktualne development notes: `docs/releases/" + nextVersion + ".md`.", "docs/PROJECT-STATE.md");
write("docs/PROJECT-STATE.md", state);

var releaseIndex = read("docs/releases/README.md");
var marker = "Aktualna linia development:\n\n";
var oldBullet = "- [`" + oldVersion + "`](" + oldVersion + ".md) — bieżąca rewizja development z nieprzezroczystym, theme-safe surface dialogu Move Request po real smoke;";
var previousBullet = "- [`" + oldVersion + "`](" + oldVersion + ".md) — poprzednia rewizja development z pierwszą próbą nieprzezroczystego surface dialogu Move Request;";
releaseIndex = replaceRequired(releaseIndex, oldBullet, previousBullet, "docs/releases/README.md");
releaseIndex = replaceRequired(releaseIndex, marker, marker + "- [`" + nextVersion + "`](" + nextVersion + ".md) — bieżąca rewizja development z opacity-safe surface dialogu Move Request po real dev.12 re-smoke;\n", "docs/releases/README.md");
write("docs/releases/README.md", releaseIndex);

var changelog = read("changelog.md");
var section = "## " + nextVersion + " — 2026-08-08\n\n" +
    "- Bump the pre-1.0 development revision so MeshCentral update detection installs the opacity-safe Move Request dialog follow-up from current `main`.\n" +
    "- Preserve native `MeshThemeAdapter.card()` ownership while compositing the host card/body token layer over an always-opaque `Canvas` base, so transparent or alpha host card tokens cannot expose the device page.\n" +
    "- Preserve Move Request submit/backend semantics and the existing #127 pending/success/error lifecycle.\n" +
    "- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.\n\n" +
    "Current development notes: `docs/releases/" + nextVersion + ".md`.\n\n";
changelog = replaceRequired(changelog, "# Changelog\n\n", "# Changelog\n\n" + section, "changelog.md");
write("changelog.md", changelog);

var history = JSON.parse(read("version-history.json"));
history.unshift({
    version: nextVersion,
    date: "2026-08-08",
    changes: [
        "Bump the pre-1.0 development revision so MeshCentral update detection installs the opacity-safe Move Request dialog follow-up from current main.",
        "Composite native Move Request card/body surface tokens over an always-opaque Canvas base so transparent or alpha host tokens cannot expose the device page.",
        "Preserve Move Request submit/backend behavior and the existing guarded status lifecycle.",
        "Keep the change as a development revision below 1.0.0 with no automatic tag or GitHub Release."
    ]
});
write("version-history.json", JSON.stringify(history, null, 2) + "\n");

var note = "# MC-SIRK " + nextVersion + " — development revision\n\n" +
    "Status: **development pre-1.0, not a product release**.\n\n" +
    "This revision exposes the opacity-safe Move Request dialog follow-up from PR #179 to MeshCentral update detection after real `" + oldVersion + "` smoke proved that a single CSS custom-property fallback could still resolve to a transparent host token.\n\n" +
    "## Included runtime baseline\n\n" +
    "- `MeshThemeAdapter.card()` remains the native surface owner.\n" +
    "- The dialog composites the host Bootstrap card/body token layer over an always-opaque system `Canvas` base, so transparent or alpha host card tokens cannot reveal the underlying device page.\n" +
    "- Existing light/dark `color-scheme`, border, inputs, buttons and #127 submit/status lifecycle remain unchanged.\n" +
    "- No observer, timer, request loop, DOM repair layer or backend semantic change was added.\n\n" +
    "## Version policy\n\n" +
    "`" + nextVersion + "` remains below `1.0.0`. It does not open the product release gate and does not create a tag or GitHub Release.\n\n" +
    "Runtime implementation baseline: PR #179, `main` commit `" + runtimeCommit + "`.\n";
write("docs/releases/" + nextVersion + ".md", note);

console.log("Prepared " + nextVersion + " metadata.");

"use strict";

var fs = require("fs");

var oldVersion = "0.1.1-dev.14";
var newVersion = "0.1.1-dev.15";
var date = "2026-08-08";

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, value) { fs.writeFileSync(file, value, "utf8"); }
function replaceExact(file, before, after) {
    var source = read(file);
    if (source.indexOf(before) < 0) throw new Error("Expected source not found in " + file + ": " + before);
    write(file, source.replace(before, after));
}

["package.json", "config.json"].forEach(function (file) {
    var value = JSON.parse(read(file));
    if (value.version !== oldVersion) throw new Error(file + " expected " + oldVersion + " but found " + value.version);
    value.version = newVersion;
    write(file, JSON.stringify(value, null, 2) + "\n");
});

replaceExact("README.md", "# SIRK Management Platform " + oldVersion, "# SIRK Management Platform " + newVersion);
replaceExact("README.md", "[Aktualne development notes](docs/releases/" + oldVersion + ".md)", "[Aktualne development notes](docs/releases/" + newVersion + ".md)");

replaceExact("docs/PROJECT-STATE.md", "Current version: `" + oldVersion + "`", "Current version: `" + newVersion + "`");
replaceExact("docs/PROJECT-STATE.md", "package.json -> " + oldVersion + "\nconfig.json  -> " + oldVersion, "package.json -> " + newVersion + "\nconfig.json  -> " + newVersion);
replaceExact("docs/PROJECT-STATE.md", "Aktualne development notes: `docs/releases/" + oldVersion + ".md`.", "Aktualne development notes: `docs/releases/" + newVersion + ".md`.");

replaceExact(
    "docs/releases/README.md",
    "- [`0.1.1-dev.14`](0.1.1-dev.14.md) — bieżąca rewizja development z class-specific opaque surface dla `.mc-move-dialog.card` po real dev.13 re-smoke;",
    "- [`0.1.1-dev.15`](0.1.1-dev.15.md) — bieżąca rewizja development z natywnym `modal-content` dla Move Request i primary Submit po real dev.14 re-smoke;\n- [`0.1.1-dev.14`](0.1.1-dev.14.md) — poprzednia rewizja development z class-specific opaque surface dla `.mc-move-dialog.card` po real dev.13 re-smoke;"
);

var changelog = read("changelog.md");
var changelogHeader = "# Changelog\n\n";
if (changelog.indexOf(changelogHeader) !== 0) throw new Error("Unexpected changelog header");
if (changelog.indexOf("## " + newVersion) >= 0) throw new Error("Changelog already contains " + newVersion);
var section =
    "## " + newVersion + " — " + date + "\n\n" +
    "- Bump the pre-1.0 development revision so MeshCentral update detection installs the native Move Request modal-surface fix from current `main`.\n" +
    "- Map Modern Move Request to the host-native `modal-content` surface instead of `card`, eliminating inherited card hover transform/surface behavior without a plugin hover workaround.\n" +
    "- Use the existing `sirk-primary-action` semantic class so `Submit request` receives native primary/blue button treatment from `MeshThemeAdapter`.\n" +
    "- Preserve Classic `style10`, Move Request submit/backend semantics and the existing #127 pending/success/error lifecycle.\n" +
    "- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.\n\n" +
    "Current development notes: `docs/releases/" + newVersion + ".md`.\n\n";
write("changelog.md", changelogHeader + section + changelog.slice(changelogHeader.length));

var history = JSON.parse(read("version-history.json"));
if (!Array.isArray(history)) throw new Error("version-history.json must be an array");
if (history.some(function (item) { return item && item.version === newVersion; })) throw new Error("version-history already contains " + newVersion);
history.unshift({
    version: newVersion,
    date: date,
    changes: [
        "Bump the pre-1.0 development revision so MeshCentral update detection installs the native Move Request modal-surface fix from current main.",
        "Map Modern Move Request to host-native modal-content instead of card so host card hover transform and surface changes no longer apply.",
        "Use the existing semantic primary action mapping so Submit request receives native primary button treatment.",
        "Preserve Classic style10 and the existing guarded Move Request submit/status lifecycle.",
        "Keep the change as a development revision below 1.0.0 with no automatic tag or GitHub Release."
    ]
});
write("version-history.json", JSON.stringify(history, null, 2) + "\n");

var note = "# MC-SIRK " + newVersion + " — development revision\n\n" +
    "Status: **development pre-1.0, not a product release**.\n\n" +
    "This revision exposes the native Move Request modal-surface fix from PR #185 to MeshCentral update detection after real `" + oldVersion + "` smoke showed that using the native `card` class caused host card hover transform/surface behavior and secondary Submit styling.\n\n" +
    "## Included runtime baseline\n\n" +
    "- `MeshThemeAdapter` remains the single owner of native UI classes.\n" +
    "- Modern Move Request maps to host-native `modal-content` instead of `card`; no plugin hover neutralization or card-specific surface workaround remains.\n" +
    "- Classic Move Request remains on `style10` with the existing system-color fallback.\n" +
    "- `Submit request` uses the existing `sirk-primary-action` semantic class and therefore receives native primary/blue treatment from the shared button adapter.\n" +
    "- Move Request backend behavior and #127 pending/success/error lifecycle are unchanged.\n" +
    "- No observer, timer, request loop, DOM repair layer or new modal framework was added.\n\n" +
    "## Version policy\n\n" +
    "`" + newVersion + "` remains below `1.0.0`. It does not open the product release gate and does not create a tag or GitHub Release.\n\n" +
    "Runtime implementation baseline: PR #185, `main` commit `b652fb8532aa4f34ae9c2af875f5dab6a721f768`.\n";
write("docs/releases/" + newVersion + ".md", note);

console.log("Prepared " + newVersion + " metadata bump.");

"use strict";

var fs = require("fs");
var path = require("path");
var root = path.resolve(__dirname, "..");
var from = "0.1.1-dev.13";
var to = "0.1.1-dev.14";

function read(file) {
    return fs.readFileSync(path.join(root, file), "utf8");
}

function write(file, content) {
    fs.writeFileSync(path.join(root, file), content, "utf8");
}

function updateJsonVersion(file) {
    var value = JSON.parse(read(file));
    if (value.version !== from) throw new Error(file + " expected " + from + ", got " + value.version);
    value.version = to;
    write(file, JSON.stringify(value, null, 2) + "\n");
}

updateJsonVersion("package.json");
updateJsonVersion("config.json");

var readme = read("README.md");
if (readme.indexOf("# SIRK Management Platform " + from) < 0 || readme.indexOf("docs/releases/" + from + ".md") < 0) {
    throw new Error("README current version markers not found");
}
readme = readme.replace("# SIRK Management Platform " + from, "# SIRK Management Platform " + to)
    .replace("docs/releases/" + from + ".md", "docs/releases/" + to + ".md");
write("README.md", readme);

var state = read("docs/PROJECT-STATE.md");
if (state.indexOf("Current version: `" + from + "`") < 0) throw new Error("PROJECT-STATE current version marker not found");
state = state.split(from).join(to);
write("docs/PROJECT-STATE.md", state);

var releaseIndex = read("docs/releases/README.md");
var currentLine = "- [`0.1.1-dev.13`](0.1.1-dev.13.md) — bieżąca rewizja development z opacity-safe surface dialogu Move Request po real dev.12 re-smoke;";
if (releaseIndex.indexOf(currentLine) < 0) throw new Error("release index current line not found");
releaseIndex = releaseIndex.replace(currentLine,
    "- [`0.1.1-dev.14`](0.1.1-dev.14.md) — bieżąca rewizja development z class-specific opaque surface dla `.mc-move-dialog.card` po real dev.13 re-smoke;\n" +
    "- [`0.1.1-dev.13`](0.1.1-dev.13.md) — poprzednia rewizja development z opacity-safe layered surface dialogu Move Request;");
write("docs/releases/README.md", releaseIndex);

var changelog = read("changelog.md");
var changelogHeader = "# Changelog\n\n";
if (changelog.indexOf(changelogHeader) !== 0) throw new Error("unexpected changelog header");
var section =
    "## 0.1.1-dev.14 — 2026-08-08\n\n" +
    "- Bump the pre-1.0 development revision so MeshCentral update detection installs the `.mc-move-dialog.card` cascade fix from current `main`.\n" +
    "- Keep native `MeshThemeAdapter.card()` ownership while giving the real Modern class combination a higher-specificity opaque `Canvas` base and an optional Bootstrap card/body token layer.\n" +
    "- Avoid a single `background:` shorthand failure point; Classic `.mc-move-dialog.style10` keeps an explicit opaque system surface.\n" +
    "- Preserve Move Request submit/backend semantics and the existing #127 pending/success/error lifecycle.\n" +
    "- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.\n\n" +
    "Current development notes: `docs/releases/0.1.1-dev.14.md`.\n\n";
write("changelog.md", changelogHeader + section + changelog.slice(changelogHeader.length));

var history = JSON.parse(read("version-history.json"));
if (!Array.isArray(history) || !history.length || history[0].version !== from) {
    throw new Error("version-history current entry is not " + from);
}
history.unshift({
    version: to,
    date: "2026-08-08",
    changes: [
        "Bump the pre-1.0 development revision so MeshCentral update detection installs the latest Move Request dialog card-cascade fix from current main.",
        "Give the real .mc-move-dialog.card combination explicit higher-specificity opaque surface ownership while preserving MeshThemeAdapter.card().",
        "Separate the always-opaque Canvas base from the optional native card/body token layer and keep a Classic style10 opaque fallback.",
        "Preserve Move Request submit/backend behavior and the existing guarded status lifecycle.",
        "Keep the change as a development revision below 1.0.0 with no automatic tag or GitHub Release."
    ]
});
write("version-history.json", JSON.stringify(history, null, 2) + "\n");

var note =
    "# MC-SIRK 0.1.1-dev.14 — development revision\n\n" +
    "Status: **development pre-1.0, not a product release**.\n\n" +
    "This revision exposes the Move Request native-card cascade fix from PR #182 to MeshCentral update detection after real `0.1.1-dev.13` smoke showed that the actual `mc-move-dialog card` combination could still leave the host page visible through the dialog.\n\n" +
    "## Included runtime baseline\n\n" +
    "- `MeshThemeAdapter.card()` remains the native surface owner.\n" +
    "- `.mc-move-dialog` has an independent opaque system `Canvas` base.\n" +
    "- Modern `.mc-move-dialog.card` has higher-specificity surface ownership and uses Bootstrap card/body tokens only as an optional layer above that base.\n" +
    "- Classic `.mc-move-dialog.style10` keeps an explicit opaque system surface.\n" +
    "- The implementation no longer relies on one `background:` shorthand for both the native token layer and the opaque base.\n" +
    "- Inputs, buttons, border, light/dark signals and #127 submit/status lifecycle remain unchanged.\n" +
    "- No observer, timer, request loop, DOM repair layer or backend semantic change was added.\n\n" +
    "## Version policy\n\n" +
    "`0.1.1-dev.14` remains below `1.0.0`. It does not open the product release gate and does not create a tag or GitHub Release.\n\n" +
    "Runtime implementation baseline: PR #182, `main` commit `f8692992d6443b4b51cb6cc00e8f36d347e485de`.\n";
write("docs/releases/0.1.1-dev.14.md", note);

console.log("Prepared development metadata for " + to);

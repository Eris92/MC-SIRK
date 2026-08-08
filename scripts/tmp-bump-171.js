"use strict";
const fs = require("fs");
const oldVersion = "0.1.1-dev.10";
const newVersion = "0.1.1-dev.11";

function read(path) { return fs.readFileSync(path, "utf8"); }
function write(path, value) { fs.writeFileSync(path, value, "utf8"); }
function replaceOnce(path, before, after) {
    const source = read(path);
    if (!source.includes(before)) throw new Error(`Missing anchor in ${path}: ${before}`);
    write(path, source.replace(before, after));
}

for (const path of ["package.json", "config.json"]) {
    const data = JSON.parse(read(path));
    if (data.version !== oldVersion) throw new Error(`Unexpected version in ${path}: ${data.version}`);
    data.version = newVersion;
    write(path, JSON.stringify(data, null, 2) + "\n");
}

replaceOnce("README.md", `# SIRK Management Platform ${oldVersion}`, `# SIRK Management Platform ${newVersion}`);
replaceOnce("README.md", `docs/releases/${oldVersion}.md`, `docs/releases/${newVersion}.md`);
replaceOnce("docs/PROJECT-STATE.md", `Current version: \`${oldVersion}\``, `Current version: \`${newVersion}\``);
write("docs/PROJECT-STATE.md", read("docs/PROJECT-STATE.md").replaceAll(`docs/releases/${oldVersion}.md`, `docs/releases/${newVersion}.md`));

replaceOnce(
    "docs/releases/README.md",
    `- [\`${oldVersion}\`](${oldVersion}.md) — bieżąca rewizja development po corrective runtime smoke follow-up dla wspólnej osi first-column icons i kompaktowej kolumny View;`,
    `- [\`${newVersion}\`](${newVersion}.md) — bieżąca rewizja development po corrective UI smoke follow-up dla stabilnego indicator/icon geometry, wspólnego Approval list style i wycentrowanych Results actions;\n- [\`${oldVersion}\`](${oldVersion}.md) — poprzednia rewizja development po corrective runtime smoke follow-up dla wspólnej osi first-column icons i kompaktowej kolumny View;`
);

write(`docs/releases/${newVersion}.md`, `# MC-SIRK ${newVersion} — development revision

Status: **development pre-1.0, not a product release**.

This revision exposes the corrective UI smoke follow-up from PR #170 to MeshCentral update detection.

## Included runtime baseline

- Shared first-column navigation keeps the selected indicator, row origin and icon center on one stable horizontal geometry across expanded/collapsed states, including Quick.
- Approval Center reuses the same \`sirk-shared-list-*\` row/icon/label geometry as My Scripts and My Commands while preserving native MeshCentral selected-state mapping.
- Shared Results keeps \`View\` at 72 px and \`Actions\` at 120 px minimum while centering their headers and controls on the same horizontal/vertical axes.
- Existing permissions, execution behavior, selected-state logical owners, horizontal Results scrolling and runtime lifecycle are preserved.

## Version policy

\`${newVersion}\` remains below \`1.0.0\`. It does not open the product release gate and does not create a tag or GitHub Release.

Runtime implementation baseline: PR #170, \`main\` commit \`f12750feebf32e59b9bb2f17c67350d92e7402f2\`.
`);

const changelog = read("changelog.md");
if (!changelog.startsWith("# Changelog\n")) throw new Error("Unexpected changelog header");
const changelogSection = `# Changelog

## ${newVersion} — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the corrective UI smoke follow-up from current \`main\`.
- Keep selected first-column indicator distance and icon position stable across Collapse/Expand by using one 9 px primary inset and 44 px collapsed row geometry, including Quick and Approval Center.
- Make Approval Center consume the same shared list row/icon/label geometry as My Scripts/My Commands instead of separate provider/status spacing rules.
- Center shared Results \`View\` and \`Actions\` headers and controls while preserving their compact 72 px / 120 px width contract and local horizontal scrolling.
- Keep the revision below \`1.0.0\`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: \`docs/releases/${newVersion}.md\`.
`;
write("changelog.md", changelogSection + changelog.slice("# Changelog\n".length));

const history = JSON.parse(read("version-history.json"));
if (!history.length || history[0].version !== oldVersion) throw new Error("Unexpected version-history head");
history.unshift({
    version: newVersion,
    date: "2026-08-08",
    changes: [
        "Bump the pre-1.0 development revision so MeshCentral update detection installs the corrective UI smoke follow-up from current main.",
        "Keep first-column selected indicator distance, row origin and icon center stable across expanded/collapsed states, including Quick and Approval Center.",
        "Make Approval Center reuse the shared list geometry contract instead of separate provider/status row styling.",
        "Center View and Actions headers and controls while preserving the 72 px / 120 px Results width contract and horizontal scrolling.",
        "Keep the change as a development revision below 1.0.0 with no automatic tag or GitHub Release."
    ]
});
write("version-history.json", JSON.stringify(history, null, 2) + "\n");

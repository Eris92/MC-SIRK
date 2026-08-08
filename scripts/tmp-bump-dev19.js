"use strict";

const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");
const oldVersion = "0.1.1-dev.18";
const newVersion = "0.1.1-dev.19";

function file(name) { return path.join(root, name); }
function read(name) { return fs.readFileSync(file(name), "utf8"); }
function write(name, content) { fs.writeFileSync(file(name), content, "utf8"); }
function replaceCurrent(name) {
    const source = read(name);
    if (!source.includes(oldVersion)) throw new Error(`${name}: current version ${oldVersion} not found`);
    write(name, source.split(oldVersion).join(newVersion));
}

const pkg = JSON.parse(read("package.json")); pkg.version = newVersion; write("package.json", JSON.stringify(pkg, null, 2) + "\n");
const config = JSON.parse(read("config.json")); config.version = newVersion; write("config.json", JSON.stringify(config, null, 2) + "\n");
replaceCurrent("README.md");
replaceCurrent("docs/PROJECT-STATE.md");
replaceCurrent("docs/releases/README.md");

const changelog = read("changelog.md");
const changelogEntry = `## ${newVersion} - 2026-08-08\n\n- Deliver the Move Request #173 follow-up that delegates dialog presentation and lifecycle to MeshCentral's native \`setDialogMode(2, ...)\` owner instead of constructing a parallel plugin modal tree.\n- Reuse the host \`idx_dlgOkButton\`, \`idx_dlgCancelButton\` and close control so modal surface, hover and footer button styling are exactly host-native.\n- Keep guarded asynchronous Submit feedback in the same native dialog by intercepting the host OK click before \`dialogclose(1)\`, while preserving source/target group names and backend semantics.\n- No new background/opacity workaround, observer, timer, polling loop, modal framework, tag or GitHub Release.\n\n`;
if (!changelog.includes(`## ${newVersion}`)) write("changelog.md", changelogEntry + changelog);

const history = JSON.parse(read("version-history.json"));
if (!history.some((entry) => entry.version === newVersion)) {
    history.unshift({
        version: newVersion,
        date: "2026-08-08",
        changes: [
            "Bump the pre-1.0 development revision so MeshCentral update detection installs the Move Request native host dialog-manager fix from current main.",
            "Delegate Move Request presentation to the host setDialogMode lifecycle instead of building a parallel overlay/modal tree with copied Bootstrap classes.",
            "Reuse the host OK, Cancel and close controls while preserving guarded asynchronous pending/success/error feedback in the same dialog.",
            "Preserve source/target mesh metadata and backend semantics without new background workarounds, observers, timers, polling loops or modal frameworks.",
            "Keep the change as a development revision below 1.0.0 with no automatic tag or GitHub Release."
        ]
    });
}
write("version-history.json", JSON.stringify(history, null, 2) + "\n");

const note = `# MC-SIRK ${newVersion}\n\nStatus: development pre-1.0. No tag or GitHub Release.\n\n## Runtime included\n\n- PR #200 / commit \`d52da4844946dea26e0930885d6c487f02102add\`: Move Request now delegates dialog surface/footer/lifecycle to MeshCentral's native \`setDialogMode(2, ...)\` owner.\n- The plugin supplies only form/status content and reuses the host OK/Cancel/X controls.\n- The native OK control is relabeled to \`Submit request\`; its click is intercepted in capture phase so guarded async pending/success/error status remains visible instead of host \`dialogclose(1)\` closing first.\n- No parallel plugin modal tree or new surface/background workaround is used.\n\n## Verification\n\n- Targeted Move Request surface and submit lifecycle tests GREEN.\n- Full \`npm test\` and \`git diff --check\` GREEN before delivery.\n- Real MeshCentral smoke is still required before closing #173.\n`;
write(`docs/releases/${newVersion}.md`, note);

console.log(`Synchronized metadata to ${newVersion}.`);

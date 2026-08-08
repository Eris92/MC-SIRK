"use strict";

var fs = require("fs");

function replaceExact(file, before, after) {
    var source = fs.readFileSync(file, "utf8");
    if (source.indexOf(before) < 0) throw new Error("Expected source not found in " + file);
    fs.writeFileSync(file, source.replace(before, after), "utf8");
}

var themePath = "public/shared/ui/toolbar-config.js";
replaceExact(
    themePath,
    '        "card", "form-control", "form-select", "form-check-input", "table", "table-sm",',
    '        "card", "modal-content", "form-control", "form-select", "form-check-input", "table", "table-sm",'
);
replaceExact(
    themePath,
    '    function applyCard(element) {\n        if (!element) return element;\n        syncOwnedClasses(element, [isModern() ? "card" : "style10"]);\n        return element;\n    }',
    '    function applyCard(element) {\n        if (!element) return element;\n        if (element.classList && element.classList.contains("mc-move-dialog")) {\n            syncOwnedClasses(element, [isModern() ? "modal-content" : "style10"]);\n        } else {\n            syncOwnedClasses(element, [isModern() ? "card" : "style10"]);\n        }\n        return element;\n    }'
);

var cssPath = "public/shared/styles/main.css";
var css = fs.readFileSync(cssPath, "utf8");
var dialogBlock = /\.mc-move-dialog-overlay\{[\s\S]*?\.mc-move-dialog-actions button\{padding:7px 14px\}\n/;
if (!dialogBlock.test(css)) throw new Error("Move Request CSS block not found");
var replacement = '.mc-move-dialog-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}.mc-move-dialog{width:min(520px,100%);max-height:90vh;overflow:auto;padding:18px;box-sizing:border-box;color:inherit}.mc-move-dialog.style10{background-color:Canvas}html[data-bs-theme="dark"] .mc-move-dialog,body.night .mc-move-dialog{color-scheme:dark}html:not([data-bs-theme="dark"]) body:not(.night) .mc-move-dialog,html[data-bs-theme="light"] .mc-move-dialog{color-scheme:light}.mc-move-dialog h3{margin:0 0 8px}.mc-move-dialog-device{font-weight:600;margin-bottom:14px}.mc-move-dialog label{display:block;font-weight:600;margin:12px 0 5px}.mc-move-dialog-input{display:block;width:100%;box-sizing:border-box;padding:7px 8px}.mc-move-dialog-status{min-height:20px;margin-top:10px}.mc-move-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.mc-move-dialog-actions button{padding:7px 14px}\n';
fs.writeFileSync(cssPath, css.replace(dialogBlock, replacement), "utf8");

replaceExact(
    "public/modules/move-requests/index.js",
    '            submit.className = "btn btn-primary";',
    '            submit.className = "sirk-primary-action";'
);

fs.writeFileSync("test/move-request-dialog-surface.test.js", `"use strict";\n\nvar assert = require("assert");\nvar fs = require("fs");\nvar path = require("path");\nvar root = path.resolve(__dirname, "..");\nvar css = fs.readFileSync(path.join(root, "public/shared/styles/main.css"), "utf8");\nvar theme = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");\n\nvar dialogRule = css.match(/\\.mc-move-dialog\\{([^}]*)\\}/);\nassert.ok(dialogRule, "Move Request dialog must keep a dedicated geometry rule.");\nassert.strictEqual(/background(?:-color|-image)?:/.test(dialogRule[1]), false,\n    "Modern Move Request surface must be owned by native modal-content rather than plugin card/background overrides.");\nassert.strictEqual(css.indexOf(".mc-move-dialog.card{"), -1,\n    "Move Request must not retain card-specific cascade workarounds once the native modal surface is used.");\nassert.strictEqual(css.indexOf(".mc-move-dialog:hover"), -1,\n    "Move Request must not neutralize host card hover with a plugin hover workaround.");\n\nvar classicRule = css.match(/\\.mc-move-dialog\\.style10\\{([^}]*)\\}/);\nassert.ok(classicRule && /background-color:Canvas/.test(classicRule[1]),\n    "Classic Move Request must keep an opaque system-color fallback while reusing style10.");\nassert.ok(css.indexOf('html[data-bs-theme="dark"] .mc-move-dialog,body.night .mc-move-dialog{color-scheme:dark}') >= 0,\n    "Dark host signals must drive the Classic system-color fallback.");\nassert.ok(css.indexOf('html:not([data-bs-theme="dark"]) body:not(.night) .mc-move-dialog,html[data-bs-theme="light"] .mc-move-dialog{color-scheme:light}') >= 0,\n    "Light host signals must drive the Classic system-color fallback.");\n\nassert.ok(theme.indexOf('"card", "modal-content", "form-control"') >= 0,\n    "MeshThemeAdapter must own modal-content so theme changes can remove stale card/modal classes atomically.");\nassert.ok(theme.indexOf('element.classList.contains("mc-move-dialog")') >= 0 &&\n    theme.indexOf('isModern() ? "modal-content" : "style10"') >= 0,\n    "Move Request must reuse the existing shared surface adapter but map to native modal-content in Modern and style10 in Classic.");\nassert.ok(theme.indexOf('.mc-move-dialog,.mc-results-viewer", applyCard') >= 0,\n    "Move Request must stay on the existing MeshThemeAdapter refresh path without a new observer or repair loop.");\n\nconsole.log("Move Request uses native modal surface ownership without card hover behavior: OK");\n`, "utf8");

var submitTestPath = "test/move-request-submit-feedback.test.js";
var submitTest = fs.readFileSync(submitTestPath, "utf8");
submitTest = submitTest.replace(
    'var source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");',
    'var source = fs.readFileSync(path.join(root, "public/modules/move-requests/index.js"), "utf8");\nvar theme = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");'
);
var marker = 'assert.ok(source.indexOf(\'setDialogStatus(status, "pending", "Submitting...")\') >= 0,\n    "Submit must expose an in-flight pending state in the dialog.");\n';
if (submitTest.indexOf(marker) < 0) throw new Error("Submit test insertion marker not found");
submitTest = submitTest.replace(marker, marker + 'assert.ok(source.indexOf(\'submit.className = "sirk-primary-action"\') >= 0,\n    "Move Request submit must expose the existing semantic primary action class instead of hard-coding Bootstrap classes.");\nassert.strictEqual(source.indexOf(\'submit.className = "btn btn-primary"\'), -1,\n    "Move Request submit must let MeshThemeAdapter own native button classes.");\nassert.ok(theme.indexOf(\'element.classList.contains("sirk-primary-action")\') >= 0,\n    "The shared button adapter must map the semantic submit action to native primary treatment.");\n');
fs.writeFileSync(submitTestPath, submitTest, "utf8");

console.log("Issue #173 native modal surface patch prepared.");

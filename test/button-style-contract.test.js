"use strict";

var assert = require("assert");
var fs = require("fs");
var path = require("path");

var root = path.resolve(__dirname, "..");
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8"); }

var theme = read("public/shared/ui/toolbar-config.js");
var toolbar = read("public/shared/ui/toolbar.js");
var toolbarApi = read("public/shared/ui/toolbar-api.js");
var tools = read("public/shared/ui/script-tools.js");
var commands = read("public/modules/commands/index.js");
var automation = read("public/modules/automation/index.js");
var tree = read("public/shared/ui/tree.js");
var css = read("public/shared/ui/toolbar.css");
var mainCss = read("public/shared/styles/main.css");

assert.ok(theme.indexOf('"btn", "btn-primary", "btn-secondary", "btn-success", "btn-danger", "btn-warning", "btn-sm"') >= 0,
    "MeshThemeAdapter must own the native Bootstrap button variants used by the plugin.");
assert.strictEqual(theme.indexOf('element.classList.contains("mc-tree-favorite-action") && active(element)'), -1,
    "Favorite active state must not switch the whole native button to a warning variant.");
assert.ok(theme.indexOf('element.classList.contains("sirk-action-approve")') >= 0 && theme.indexOf('return "success"') >= 0 && theme.indexOf('element.classList.contains("sirk-action-reject")') >= 0 && theme.indexOf('return "danger"') >= 0,
    "Approval buttons must keep native success/danger variants.");
assert.ok(theme.indexOf('syncOwnedClasses(element, [selected ? "style10s" : "style10"])') >= 0,
    "Classic MeshCentral controls must still use native style10/style10s classes.");

assert.ok(toolbar.indexOf('className = "btn btn-secondary btn-sm mc-shared-toolbar-button mc-portal-toolbar-button"') >= 0,
    "Shared toolbar buttons must start from a neutral native button contract.");
assert.ok(toolbarApi.indexOf('item.disabled = key === "favorites" ? false : value === false') >= 0,
    "Favorites must remain clickable even when the current page is Results.");
assert.ok(toolbarApi.indexOf('icon.classList.toggle("is-favorite-active", key === "favorites" && active)') >= 0,
    "Shared Favorites state must mark only the toolbar icon for semantic highlighting.");
assert.ok(tools.indexOf('toolbar.setActive("favorites", state.favoritesOnly && scriptsMode)') >= 0 &&
    tools.indexOf('updateTitle(toolbar, "favorites", state.favoritesOnly ? "Show all scripts" : "Show favorites")') >= 0,
    "SharedScriptTools must own Favorites state/title without a toolbar monkey-patch.");
assert.ok(commands.indexOf('mode = "commands"; treeState.selectedScript = ""; module.api.render();') >= 0,
    "Commands Favorites must leave Results and return to the command tree directly in the module.");
assert.ok(automation.indexOf('tools.toggleFavorites(toolbar') >= 0 && automation.indexOf('mode = "scripts";') >= 0,
    "My Scripts Favorites must leave Results and return to the script tree directly in the module.");

assert.ok(tree.indexOf("var renderedKeys = Object.create(null)") >= 0 && tree.indexOf("if (renderedKeys[identity]) return") >= 0,
    "Tree rows must render at most one action for each action key.");
assert.ok(tree.indexOf('icon.className = "mc-tree-script-action-icon"') >= 0 &&
    tree.indexOf('icon.textContent = definition.icon || "•"') >= 0 &&
    tree.indexOf('action.appendChild(icon)') >= 0,
    "Edit and Multi actions must render an explicit icon element instead of relying on button text/theme timing.");
assert.ok(tree.indexOf('icon.classList.toggle("is-favorite-active", identity === "favorite" && active)') >= 0,
    "Per-script Favorite must mark only its star icon as active.");
assert.ok(tree.indexOf('action.classList.toggle("is-active", active)') >= 0 && tree.indexOf('action.setAttribute("aria-pressed", active ? "true" : "false")') >= 0,
    "Per-script action state must remain explicit and accessible.");

assert.ok(css.indexOf(".mc-tree-script-action") >= 0 && css.indexOf(".mc-shared-toolbar-button") >= 0,
    "Shared toolbar/script actions must have one static stylesheet owner.");
assert.strictEqual(css.indexOf('.mc-tree-favorite-action,.mc-tree-favorite-action:hover,.mc-tree-favorite-action:focus,.mc-tree-favorite-action:active{background-color:transparent!important;border-color:transparent!important;color:inherit!important}'), -1,
    "Per-row Favorite must retain the same native button surface as the other script actions.");
assert.ok(css.indexOf('.mc-tree-favorite-action .mc-tree-script-action-icon.is-favorite-active{color:var(--bs-warning,#ffc107)!important}') >= 0 &&
    css.indexOf('.mc-shared-toolbar-icon.is-favorite-active{color:var(--bs-warning,#ffc107)}') >= 0,
    "Only the Favorite star icon may become warning/yellow.");
assert.strictEqual(mainCss.indexOf("mc-tree-favorite-action"), -1,
    "Favorite state must not have a duplicate main.css owner.");
[theme, toolbar, toolbarApi, tools].forEach(function (source) {
    assert.strictEqual(source.indexOf('document.createElement("style")'), -1,
        "Button/theming modules must not inject runtime styles.");
});

console.log("Native buttons with explicit action icons and icon-only Favorites highlight: OK");

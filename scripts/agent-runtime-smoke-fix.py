from pathlib import Path


def replace(path, old, new):
    p = Path(path)
    data = p.read_text(encoding="utf-8")
    if old not in data:
        raise SystemExit("missing patch target in %s: %s" % (path, old[:120]))
    p.write_text(data.replace(old, new, 1), encoding="utf-8")


replace(
    "public/native/desktop-commands.js",
    'toolbar.setIcon("collapse", state.collapsed ? collapseDefinition.expandIcon : collapseDefinition.icon);',
    'toolbar.setIcon("collapse", state.collapsed ? collapseDefinition.icon : collapseDefinition.expandIcon);',
)

replace(
    "public/shared/ui/toolbar.js",
    "if (context.buttons.search) left.appendChild(searchWrap);",
    "if (context.buttons.search) center.appendChild(searchWrap);",
)

replace(
    "public/native/desktop-commands.css",
    ".sirk-quick-command-toolbar-host .mc-shared-toolbar-left{flex:1 1 auto;min-width:0}.sirk-quick-command-toolbar-host .mc-shared-toolbar-right{flex:0 0 auto;min-width:34px;margin-left:auto}",
    ".sirk-quick-command-toolbar-host .mc-shared-toolbar-left{flex:0 0 auto;min-width:0}.sirk-quick-command-toolbar-host .mc-shared-toolbar-center{display:flex;flex:1 1 0;min-width:0}.sirk-quick-command-toolbar-host .mc-shared-toolbar-right{flex:0 0 auto;min-width:34px;margin-left:auto}",
)
replace(
    "public/native/desktop-commands.css",
    ".sirk-quick-command-toolbar-host .mc-shared-toolbar-left{width:auto;margin-left:0;flex:1 1 auto}.sirk-quick-command-toolbar-host .mc-shared-toolbar-right{width:auto;margin-left:auto;flex:0 0 auto}",
    ".sirk-quick-command-toolbar-host .mc-shared-toolbar-left{width:auto;margin-left:0;flex:0 0 auto}.sirk-quick-command-toolbar-host .mc-shared-toolbar-center{display:flex;width:auto;flex:1 1 0;min-width:0}.sirk-quick-command-toolbar-host .mc-shared-toolbar-right{width:auto;margin-left:auto;flex:0 0 auto}",
)

replace(
    "public/shared/ui/toolbar.css",
    ".mc-shared-toolbar-center{display:none}",
    ".mc-shared-toolbar-center{display:contents}.mc-shared-toolbar-center .mc-shared-toolbar-search{width:100%}.mc-shared-toolbar-center .mc-shared-toolbar-search input{width:100%}",
)

Path("test/quick-collapse-action-icon.test.js").write_text(
    '''"use strict";\n\nvar assert = require("assert");\nvar fs = require("fs");\nvar path = require("path");\nvar root = path.resolve(__dirname, "..");\nvar quick = fs.readFileSync(path.join(root, "public/native/desktop-commands.js"), "utf8");\nvar config = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-config.js"), "utf8");\n\nassert.ok(config.indexOf("collapse: { title: \\\"Collapse\\\", icon: svg('<path d=\\\"m15 18-6-6 6-6\\\"/>'), expandIcon: svg('<path d=\\\"m9 18 6-6-6-6\\\"/>')") >= 0,\n    "Shared collapse artwork must remain unchanged for My Scripts/My Commands consumers.");\nassert.ok(quick.indexOf('title: state.collapsed ? text("expand") : text("collapse")') >= 0 &&\n    quick.indexOf('toolbar.setTitle("collapse", state.collapsed ? text("expand") : text("collapse"))') >= 0,\n    "Quick title must continue to describe the action performed by the next click.");\nassert.ok(quick.indexOf('toolbar.setIcon("collapse", state.collapsed ? collapseDefinition.icon : collapseDefinition.expandIcon)') >= 0,\n    "Quick visual chevron must follow the user runtime contract: collapsed = left, expanded = right.");\nassert.ok(quick.indexOf('writePreferences({ quickCollapsed: state.collapsed })') >= 0,\n    "The collapse state controlling icon/title must remain persisted after each toggle.");\n\nconsole.log("Quick collapse chevron follows the runtime state contract without changing shared artwork: OK");\n''',
    encoding="utf-8",
)

Path("test/quick-toolbar-nowrap.test.js").write_text(
    '''"use strict";\n\nvar assert = require("assert");\nvar fs = require("fs");\nvar path = require("path");\nvar root = path.resolve(__dirname, "..");\nvar css = fs.readFileSync(path.join(root, "public/native/desktop-commands.css"), "utf8");\nvar shared = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.css"), "utf8");\nassert.ok(css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar{align-items:center;min-height:34px;margin:0;gap:8px;max-width:100%;box-sizing:border-box;flex-wrap:nowrap}") >= 0,\n    "Quick toolbar must remain one row independently of shared toolbar wrapping.");\nassert.ok(css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar-left{flex:0 0 auto;min-width:0}") >= 0 &&\n    css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar-center{display:flex;flex:1 1 0;min-width:0}") >= 0 &&\n    css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar-right{flex:0 0 auto;min-width:34px;margin-left:auto}") >= 0,\n    "Quick left/right actions must stay fixed while the center Search slot consumes only remaining space.");\nassert.ok(css.indexOf(".sirk-desktop-commands .mc-shared-toolbar-search{flex:1 1 0;min-width:0;max-width:300px}") >= 0 &&\n    css.indexOf(".sirk-desktop-commands .mc-shared-toolbar-search input{width:100%;min-width:0") >= 0,\n    "Quick Search must shrink inside the stable center slot before any fixed action moves.");\nassert.ok(css.indexOf("flex:0 0 34px") >= 0,\n    "Quick toolbar actions must not shrink below their canonical 34 px width.");\nassert.strictEqual(css.indexOf(".sirk-quick-command-toolbar-host .mc-shared-toolbar{flex-wrap:wrap}"), -1,\n    "Quick responsive CSS must not re-enable a second toolbar row.");\nassert.ok(shared.indexOf("@media(max-width:760px){.mc-shared-toolbar{flex-wrap:wrap}") >= 0,\n    "Non-Quick shared module toolbars may retain their responsive wrapping contract.");\nconsole.log("Quick toolbar keeps fixed actions around an elastic center Search slot: OK");\n''',
    encoding="utf-8",
)

Path("test/shared-toolbar-search-slot.test.js").write_text(
    '''"use strict";\n\nvar assert = require("assert");\nvar fs = require("fs");\nvar path = require("path");\nvar root = path.resolve(__dirname, "..");\nvar toolbar = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.js"), "utf8");\nvar api = fs.readFileSync(path.join(root, "public/shared/ui/toolbar-api.js"), "utf8");\nvar css = fs.readFileSync(path.join(root, "public/shared/ui/toolbar.css"), "utf8");\n\nassert.ok(toolbar.indexOf('if (context.buttons.search) center.appendChild(searchWrap);') >= 0,\n    "Shared Search input must live in the existing center group so left/right action geometry is stable.");\nassert.strictEqual(toolbar.indexOf('if (context.buttons.search) left.appendChild(searchWrap);'), -1,\n    "Shared Search must not enter/leave the left action group.");\nassert.ok(toolbar.indexOf('center.hidden = center.childNodes.length === 0;') >= 0,\n    "Center group visibility must be derived from its stable Search child, not Search open/closed state.");\nassert.ok(api.indexOf('context.searchWrap.hidden = !context.state.searchVisible;') >= 0,\n    "Search toggle may hide only the Search content while preserving group ownership.");\nassert.ok(css.indexOf('.mc-shared-toolbar-center{flex:1;min-width:12px}') >= 0,\n    "Shared center group must remain the elastic spacer between fixed action groups.");\nassert.ok(css.indexOf('.mc-shared-toolbar-center{display:contents}.mc-shared-toolbar-center .mc-shared-toolbar-search{width:100%}') >= 0,\n    "Narrow shared toolbars must keep Search usable without injecting it into the action groups.");\n\nconsole.log("Shared toolbar Search uses a stable center slot without moving action groups: OK");\n''',
    encoding="utf-8",
)

Path("test/quick-toolbar-order.test.js").write_text(
    '''"use strict";\n\nvar assert = require("assert");\nvar fs = require("fs");\nvar path = require("path");\n\nvar root = path.join(__dirname, "..");\nvar toolbar = fs.readFileSync(path.join(root, "public", "shared", "ui", "toolbar.js"), "utf8");\nvar quick = fs.readFileSync(path.join(root, "public", "native", "desktop-commands.js"), "utf8");\n\nassert.ok(toolbar.indexOf("function definitions(options)") >= 0 &&\n    toolbar.indexOf("window.SharedToolbarConfig.resolve(options.preset, options.buttons).slice()") >= 0 &&\n    toolbar.indexOf("(options.customButtons || []).forEach") >= 0 &&\n    toolbar.indexOf("items.push(item)") >= 0 &&\n    toolbar.indexOf("return items.sort(function (a, b)") >= 0,\n    "SharedToolbar must combine standard and custom definitions before one canonical order sort.");\nassert.ok(toolbar.indexOf('if (a.side !== b.side) return a.side === "left" ? -1 : 1') >= 0 &&\n    toolbar.indexOf("return Number(a.order || 500) - Number(b.order || 500)") >= 0,\n    "All toolbar actions must be sorted first by side and then by numeric order.");\nassert.ok(toolbar.indexOf("definitions(options).forEach(add)") >= 0,\n    "Every module, including Quick, must use the same shared mounting path.");\nassert.strictEqual(toolbar.indexOf("quickDefinitions"), -1,\n    "Quick must not have a private toolbar-definition sorter.");\nassert.strictEqual(toolbar.indexOf("addStableDefinitions"), -1,\n    "Shared modules must not retain a parallel legacy mounting path.");\n\nassert.ok(quick.indexOf('collapse: {') >= 0 && quick.indexOf('side: "left", order: 10') >= 0,\n    "Quick Collapse must be first on the left.");\nassert.ok(quick.indexOf('favorites: {') >= 0 && quick.indexOf('side: "left", order: 20') >= 0,\n    "Quick Favorites must follow Collapse.");\nassert.ok(quick.indexOf('title: text("refresh"), side: "left", order: 50') >= 0,\n    "Quick Refresh must remain before Output and Search.");\nassert.ok(quick.indexOf('key: "details"') >= 0 && quick.indexOf("order: 65") >= 0 &&\n    quick.indexOf('search: { title: text("search"), side: "left", order: 70 }') >= 0,\n    "Quick Output must appear before Search, with Search as the final left-side action.");\nassert.ok(quick.indexOf('key: "close"') >= 0 && quick.indexOf('side: "right", order: 200') >= 0,\n    "Quick Close must remain isolated on the right side.");\n\nassert.ok(toolbar.indexOf("if (context.buttons.search) center.appendChild(searchWrap)") >= 0,\n    "The Search field must use the stable center slot instead of entering the ordered left action group.");\nassert.strictEqual(toolbar.indexOf("if (context.buttons.search) left.appendChild(searchWrap)"), -1,\n    "Search visibility must not change the geometry of the ordered left action group.");\nassert.ok(quick.indexOf('toolbar.setActive("collapse", state.collapsed)') >= 0 &&\n    quick.indexOf('toolbar.setIcon("collapse", state.collapsed ? collapseDefinition.icon : collapseDefinition.expandIcon)') >= 0,\n    "Quick Collapse active state and visual chevron must be derived from the one renderer-owned collapsed state.");\nassert.ok(quick.indexOf('toolbar.setActive("favorites", state.favoritesOnly)') >= 0 &&\n    quick.indexOf('toolbar.setActive("details", !state.detailsCollapsed)') >= 0 &&\n    quick.indexOf('toolbar.setActive("search", state.searchVisible)') >= 0,\n    "Quick toolbar visual state must be synchronized through the shared toolbar API.");\nassert.strictEqual(toolbar.indexOf("keepQuickToolbarOnOneLine"), -1,\n    "SharedToolbar must not contain Quick-only layout monkey-patches.");\nassert.strictEqual(toolbar.indexOf("alignQuickCollapseWithMyScripts"), -1,\n    "SharedToolbar must not override Quick collapse state after mount.");\n\nconsole.log("Canonical shared toolbar ordering and stable Search slot: OK");\n''',
    encoding="utf-8",
)

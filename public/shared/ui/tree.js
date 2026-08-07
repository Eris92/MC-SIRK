(function () {
    "use strict";

    function text(value) {
        return String(value == null ? "" : value);
    }

    function normalize(value) {
        value = text(value).toLocaleLowerCase();
        return typeof value.normalize === "function"
            ? value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            : value;
    }

    function scriptAllowed(node, options) {
        return !options || typeof options.filterScript !== "function" || options.filterScript(node) !== false;
    }

    function matches(node, query, options) {
        if (node.type === "script" && !scriptAllowed(node, options)) return false;
        if (!query) return true;
        return normalize([node.name, node.label, node.description, node.path].join(" ")).indexOf(query) >= 0;
    }

    function hasMatch(node, query, options) {
        if (!node) return false;
        if (node.type === "script") return matches(node, query, options);
        if (query && matches(node, query, options)) {
            return (node.children || []).some(function (child) { return hasMatch(child, "", options); });
        }
        return (node.children || []).some(function (child) { return hasMatch(child, query, options); });
    }

    function appendIcon(host, node, className) {
        if (!node || !node.iconData) return null;
        var image = document.createElement("img");
        image.className = (className || "mc-tree-icon") + " sirk-shared-list-icon";
        image.alt = "";
        image.src = node.iconData;
        host.appendChild(image);
        return image;
    }

    function lineIcon(kind) {
        var paths = kind === "script"
            ? '<path d="M6 3h9l3 3v15H6V3Z"/><path d="M9 11h6M9 15h6"/>'
            : '<path d="M3 6h7l2 2h9v11H3V6Z"/>';
        return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + paths + "</svg>";
    }

    function applyNav(button) {
        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.nav === "function") {
            window.MeshThemeAdapter.nav(button);
        }
    }

    function applyButton(button) {
        if (window.MeshThemeAdapter && typeof window.MeshThemeAdapter.button === "function") {
            window.MeshThemeAdapter.button(button);
        }
    }

    function createButton(options) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = (options.className || "mc-shared-nav-item") + " sirk-shared-list-item";
        var active = options.active === true;
        button.classList.toggle("active", active);
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", active ? "true" : "false");

        if (!appendIcon(button, options.node, options.iconClass)) {
            var fallback = document.createElement("span");
            fallback.className = "mc-tree-fallback-icon sirk-shared-list-icon";
            fallback.innerHTML = options.fallbackMarkup || options.node && options.node.iconMarkup || lineIcon(options.fallbackKind || "folder");
            button.appendChild(fallback);
        }

        var copy = document.createElement("span");
        copy.className = "sirk-shared-list-copy";
        var label = document.createElement("span");
        label.className = "mc-tree-label sirk-shared-list-label";
        label.textContent = options.title || "";
        copy.appendChild(label);
        button.appendChild(copy);
        button.onclick = options.onClick;
        button.__sirkCopy = copy;
        applyNav(button);
        return button;
    }

    function rootNodes(tree) {
        var children = tree && tree.children || [];
        var roots = children.filter(function (item) { return item.type === "directory"; });
        var scripts = children.filter(function (item) { return item.type === "script"; });
        if (scripts.length) {
            roots.unshift({ type: "directory", name: "Root", path: "__root__", iconData: "", children: scripts });
        }
        return roots;
    }

    function find(node, path) {
        if (!node) return null;
        if (text(node.path) === text(path)) return node;
        var children = node.children || [];
        for (var index = 0; index < children.length; index += 1) {
            var found = find(children[index], path);
            if (found) return found;
        }
        return null;
    }

    function renderActions(host, script, options) {
        var definitions = typeof options.scriptActions === "function" ? options.scriptActions(script) || [] : [];
        var visible = definitions.filter(function (definition) { return definition && definition.hidden !== true; });
        if (!visible.length) return;

        var actions = document.createElement("span");
        actions.className = "mc-tree-script-actions";
        var renderedKeys = Object.create(null);
        visible.forEach(function (definition, index) {
            var key = text(definition.key).trim();
            var identity = key || "__anonymous_" + index;
            if (renderedKeys[identity]) return;
            renderedKeys[identity] = true;

            var action = document.createElement("button");
            var active = definition.active === true;
            action.type = "button";
            action.className = "mc-tree-script-action";
            action.setAttribute("data-sirk-action-key", identity);
            if (definition.className) action.classList.add(definition.className);
            action.classList.toggle("active", active);
            action.classList.toggle("is-active", active);
            action.setAttribute("aria-pressed", active ? "true" : "false");
            action.title = definition.title || definition.key || "Action";
            action.setAttribute("aria-label", action.title);

            var icon = document.createElement("span");
            icon.className = "mc-tree-script-action-icon";
            icon.classList.toggle("is-favorite-active", identity === "favorite" && active);
            icon.textContent = definition.icon || "•";
            action.appendChild(icon);

            action.onclick = function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (typeof definition.onClick === "function") definition.onClick(script, event, action);
            };
            applyButton(action);
            actions.appendChild(action);
        });
        if (actions.childNodes.length) host.appendChild(actions);
    }

    function renderScript(host, script, options) {
        var row = document.createElement("div");
        row.className = "mc-tree-script-row";
        row.setAttribute("data-sirk-script-kind", script.kind || "script");
        row.classList.toggle("active", text(options.selectedScript) === text(script.path));

        var button = createButton({
            className: "mc-shared-nav-item mc-tree-script",
            node: script,
            title: script.label || script.name || script.path,
            fallbackKind: "script",
            fallbackMarkup: script.iconMarkup || "",
            active: text(options.selectedScript) === text(script.path),
            onClick: function () { options.onScript(script); }
        });

        if (script.requiresApproval) {
            button.__sirkCopy.classList.add("has-approval");
            var indicator = document.createElement("span");
            indicator.className = "mc-tree-approval";
            indicator.textContent = "⌛";
            indicator.title = "Requires approval";
            button.__sirkCopy.appendChild(indicator);
        }
        delete button.__sirkCopy;

        row.appendChild(button);
        renderActions(row, script, options);
        host.appendChild(row);
    }

    function renderDirectory(host, directory, options) {
        var children = directory.children || [];
        var query = options.query;

        children.filter(function (item) {
            return item.type === "directory" && hasMatch(item, query, options);
        }).forEach(function (folder) {
            var section = document.createElement("section");
            section.className = "mc-tree-folder";

            var body = document.createElement("div");
            body.className = "mc-tree-folder-body";
            var expanded = !!query || options.expanded[folder.path] === true;
            body.hidden = !expanded;

            var header = createButton({
                className: "mc-tree-folder-header",
                node: folder,
                iconClass: "mc-tree-folder-icon",
                title: folder.name,
                fallbackKind: "folder",
                fallbackMarkup: folder.iconMarkup || "",
                onClick: function () {
                    expanded = !expanded;
                    options.expanded[folder.path] = expanded;
                    body.hidden = !expanded;
                    header.classList.toggle("is-expanded", expanded);
                }
            });
            delete header.__sirkCopy;
            header.classList.toggle("is-expanded", expanded);

            section.appendChild(header);
            section.appendChild(body);
            host.appendChild(section);
            renderDirectory(body, folder, options);
        });

        children.filter(function (item) {
            return item.type === "script" && matches(item, query, options);
        }).forEach(function (script) { renderScript(host, script, options); });
    }

    window.SharedDirectoryTree = {
        find: find,
        roots: rootNodes,
        mount: function (options) {
            options = options || {};
            var rootsHost = options.rootsContainer;
            var treeHost = options.treeContainer;
            var state = options.state || {};
            state.expanded = state.expanded || {};

            var roots = rootNodes(options.tree);
            var query = normalize(options.search).trim();
            rootsHost.innerHTML = "";
            treeHost.innerHTML = "";

            var visibleRoots = roots.filter(function (root) { return hasMatch(root, query, options); });
            if (!visibleRoots.length) {
                treeHost.textContent = options.emptyText || "No scripts found.";
                state.selectedRoot = "";
                return state;
            }

            if (!state.selectedRoot || !visibleRoots.some(function (root) { return root.path === state.selectedRoot; })) {
                state.selectedRoot = visibleRoots[0].path;
            }

            visibleRoots.forEach(function (root) {
                var button = createButton({
                    className: "mc-shared-nav-item mc-tree-root",
                    node: root,
                    title: root.name,
                    fallbackKind: "folder",
                    fallbackMarkup: root.iconMarkup || "",
                    active: root.path === state.selectedRoot,
                    onClick: function () {
                        state.selectedRoot = root.path;
                        if (typeof options.onRootSelect === "function") options.onRootSelect(root);
                        window.SharedDirectoryTree.mount(options);
                    }
                });
                delete button.__sirkCopy;
                rootsHost.appendChild(button);
            });

            var selected = visibleRoots.filter(function (root) { return root.path === state.selectedRoot; })[0] || visibleRoots[0];
            renderDirectory(treeHost, selected, {
                expanded: state.expanded,
                query: query,
                selectedScript: state.selectedScript,
                filterScript: options.filterScript,
                scriptActions: options.scriptActions,
                onScript: function (script) {
                    state.selectedScript = script.path;
                    if (typeof options.onScript === "function") options.onScript(script);
                    window.SharedDirectoryTree.mount(options);
                }
            });

            if (!treeHost.childNodes.length) treeHost.textContent = options.emptyFolderText || "This folder is empty.";
            return state;
        }
    };
}());

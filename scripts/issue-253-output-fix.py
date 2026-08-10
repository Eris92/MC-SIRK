from pathlib import Path


def replace_once(path, old, new):
    source = Path(path).read_text(encoding="utf-8")
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}")
    Path(path).write_text(source.replace(old, new, 1), encoding="utf-8")


replace_once(
    "public/native/desktop-commands.js",
    '''            if (!(value.variables || []).length) {\n                submit(value, {}, null, panel);''',
    '''            if (!(value.variables || []).length) {\n                writeDetailsCollapsed(false);\n                submit(value, {}, null, panel);'''
)
replace_once(
    "public/native/desktop-commands.js",
    '''            }).then(function (values) {\n                if (values == null) return;\n                submit(value, values, null, panel);''',
    '''            }).then(function (values) {\n                if (values == null) return;\n                writeDetailsCollapsed(false);\n                submit(value, values, null, panel);'''
)

replace_once(
    "test/native-ui-contract.test.js",
    '''assert.ok(desktop.indexOf("writeDetailsCollapsed(false);") >= 0 &&\n    desktop.indexOf('submit(value, function () { return { ok: true, values: {} }; }, null, panel)') >= 0,\n    "Variable-free Quick commands must reveal the details pane and execute immediately.");''',
    '''assert.ok(desktop.indexOf("writeDetailsCollapsed(false);") >= 0 &&\n    desktop.indexOf("submit(value, {}, null, panel)") >= 0 &&\n    desktop.indexOf("submit(value, values, null, panel)") >= 0,\n    "Quick must reveal Output only when execution actually starts, for no-vars and valid parameter submits.");'''
)

from pathlib import Path

path = Path("public/shared/ui/toolbar.css")
text = path.read_text(encoding="utf-8")
replacements = {
    "var(--bs-primary,#0d6efd)": "var(--bs-primary,currentColor)",
    "var(--bs-info,#0dcaf0)": "var(--bs-info,currentColor)",
    "var(--bs-warning,#ffc107)": "var(--bs-warning,currentColor)",
    "var(--bs-secondary,#6c757d)": "var(--bs-secondary,currentColor)",
}
for old, new in replacements.items():
    if text.count(old) != 1:
        raise SystemExit(f"expected exactly one {old!r}")
    text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
print("Removed hard-coded command icon fallback colors")

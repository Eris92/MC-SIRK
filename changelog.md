# Changelog

## 0.1.1-dev.5 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection can install the shared Edit/Multi geometry fix from current `main`.
- Keep the normal second-column text track and label wrapping stable while Edit or Multi actions appear by reserving the measured action rail outside the captured text width.
- Use the same post-atomic-commit lifecycle for Edit and Multi so action-mode switches do not transiently move or squeeze text.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.5.md`.

## 0.1.1-dev.4 — 2026-08-07

- Bump the pre-1.0 development revision so MeshCentral update detection can install the atomic Edit lifecycle fix from current `main`.
- Keep Edit action DOM and live secondary-track geometry synchronized with atomic render commit so action buttons do not briefly hide behind script labels during Edit on/off.
- Preserve measured Edit expansion, native Favorites surface and shared selected-state behavior without new observers, polling or per-module CSS.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Development notes: `docs/releases/0.1.1-dev.4.md`.

## 0.1.1-dev.3 — 2026-08-07

- Bump the pre-1.0 development revision so MeshCentral update detection can install the latest Quick Search height fix from `main`.
- Keep the Quick Search wrapper/input at the same 32 px height as toolbar buttons so native `form-control` styling cannot change the Quick toolbar row height on Search on/off.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Development notes: `docs/releases/0.1.1-dev.3.md`.

## 0.1.1-dev.2 — 2026-08-07

- Bump the pre-1.0 development revision so MeshCentral update detection can install the current `main` runtime instead of treating it as the already installed `0.1.1-dev.1` build.
- Include the current runtime-smoke follow-up fixes for Quick collapse chevron semantics, stable shared toolbar Search geometry and connected-DOM script selection in My Commands/My Scripts.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

## 0.1.1-dev.1 — 2026-08-07

- Reset active versioning to the pre-1.0 development line because MC-SIRK has not reached its first complete product release.
- Use SemVer-compatible `0.1.1-dev.X` as the repository/plugin representation of the preferred `0.1.1.X` development convention.
- Preserve the latest tested `main` functionality: native MeshCentral integration, shared UI ownership, atomic rendering, Quick lifecycle, Edit/Multi behavior, native theme integration and security contracts.
- Previous `1.8.x` numbers are historical internal development snapshots only. They do not represent product releases and must not be used to continue version numbering.

The first product release is reserved for `1.0.0` and requires an explicit release decision after full functionality, acceptance, security, update/rollback and real MeshCentral smoke validation are complete.
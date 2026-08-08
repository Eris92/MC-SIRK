# Changelog

## 0.1.1-dev.12 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the Move Request dialog surface fix from current `main`.
- Keep the existing native `MeshThemeAdapter.card()` ownership while guaranteeing an opaque dialog background through Bootstrap card/body tokens with a Classic/system `Canvas` fallback.
- Preserve Move Request submit/backend semantics and the existing #127 pending/success/error lifecycle.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.12.md`.

## 0.1.1-dev.11 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the corrective UI smoke follow-up from current `main`.
- Keep selected first-column indicator distance and icon position stable across Collapse/Expand by using one 9 px primary inset and 44 px collapsed row geometry, including Quick and Approval Center.
- Make Approval Center consume the same shared list row/icon/label geometry as My Scripts/My Commands instead of separate provider/status spacing rules.
- Center shared Results `View` and `Actions` headers and controls while preserving their compact 72 px / 120 px width contract and local horizontal scrolling.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.11.md`.

## 0.1.1-dev.10 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the latest dev.9 runtime smoke follow-up from current `main`.
- Keep first-column icon centers on one shared horizontal axis across expanded/collapsed states and apply the same 28 px / 44 px first-column geometry to Approval Center.
- Give shared Results `View` a dedicated compact 72 px semantic track while preserving the wider `Actions` track required by Approve/Reject controls.
- Preserve selected-state semantics, secondary-column compact geometry, permissions and runtime lifecycle without measurement, observers or per-module CSS.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.10.md`.

## 0.1.1-dev.9 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the corrective runtime smoke follow-up from current `main`.
- Keep first-column icon row position stable across Collapse/Expand by preserving the expanded vertical origin and row step.
- Normalize only persisted historical built-in command default labels so My Commands and Quick converge on `Network Control`, `Network Settings`, `PowerShell` and `CMD` while genuine custom labels remain valid.
- Contain long unbroken Results text tokens inside their semantic cells and present Move Request source/target groups with visible human-readable names when available.
- Keep stable execution IDs, authorization and the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.9.md`.


## 0.1.1-dev.8 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection can install the stable first-column icon geometry fix from current `main`.
- Keep direct first-column shared/Quick icons at one 28 px box / 24 px SVG size in both expanded and collapsed states instead of scaling artwork during Collapse/Expand.
- Preserve compact second-column icon geometry, the 64 px collapsed track, neutral icon colors and shared selected-state indicators without runtime measurement or extra lifecycle work.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.8.md`.

## 0.1.1-dev.7 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection can install the current shared UI and Results batch from `main`.
- Use canonical short built-in command labels (`Network Control`, `Network Settings`, `PowerShell`, `CMD`) without changing stable command IDs or execution semantics.
- Keep ordinary first/second-column navigation icons neutral/native, reuse the shared visible selected-state contract in Approval Center, and preserve semantic colors only for meaningful states such as active Favorites and Quick Output attention.
- Keep shared Results tables readable with semantic column roles and horizontal scrolling instead of fixed-layout compression.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Development notes: `docs/releases/0.1.1-dev.7.md`.

## 0.1.1-dev.6 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection can install the collapsed-primary Edit/Multi geometry fix from current `main`.
- Remove the base collapsed-grid `!important` that suppressed the measured Edit/Multi secondary-track override when the first shared column was collapsed.
- Preserve the 64 px collapsed primary track while keeping the normal second-column text width and wrapping unchanged and placing the measured action rail outside it.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Development notes: `docs/releases/0.1.1-dev.6.md`.

## 0.1.1-dev.5 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection can install the shared Edit/Multi geometry fix from current `main`.
- Keep the normal second-column text track and label wrapping stable while Edit or Multi actions appear by reserving the measured action rail outside the captured text width.
- Use the same post-atomic-commit lifecycle for Edit and Multi so action-mode switches do not transiently move or squeeze text.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Development notes: `docs/releases/0.1.1-dev.5.md`.

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
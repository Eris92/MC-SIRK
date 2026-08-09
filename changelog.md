## 0.1.1-dev.28 - 2026-08-09

- Deliver Issue #213 second-column shared navigation icon-size contract from PR #222 so MeshCentral update detection installs the larger shared/Quick list icons.
- Use one shared 28 px item-identifying icon slot with 24 px SVG artwork across My Scripts, My Commands, Approval Center and Quick while preserving first-column Collapse geometry.
- Keep action-rail icon/button geometry, neutral icon color, selected-state indicators, custom image aspect ratio and existing lifecycle/request behavior unchanged.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.28.md`.

## 0.1.1-dev.27 - 2026-08-09

- Continue #177 after real `0.1.1-dev.26` smoke still showed a small left-menu flicker after Refresh.
- Make repeated `core.ensureMenu()` reconciliation write visible menu/icon state only when class, active state, family, source or geometry actually changes.
- Preserve the existing permission-safe bootstrap, native page-ready creation gate, menu/icon node identity, handlers and ordering without adding polling, observers, timers, CSS masking or a second owner.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.27.md`.

## 0.1.1-dev.26 - 2026-08-08

- Continue #177 after real `0.1.1-dev.25` smoke reduced the left-menu shift to one remaining short blink after F5.
- Gate creation of missing SIRK menu nodes on the current native MeshCentral `goPageEnd`, invalidating readiness on every `goPageStart`, so host redraw cannot remove an early plugin node and trigger one recreation.
- Keep existing menu nodes refreshable, retain permission-safe bootstrap and bounded parallel module startup, and add host-redraw/startup regressions without timers, observers, CSS masking or extra requests.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.26.md`.

## 0.1.1-dev.25 - 2026-08-08

- Continue #121/#177 after real `0.1.1-dev.24` smoke showed undersized SIRK left-menu artwork and a remaining visible second-pass menu shift after F5.
- Move final native left-menu classes, active state, icon family/source and icon geometry into the first permission-safe `core.ensureMenu()` pass; deferred `page.js` no longer wraps or normalizes the left menu.
- Use white/native-style Classic artwork with 48 px drawing geometry and larger colored Modern artwork with a 32 px image box while reusing existing menu/icon nodes and avoiding redundant reorder inserts.
- Keep the existing Auto/Classic/Modern policy and add no CSS filter, fourth mode, polling, MutationObserver, timer, second renderer, tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.25.md`.

## 0.1.1-dev.24 - 2026-08-08

- Continue #121 after real `0.1.1-dev.23` smoke showed configured colored/custom SIRK menu SVGs being replaced after first paint by white/currentColor Font Awesome icons.
- Keep `SirkIconMode -> core.ensureMenu()` as the single family/source owner and remove the second Modern icon map/replacement path from deferred `public/shared/ui/page.js`.
- Preserve native left-menu classes, active state and Classic `.lbtg` geometry without adding a CSS filter, extra setting, observer, timer or second menu renderer.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.24.md`.

## 0.1.1-dev.23 - 2026-08-08

- Continue #177/#178 after real `0.1.1-dev.22` hard-refresh smoke still showed roughly one second of delayed SIRK native UI pop-in.
- Start the single canonical bootstrap request immediately after `core.js`, while theme/settings/runtime critical scripts load concurrently, and reuse that Promise in `runtime.prepare()` without a duplicate request.
- Reconcile permission-approved native surfaces from the shared runtime lifecycle and move `MoveRequestHostButton` DOM ownership out of the deferred renderer so it can appear with the ready native host action row.
- Keep dialog/backend semantics unchanged and add no polling, MutationObserver, readiness timer staircase, pre-permission placeholder, second menu renderer, tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.23.md`.

## 0.1.1-dev.22 - 2026-08-08

- Deliver the shared startup/readiness fix from PR #212 for Issues #177 and #178.
- Mount enabled+allowed SIRK native menu entries immediately after bootstrap instead of waiting for renderer/module initialization.
- Fetch deferred shared UI assets concurrently and initialize allowed modules in one bounded parallel fan-out, while retaining and replaying pre-runtime native page/device context.
- Keep one canonical startup/menu owner with no polling, MutationObserver, readiness timer staircase, tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.22.md`.

## 0.1.1-dev.21 - 2026-08-08

- Deliver the Move Request #178 host-button readiness fix from PR #209 so MeshCentral update detection installs the synchronous native lifecycle behavior.
- Remove the historical `0/100/400/1000/2000/4000 ms` readiness retry staircase and reuse the existing idempotent `installHostButton()` owner from `onDeviceRefreshEnd` and `onNativePageEnd`.
- Preserve `hostButtonEnabled`, single-node reuse, node resolution, native cloned presentation and dialog flow without adding a `MutationObserver`, polling loop or request.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.21.md`.

## 0.1.1-dev.20 - 2026-08-08

- Deliver the Move Request #173 correction after real dev.19 smoke exposed `Cannot set properties of null (setting 'innerHTML')` in Modern MeshCentral.
- Route Modern to the host-native `setModalContent("xxAddAgent", ...)` + `showModal("xxAddAgentModal", ...)` lifecycle and retain `setDialogMode(2, ...)` only for Classic.
- Keep guarded asynchronous Submit feedback visible by returning `false` from the Modern host callback; preserve Classic capture interception and backend semantics.
- No parallel plugin modal tree, background workaround, observer, timer, polling loop, tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.20.md`.

## 0.1.1-dev.19 - 2026-08-08

- Deliver the Move Request #173 follow-up that delegates dialog presentation and lifecycle to MeshCentral's native `setDialogMode(2, ...)` owner instead of constructing a parallel plugin modal tree.
- Reuse the host `idx_dlgOkButton`, `idx_dlgCancelButton` and close control so modal surface, hover and footer button styling are exactly host-native.
- Keep guarded asynchronous Submit feedback in the same native dialog by intercepting the host OK click before `dialogclose(1)`, while preserving source/target group names and backend semantics.
- No new background/opacity workaround, observer, timer, polling loop, modal framework, tag or GitHub Release.

# Changelog

## 0.1.1-dev.18 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the native Move Request inner modal-section fix from current `main`.
- Match the current MeshCentral modal content contract with `modal-header`, `modal-body`, and `modal-footer` inside the existing `modal-content`.
- Keep title/device in the native header, form/status in the native body, and Cancel/Submit in the native footer while leaving Modern Bootstrap geometry and surface ownership to MeshCentral.
- Preserve Classic `style10`, guarded submit/status lifecycle and backend semantics without adding a background workaround, observer, timer, polling loop or new modal framework.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.18.md`.

## 0.1.1-dev.17 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the complete native Move Request modal DOM fix from current `main`.
- Match the current MeshCentral ModernModal structure with `modal -> modal-dialog modal-dialog-centered -> modal-content` instead of attaching `modal-content` directly below the overlay.
- Keep the existing Move Request overlay/lifecycle and `MeshThemeAdapter` ownership; do not add a new modal framework, background workaround, observer, timer, polling loop or DOM repair layer.
- Preserve Classic `style10`, native primary `Submit request`, Move Request backend semantics and the existing #127 pending/success/error lifecycle.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.17.md`.

## 0.1.1-dev.16 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the complete native Move Request modal variable-owner fix from current `main`.
- Keep `mc-move-dialog modal-content` in Modern while assigning the existing overlay the native `modal` class that owns Bootstrap modal surface variables.
- Reuse the existing `MeshThemeAdapter` root/refresh lifecycle and apply it to the detached overlay before first paint; do not add another modal framework or background workaround.
- Preserve Classic `style10`, native primary `Submit request`, Move Request backend semantics and the existing #127 pending/success/error lifecycle.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.16.md`.

## 0.1.1-dev.15 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the native Move Request modal-surface fix from current `main`.
- Map Modern Move Request to the host-native `modal-content` surface instead of `card`, eliminating inherited card hover transform/surface behavior without a plugin hover workaround.
- Use the existing `sirk-primary-action` semantic class so `Submit request` receives native primary/blue button treatment from `MeshThemeAdapter`.
- Preserve Classic `style10`, Move Request submit/backend semantics and the existing #127 pending/success/error lifecycle.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.15.md`.

## 0.1.1-dev.14 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the `.mc-move-dialog.card` cascade fix from current `main`.
- Keep native `MeshThemeAdapter.card()` ownership while giving the real Modern class combination a higher-specificity opaque `Canvas` base and an optional Bootstrap card/body token layer.
- Avoid a single `background:` shorthand failure point; Classic `.mc-move-dialog.style10` keeps an explicit opaque system surface.
- Preserve Move Request submit/backend semantics and the existing #127 pending/success/error lifecycle.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.14.md`.

## 0.1.1-dev.13 — 2026-08-08

- Bump the pre-1.0 development revision so MeshCentral update detection installs the opacity-safe Move Request dialog follow-up from current `main`.
- Preserve native `MeshThemeAdapter.card()` ownership while compositing the host card/body token layer over an always-opaque `Canvas` base, so transparent or alpha host card tokens cannot expose the device page.
- Preserve Move Request submit/backend semantics and the existing #127 pending/success/error lifecycle.
- Keep the revision below `1.0.0`; this is not a product release and does not create a tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.13.md`.

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

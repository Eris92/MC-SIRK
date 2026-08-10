## 0.1.1-dev.40 - 2026-08-10

- Real `0.1.1-dev.39` smoke: Network Settings and Admin theme/color switching both still FAIL; record dev.39 as ineffective for #128/#123 and keep both Issues open.
- Network root cause: shared `logged-on-user-command-policy` still rewrote every `runAsUser: 2` command to SYSTEM -> Scheduled Task -> WScript -> hidden PowerShell, so dev.39 never reached native MeshAgent UserOnly semantics. Mark only trusted built-in `network-adapter-properties` as `nativeUserSession` and let the existing policy bypass its script wrapper for that strict catalog-owned path; preserve type 2, route/Up-adapter selection and the proven FolderItem Properties verb.
- Admin root cause: Modern MeshCentral changes the active theme through `#theme-stylesheet.href`; the existing Admin observer did not watch that writer. Reuse the same observer for stylesheet `href` and `load`, then resync after CSS application; retain Classic `body.night`, parent surface copy, F5 recovery and form state without polling/request/rerender.
- Clean pre-bump full `npm test` GREEN in Actions `31375783695`; canonical runtime PR Test #546 GREEN. Final exact-version CI required before merge. No tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.40.md`.

## 0.1.1-dev.39 - 2026-08-10

- Real `0.1.1-dev.38` smoke: Results/View PASS; #237 completed. Network Settings still FAIL from MC-SIRK although its core FolderItemVerb body works manually; Admin Panel theme/color switching regressed after earlier dev.31 PASS.
- Network root cause: `network-adapter-properties` remained a type-1 CMD preset using `start "" powershell.exe ...`; under the canonical logged-on-user policy that detached the actual UI PowerShell from the runner lifetime. Convert only this preset to direct type-2 PowerShell while preserving `runAsUser: 2`, route/adapter selection, Namespace(49) and the proven Properties/Właściwości `FolderItemVerb.DoIt()` body.
- Admin root cause: the current parent observer watches `data-bs-theme`, but `hostIsDark()` returned legacy parent `nightMode` first. Prefer explicit same-origin parent html/body `data-bs-theme` when present; retain Classic `body.night`/`nightMode`, localStorage/system/computed fallbacks and the existing copied host surface. No second observer, polling, request or rerender.
- Runtime Test #540 GREEN before bump. #128 and #123 remain open for real `0.1.1-dev.39` smoke. #237, #126 and #134 closed from positive real smoke evidence. No tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.39.md`.

## 0.1.1-dev.38 - 2026-08-10

- Follow up real `0.1.1-dev.37` smoke evidence: Network Settings still failed although the same `FolderItemVerb.DoIt()` operation worked manually, and Results View remained visually unchanged.
- Fix the Network invocation root cause: built-in `runAsUser: 2` commands no longer get pre-wrapped by the Commands module into the legacy `SIRK-Desktop-*` interactive-SYSTEM launcher; the existing `server/core/logged-on-user-command-policy.js` is now the single owner of logged-on-user execution.
- Remove the obsolete module-local `desktopLaunch()` / `interactiveDesktopCommand()` implementation instead of layering another launcher, while preserving the Network command body, stable IDs, route/adapter selection and real `Properties/Właściwości` verb.
- Fix the Results geometry owner identified in the native MeshCentral contract: stop passing `extra-large` to `setModalContent()`, so MC-SIRK no longer forces `modal-xl` on `#xxAddAgentModalConf`; result rendering, Copy, CSV, Debug and native close lifecycle remain unchanged.
- Full runtime/shared regression Test #528 is green before the version bump. Keep #128 and #237 open for real `0.1.1-dev.38` re-smoke; no tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.38.md`.

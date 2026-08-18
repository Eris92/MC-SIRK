## 0.1.1-dev.117 - 2026-08-18

- Increase the Jira Asset Protocol handwritten-signature area in generated PDF/print output.
- Remove the print-only `32px` signature compression so the existing shared `72px` spacing is preserved.
- Reuse the current shared A4 template and signature block without adding a new class, renderer or lifecycle owner.
- Preserve the dev.116 stacked logo/title header, protocol content, protected PDF, requester confirmation and CMDB semantics unchanged.

Current development notes: `docs/releases/0.1.1-dev.117.md`.

## 0.1.1-dev.116 - 2026-08-18

- Stack the Jira Asset Protocol title on a separate line below the existing logo in the shared A4 header.
- Correct the ineffective dev.114 geometry, which only top-aligned/lowered elements inside the same horizontal flex row.
- Reuse the existing header/logo/title markup with `flex-direction: column` and no new renderer or layout owner.
- Preserve Jira protocol content, protected PDF, requester confirmation and CMDB semantics unchanged.

Current development notes: `docs/releases/0.1.1-dev.116.md`.

## 0.1.1-dev.115 - 2026-08-18

- Make Jira protocol equipment Search react to every typed character in both warehouse and current-user steps.
- Reuse the existing shared parameter-dialog `onUserChanged` owner with opt-in `liveInput` instead of adding wizard-local handlers.
- Keep ordinary user dependencies change-only and keep Jira equipment filtering local to the one prefetched inventory with no per-search Jira requests.
- Preserve protocol selections, requester confirmation, PDF and CMDB semantics unchanged.

Current development notes: `docs/releases/0.1.1-dev.115.md`.

## 0.1.1-dev.114 - 2026-08-17

- Top-align the existing protocol logo/fallback block in the shared A4 header.
- Move the existing document title 12 px lower relative to the logo for clearer visual hierarchy.
- Reuse the current template and `.title` rule without adding a new CSS class or layout owner.
- Preserve Jira protocol content, requester confirmation, protected PDF and CMDB semantics unchanged.

Current development notes: `docs/releases/0.1.1-dev.114.md`.

## 0.1.1-dev.113 - 2026-08-17

- Render `Zmiany na stanie` from receive/return assets only; unchanged equipment remains in `Stan po zmianie`.
- Show `Brak zmian na stanie.` for all-no-change protocols instead of duplicating unchanged rows.
- Simplify the legend to the requested business-result wording without `po finalnym potwierdzeniu` or a `Bez zmian` legend entry.
- Preserve requester confirmation, PDF-before-write and Jira CMDB mutation semantics unchanged.

Current development notes: `docs/releases/0.1.1-dev.113.md`.

## 0.1.1-dev.112 - 2026-08-17

- Rename the current Jira protocol document to `PROTOKÓŁ PRZEKAZANIA/ZWROTU SPRZĘTU`.
- Restore the prior equipment-state acknowledgement wording for protocols containing changes.
- Remove the implementation-oriented Jira Assets confirmation sentence from the prepared protocol while preserving confirmation and CMDB behavior unchanged.

Current development notes: `docs/releases/0.1.1-dev.112.md`.

## 0.1.1-dev.111 - 2026-08-17

- Record the real `0.1.1-dev.110` Jira wizard failure caused by post-processing a wrapper that MeshCentral does not keep in the live native modal.
- Replace the failed per-row operation injection with two optional native equipment steps: searchable `Sprzęt z magazynu` for handover and searchable `Sprzęt użytkownika` for return.
- Reuse one prefetched authoritative protocol inventory for both lists and filter it locally without per-row or per-search Jira requests.
- Preserve the existing stable-ID receive/return action map, requester confirmation, PDF-before-write, stale/replay/partial-failure checks and dev.109 Jira source/cache scope.

Current development notes: `docs/releases/0.1.1-dev.111.md`.

## 0.1.1-dev.110 - 2026-08-17

- Add shared requester-only `awaiting_confirmation` for prepared results without changing ordinary pending approval semantics.
- Replace Jira Asset Protocol global transfer/return direction with per-asset `Bez zmian`, `Przyjęcie sprzętu` and `Zdanie sprzętu` actions.
- Prepare the protected PDF before CMDB writes and include `Zmiany na stanie`, a business legend and authoritative `Stan po zmianie`.
- Use stable Jira asset identities, live ownership/schema discovery, stale/replay guards and explicit partial-failure handling for bounded final writes.
- Preserve the dev.109 `objectType in objectTypeAndChildren("Sprzęt użytkownika")` Jira Assets source scope and existing cache behavior.

Current development notes: `docs/releases/0.1.1-dev.110.md`.

## 0.1.1-dev.109 - 2026-08-17

- Restore the previously real-smoke-proven Jira Assets source scope `objectType in objectTypeAndChildren("Sprzęt użytkownika")` for both Jira Asset Protocol and Cache Assets.
- Keep dev.108 authoritative `/object/aql/totalcount` pagination and truthful fetched snapshot reporting unchanged.
- Reject the dev.108 workspace-wide `Key is not EMPTY` source that made a forced cache refresh scan/report 26,582 workspace objects.

Current development notes: `docs/releases/0.1.1-dev.109.md`.

## 0.1.1-dev.108 - 2026-08-14

- Use Jira Assets `/object/aql/totalcount` when `totalFilterCount` is capped so forced cache refresh stops at the authoritative result size.
- Report the fetched Assets snapshot count instead of the interactive 5000-option ceiling.
- Restore Issue #305 workspace-wide `Key is not EMPTY` scope for protocol/cache before server-side user binding.

Current development notes: `docs/releases/0.1.1-dev.108.md`.

## 0.1.1-dev.107 - 2026-08-13

- Restore the bounded Jira Assets service that dev.82 reverted to dev.63 while preserving all post-dev.82 main changes.
- Restore paginated user cache v2, compact Assets cache v4, explicit/`Osoba_odpowiedzialna` user binding and bounded 50k/concurrent refresh.
- Continue Jira Assets paging while `hasMoreResults` is true even when `totalFilterCount` is capped at 1000.

Current development notes: `docs/releases/0.1.1-dev.107.md`.

## 0.1.1-dev.106 - 2026-08-13

- Resolve PowerShell system credential assignments by the stable `@workflow:*` key used by the credentials UI.
- Preserve legacy path-key assignments as a fallback.
- Restore SMTP Relay environment propagation for the mail workflow.

Current development notes: `docs/releases/0.1.1-dev.106.md`.

## 0.1.1-dev.105 - 2026-08-13

- Make the SMTP Relay sender optional in both the script and global integration readiness contract.
- Resolve the sender from the script override, configured default or neutral `sirk@localhost` fallback.
- Use SMTP port `25` when no port reaches the PowerShell environment and report a dedicated missing-server error.

Current development notes: `docs/releases/0.1.1-dev.105.md`.

## 0.1.1-dev.104 - 2026-08-13

- Verify that the running backend confirms each submitted integration secret before showing a successful save.
- Detect an outdated runtime that does not understand SMSAPI and SMTP Relay settings.
- Immediately update `Required`/`Configured` placeholders after a confirmed save.

Current development notes: `docs/releases/0.1.1-dev.104.md`.

## 0.1.1-dev.103 - 2026-08-13

- Move the inner Settings gear circle approximately one rendered pixel lower for a visually centered cog shape.
- Preserve the outer gear geometry and shared folder-icon alignment.

Current development notes: `docs/releases/0.1.1-dev.103.md`.

## 0.1.1-dev.102 - 2026-08-13

- Replace company-specific Active Directory UPN and OU examples with `domena.local` and `DC=domena,DC=local`.
- Keep existing saved integration values unchanged; only empty-field hints and documentation examples change.

Current development notes: `docs/releases/0.1.1-dev.102.md`.

## 0.1.1-dev.101 - 2026-08-13

- Add a no-authentication SMTP Relay integration under Settings / Integrations.
- Add an approval-protected mail script with To, CC, BCC, subject, multiline text/HTML body and attachments.
- Restrict attachments to an administrator-configured server root and maximum total size.
- Add reusable multiline My Scripts parameter rendering.

Current development notes: `docs/releases/0.1.1-dev.101.md`.

## 0.1.1-dev.100 - 2026-08-13

- Rename the cache administration scripts to `Cache Assets.ps1` and `Cache Users.ps1`.
- Remove Jira from their visible labels while preserving workflow identities and existing consumer compatibility.
- Update the hourly Jira scheduler to read the renamed Assets cache policy script.

Current development notes: `docs/releases/0.1.1-dev.100.md`.

## 0.1.1-dev.99 - 2026-08-13

- Prefetch Jira protocol equipment while the user-selection modal remains visible.
- Keep Next disabled with a loading message until the equipment list is ready, removing the apparent wizard interruption between steps.

Current development notes: `docs/releases/0.1.1-dev.99.md`.

## 0.1.1-dev.98 - 2026-08-13

- Add server-side SMSAPI.pl SMS and Voice SMS sending, including multi-recipient delivery and a separately authenticated external endpoint.
- Add approval-protected AD password reset/unlock/SMS and account creation/SMS workflows with configurable OU locations.
- Allocate account logins as `i.nazwisko`, then extend the first-name prefix on collisions and finally use a numeric suffix.

Current development notes: `docs/releases/0.1.1-dev.98.md`.

## 0.1.1-dev.97 - 2026-08-13

- Add an internal `_Scheduler` BAT installer for an hourly Windows Jira cache refresh task.
- Refresh both existing JSON cache files through the shared Jira service without storing credentials in the task definition.

Current development notes: `docs/releases/0.1.1-dev.97.md`.
## 0.1.1-dev.96 - 2026-08-13

- Move the Jira cache administration scripts from `Jira` to `settings/Jira`.
- Keep the persisted Jira JSON cache files in their existing runtime location.

Current development notes: `docs/releases/0.1.1-dev.96.md`.

## 0.1.1-dev.95 - 2026-08-13

- Complete the Jira user cache freshness check before opening the protocol wizard.
- Keep the user-scoped equipment freshness check before showing the equipment list.

Current development notes: `docs/releases/0.1.1-dev.95.md`.

## 0.1.1-dev.94 - 2026-08-13

- Raise shared checklist radio/checkbox controls by one pixel for optical alignment with option text.

Current development notes: `docs/releases/0.1.1-dev.94.md`.

## 0.1.1-dev.93 - 2026-08-13

- Vertically align every shared checklist radio/checkbox dot with its option text.
- Remove browser-dependent input margins that shifted labels below their controls.

## 0.1.1-dev.92 - 2026-08-13

- Keep `Debug / raw output` on the same Results surface instead of styling it as a nested card.
- Preserve the expandable raw output behavior in both Modern and Classic modes.

## 0.1.1-dev.91 - 2026-08-13

- Stop automatically opening Jira protocol PDFs after generation.
- Keep PDF access exclusively behind explicit `Open PDF` and `Download PDF` actions, including for historical artifacts with the old flag.

## 0.1.1-dev.90 - 2026-08-13

- Always build the visible Jira protocol equipment table from normalized `result.data.assets`.
- Keep historical or stale printable-text output only in `Debug / raw output`.

## 0.1.1-dev.89 - 2026-08-13

- Place the `Wymuś odświeżenie` checkbox before its label in both Jira cache dialogs.
- Keep every non-cache script parameter layout unchanged.

## 0.1.1-dev.88 - 2026-08-13

- Render Jira protocol Output as an equipment-only JSON table instead of the complete printable protocol text.
- Place the operation heading above one shared `Copy`, `Open PDF`, `Download PDF` action row.
- Preserve the complete protocol text in `Debug / raw output` and the PDF fallback path.

## 0.1.1-dev.87 - 2026-08-13

- Keep shared native-dialog checkbox controls square on browser/theme/DPI combinations that otherwise stretch the text-input class to the full row width.
- Cover both regular Jira cache switches and inline Jira protocol switches with one scoped geometry contract.

## 0.1.1-dev.86 - 2026-08-13

- Prefetch the selected Jira user's equipment before opening `Sprzęt do protokołu`, then mount the native checklist atomically with its complete option set.
- Reuse the prefetched options as static dialog input so the visible step performs no duplicate provider request and never paints the empty checkbox shell.

## 0.1.1-dev.85 - 2026-08-13

- Replace the company-specific `INVESTA` protocol logo fallback with the neutral `LOGO` placeholder and neutral image alt text.
- Preserve uploaded/custom logo rendering and the complete styled PDF lifecycle unchanged.

Current development notes: `docs/releases/0.1.1-dev.85.md`.

## 0.1.1-dev.84 - 2026-08-13

- Preserve the canonical styled Jira protocol HTML template under the MeshCentral Windows service by explicitly allowing Microsoft Edge to start as `LocalSystem` with `--allow-run-as-system`.
- Keep the Edge sandbox enabled, the isolated profile, bounded retry and final text fallback unchanged; do not add `--no-sandbox` or a second document template.

Current development notes: `docs/releases/0.1.1-dev.84.md`.

## 0.1.1-dev.83 - 2026-08-13

- Keep the user-directed `0.1.1-dev.82` Jira equipment matching, pagination and cache behavior unchanged while correcting only the protocol PDF execution path.
- Run Edge with an isolated writable per-render profile and portable output paths, prefer compatibility `--headless`, then retry once with `--headless=new`.
- Always produce a valid protected protocol PDF through the dependency-free text fallback when the Windows service context blocks both Edge attempts, surfacing a bounded fallback reason in Results.

Current development notes: `docs/releases/0.1.1-dev.83.md`.

## 0.1.1-dev.82 - 2026-08-13

- User-directed rollback: full-tree restore of the real-smoke-confirmed `0.1.1-dev.63` Jira equipment matching, cache and PDF rendering behavior on top of current `main`, after every targeted correction attempted in `0.1.1-dev.66`-`0.1.1-dev.81` still left equipment scope incomplete or unverifiable in the user's real tenant.
- Reintroduces dev.63's permissive equipment matching (any attribute text, no name/structure gating), its raw (non-compact) Assets cache, its 1,000-account users cache cutoff, and its single-attempt PDF renderer with no fallback — see `docs/releases/0.1.1-dev.82.md` for the accepted trade-offs.
- Remove the now-inapplicable `0.1.1-dev.64`-`0.1.1-dev.75`, `0.1.1-dev.79`-`0.1.1-dev.81` release notes and their regression tests.

Current development notes: `docs/releases/0.1.1-dev.82.md`.

## 0.1.1-dev.63 - 2026-08-11

- Reduce both Jira cache dialogs to the single `Wymuś odświeżenie` checkbox label.

Current development notes: `docs/releases/0.1.1-dev.63.md`.

## 0.1.1-dev.62 - 2026-08-11

- Keep system credential assignments attached to a stable `SirkWorkflow` identity when a workflow script moves into a subfolder.

Current development notes: `docs/releases/0.1.1-dev.62.md`.

## 0.1.1-dev.61 - 2026-08-11

- Preserve the intrinsic-width marker on the checklist row copied by MeshCentral into the native modal.

Current development notes: `docs/releases/0.1.1-dev.61.md`.

## 0.1.1-dev.60 - 2026-08-11

- Expand the equipment-selection modal to its longest option and keep equipment labels on one line, bounded by the viewport.

Current development notes: `docs/releases/0.1.1-dev.60.md`.

## 0.1.1-dev.59 - 2026-08-11

- Preserve the default `Przekazanie sprzętu` radio state through MeshCentral's native modal HTML transfer.

Current development notes: `docs/releases/0.1.1-dev.59.md`.

## 0.1.1-dev.58 - 2026-08-11

- Restore original Jira aliases for protocol SN and inventory-number fields, including `SN` and `Numer_inwentarzowy`.
- Rebuild the large user checklist once per active-only click and attach its rows in one DOM operation.
- Stretch the Search input from its compact label and select `Przekazanie sprzętu` by default.

Current development notes: `docs/releases/0.1.1-dev.58.md`.

## 0.1.1-dev.57 - 2026-08-11

- Honor Jira Assets `hasMoreResults` ahead of the capped `total`/`isLast` metadata so the daily equipment snapshot continues beyond 1,000 objects.
- Align the Jira User step with the accepted layout: directly clickable active-only checkbox, inline Search row and unlabeled full-width user list.
- Use the `Sprzęt do protokołu` title and an unlabeled full-width multi-equipment checklist.

Current development notes: `docs/releases/0.1.1-dev.57.md`.

## 0.1.1-dev.56 - 2026-08-11

- Add a persistent PNG protocol-logo section with preview and Change action under Settings > General; generated PDFs reuse the same data-root asset.
- Match searchable user and equipment checklist borders to native input fields while preserving the corrected exclusive protocol radio list.
- Keep parsed Jira user/equipment daily snapshots hot in the shared cache owner so each protocol does not reparse the large cache files.
- Paginate the shared Jira directory beyond the former 1,000-account cutoff and remove inherited help text from the final protocol step.

Current development notes: `docs/releases/0.1.1-dev.56.md`.

## 0.1.1-dev.55 - 2026-08-11

- Fix the Jira protocol transfer/return radio list by creating its hidden value owner as an input instead of assigning the read-only `HTMLSelectElement.type` property.

Current development notes: `docs/releases/0.1.1-dev.55.md`.

## 0.1.1-dev.54 - 2026-08-11

- Replace the Jira protocol scope/user split with one native dialog: checked-by-default active-only filter, separate client-side search and cached Jira user selector.
- Render Jira users as a filtered scrollable single-select list with double-click advance, and render transfer/return as mutually exclusive choices without instructional filler.
- Restore multi-equipment protocol selection as a checkbox list and widen the script-owned AQL to all user-equipment types under `Sprzęt użytkownika`.
- Add a separate 24-hour Jira Assets cache alongside the existing users cache; every script-owned AQL reuses its fresh snapshot instead of scanning Jira per protocol.
- Add separately executable `Jira Cache Users` and `Jira Cache Assets` scripts with an optional Force switch, both delegated to the shared server-side cache owner.
- Source the IT person from MeshCentral users and preselect the real name of the current operator.
- Replace the diagnostic bitmap document with styled A4 HTML-to-PDF rendering, a table/signature layout and a logo loaded from `server/assets/protocol-logo.svg`.

Current development notes: `docs/releases/0.1.1-dev.54.md`.

## 0.1.1-dev.53 - 2026-08-11

- Real `0.1.1-dev.52` Jira + MeshCentral smoke confirmed that the Modern dialog lifecycle now advances, but the User selector remained empty because `SharedScriptTools.create()` instances did not expose the shared dynamic-option provider setter used by My Scripts.
- Extend the existing parameter-dialog instance bridge with `setParameterOptionProvider`, so the canonical Automation provider reaches shared User/Asset controls and the backend Jira cache route is actually invoked.
- Point the Jira Asset Protocol script-owned policy at the real CMDB `Komputer` type and its `Nazwa_sieciowa` display attribute; the previous English `Computer` AQL selected four unassigned LanSweeper records and made every user-bound Asset result empty.
- Parenthesize protocol environment-value helper calls inside PowerShell hashtables so Windows PowerShell 5.1 emits the structured execution result instead of failing with an argument-type mismatch before PDF generation.
- Reapply the shared submit-button state after Modern `showModal()` so a host-disabled OK button from a previous dialog cannot make the next Scope step inert.
- Keep the Polish protocol script encoded with UTF-8 BOM so Windows PowerShell 5.1 preserves native text and PDF characters instead of producing mojibake.
- Register shared Modern hidden resolution after native `showModal()` installs its disposal handler, ensuring MeshCentral releases the current modal before the Jira wizard opens its next step.
- Add a focused instance-contract regression and preserve one shared provider owner without polling, timers, observers, custom dialogs or Jira-local option loading. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.53.md`.

## 0.1.1-dev.52 - 2026-08-11

- Real `0.1.1-dev.51` Jira + MeshCentral re-smoke still failed after the first User scope OK: the Modern modal closed and the wizard did not advance, proving the dev.50 wizard-only lifecycle correction ineffective.
- Move the correction to the actual shared owner: successful Modern `openParameterDialog()` submissions now retain validated values and resolve only from the already-attached `hidden.bs.modal` event after MeshCentral finishes hiding the host modal.
- Keep Classic completion immediate and preserve cancel/null, duplicate-submit guard, dynamic option provider and Jira four-step wizard semantics without a timer, polling loop, MutationObserver, custom modal or wizard-local hidden listener.
- Pre-bump PR #298 Actions `31498772028` GREEN on Linux `npm test` and Windows interactive-shell smoke. Real Jira/MeshCentral re-smoke remains required for #296/#290. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.52.md`.

## 0.1.1-dev.51 - 2026-08-11

- Keep `server/core/jira-asset-service.js` as the single Jira user-cache owner: 24h-fresh data is reused, an expired cache refreshes before user-bound Assets resolution, stale data is fallback-only, and Jira tokens are never cached.
- Reserve underscore-prefixed My Scripts paths such as `_shared` for internal reusable content; omit them from the public tree and reject direct public script/API execution paths.
- Keep the My Scripts Credentials key visible in Edit mode for all editable scripts: enabled for local or declared system-credential consumers and disabled/grey when unused, with Jira Asset Protocol declaring `SirkSystemCredential: Jira`.
- Pre-bump PR #295 Actions `31493372964` GREEN on Linux `npm test` and Windows interactive-shell smoke. Real Jira/MeshCentral smoke remains required for #294/#290. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.51.md`.

## 0.1.1-dev.50 - 2026-08-11

- Real `0.1.1-dev.49` Jira + MeshCentral smoke exposed a Modern native-dialog lifecycle failure: accepting the first Jira user-scope step closed the modal and the four-step wizard stopped.
- Remove the wizard-local second `hidden.bs.modal` wait and chain each next step directly from the existing shared `openParameterDialog()` promise, leaving MeshCentral as the single modal lifecycle owner.
- Add a negative regression where the modal still reports `show` and any attempt to attach the obsolete extra hidden listener fails; preserve the same four shared native steps, provider context and no polling/timer/observer/custom-modal behavior.
- Issue #290 remains open for real `0.1.1-dev.50` re-smoke of all four steps and final protocol/PDF flow. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.50.md`.

## 0.1.1-dev.49 - 2026-08-11

- Jira #290: reduce global Jira Admin configuration to reusable connection/discovery credentials and remove the global project/AQL/asset-type/result-limit policy from integration readiness and UI.
- Keep Jira users instance-wide, move dynamic Assets AQL/display/UI-limit/user-binding policy into server-owned script metadata, and paginate Atlassian Assets pages with bounded interactive-provider safety limits.
- Keep the Jira Asset Protocol `Computer`/`Hostname`/`JiraUser` scope in its own script while allowing other scripts to own different or unbound Assets scopes; full audit scripts can page Jira directly through their assigned system credential without a global Assets cap.
- Pre-bump PR #291 Actions `31461688515` GREEN on Linux `npm test` and Windows interactive-shell smoke. Final exact-version CI and real Jira/MeshCentral smoke are required before closing #290. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.49.md`.

## 0.1.1-dev.48 - 2026-08-11

- Complete the shared credentials/native-dialog follow-up for #280/#281 and corrective task packets #284-#288 without adding a second secret store, modal framework, polling loop or per-row credentials request.
- Gate standalone Script credentials on persisted local `SaveSecret*` metadata while keeping System credentials in Definition Editor, and allow known System credential assignments before global readiness with fail-closed runtime checks.
- Keep Definition Editor geometry stable on hover/focus, use one gold active-icon contract for Favorites/Edit/Multi without persistent selected button surfaces, and move Quick `ConfirmExecution` from browser `window.confirm()` to the existing native MeshCentral confirmation lifecycle with exactly-one submit semantics.
- PR #289 exact-head Linux `npm test` and Windows interactive-shell smoke are the merge gate. #128 and #252 remain open for their required real Windows / Jira+MeshCentral acceptance evidence. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.48.md`.

## 0.1.1-dev.47 - 2026-08-10

- Jira #252: restore SiteAdmin-only Jira integration configuration through the existing integration/secret owner, keeping the token write-only and out of browser responses.
- Add the native multi-step Jira Asset Protocol wizard on top of the shared parameter dialog: Active/All Jira user scope -> user -> assigned asset -> transfer/return + IT person -> existing Run/Request lifecycle.
- Preserve 24h Jira user cache, bounded pagination/stale fallback, backend Jira assignment/authorization and existing progress/PDF artifact flow; no browser prompt, custom modal framework or second secret store.
- Pre-bump PR #279 Test #667 / Actions `31416961396` GREEN on Linux `npm test` and Windows interactive-shell smoke. Real Jira/MeshCentral wizard smoke remains required before closing #252. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.47.md`.

## 0.1.1-dev.46 - 2026-08-10

- Move Requests #265: replace the assumed `MoveNodeToMesh` false-success path with the current MeshCentral `changeDeviceMesh` persistence/session/event semantics in the shared device owner.
- Execute as the original requester with same-domain/source-target edit-right/type checks, exactly one node write plus one bounded DB verification read; already-current target is a zero-write success and all missing/error/mismatch paths fail closed.
- Preserve #224 single-pending/idempotency and human-readable summary contracts; pre-bump PR #267 Test #637 / Actions `31403516643` GREEN on Linux `npm test` and Windows interactive-shell smoke. Real MeshCentral move smoke remains required before closing #265. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.46.md`.

## 0.1.1-dev.45 - 2026-08-10

- Jira #252: complete native My Scripts Asset Protocol on top of the existing Jira user/asset provider and request-bound typed PDF artifact owner.
- Revalidate the selected Jira user and current assigned assets server-side, support bounded multi-host input and generic opt-in custom IT person input without a Jira-only form or legacy DirectoryTools runtime.
- Add real milestone progress tied to the Approval request, dependency-free actual PDF generation, exactly-once live auto-open and manual protected Open/Download actions while preserving CSV behavior and withholding Jira credentials from the protocol renderer.
- Pre-bump PR #264 Test #627 / Actions `31401109532` GREEN on Linux `npm test` and Windows interactive-shell smoke. Real Jira + MeshCentral smoke remains required before closing #252. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.45.md`.

## 0.1.1-dev.44 - 2026-08-10

- Shared UI #253: move parameterized execution for Quick, My Commands and My Scripts to one native MeshCentral dialog while preserving existing Output/Results ownership and payload semantics.
- Support text/select/switch/user/asset controls, shared required validation, one bounded option-provider hook, Multi values collected once, and the real `script-tools -> parameter-dialog -> Quick` loader dependency without serializing independent deferred assets.
- Windows #238: carry forward the integrated read-only Windows PowerShell 5.1 `NameSpace(49)` smoke in the maintained workflow; no Shell verb or network mutation.
- Pre-bump #253 Test #607 / Actions `31394561056` GREEN on Linux `npm test` and Windows smoke; #238 original run `31390869438` GREEN. Final exact-version CI required before merge. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.44.md`.

## 0.1.1-dev.43 - 2026-08-10

- Commands #247: expand Multi-device execution from selection-only input to the permission-filtered MeshCentral host catalog using stable `nodeId` identity.
- Add All hosts, visible device groups, visible tags, case-insensitive local name/hostname search, one deduplicated selection `Set`, selected count and bootstrap `maxMultiHostNodes` UI guard without silent truncation.
- Preserve native `checkedNodeids`/current host as initial selection only, existing Commands consumer/payload/approval/confirmation semantics and backend oversized-payload authorization guard.
- Add targeted selector regression coverage; pre-bump full PR Test run `31388059310` GREEN. Final exact-version CI and real MeshCentral smoke are required before closing #247. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.43.md`.

## 0.1.1-dev.42 - 2026-08-10

- Admin #249: remove top-level Permissions and reuse the existing collapsible permission renderer inside My Commands/My Scripts with partial module-only save payloads.
- Admin/Move Requests #248: add target-device-group Level 1/2/3 policy UI using existing `targetMeshApprovalLevels` and module-side normalization; missing mapping shows effective Level 1, explicit empty selection remains `[]`.
- Admin #123: follow real dev.41 evidence (correct only after F5) by rebinding the same observer to replaced Modern stylesheet and current page-43 surface mutations; no polling/second observer/rerender.
- Network Settings #128 remains explicitly deferred by user and is not changed in this build.
- Dev42 Admin gate `31381645620` and canonical runtime PR Test #563 GREEN; final exact-version gate required before merge. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.42.md`.

## 0.1.1-dev.41 - 2026-08-10

- Real `0.1.1-dev.40` smoke: Network Settings and Admin theme/color remain FAIL; keep #128/#123 open and record dev.40 as ineffective.
- Network: match the manually proven elevated Administrator context by reusing the single logged-on-user Scheduled Task owner with `RunLevel Highest` only for trusted built-in `network-adapter-properties`; ordinary user commands remain `Limited`, and the proven FolderItem Properties body is unchanged.
- Admin: derive effective background/color from the first opaque parent surface around native `#p43iframe` instead of assuming parent `body` is the painted page-43 surface; reuse the existing observer/signals and preserve F5/form state.
- Dev41 Patch run `31378927708` and canonical runtime Test #558 (`31379084686`) GREEN before bump; final exact-version suite required before merge. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.41.md`.

## 0.1.1-dev.40 - 2026-08-10

- Real `0.1.1-dev.39` smoke: Network Settings and Admin theme/color switching both still FAIL; record dev.39 as ineffective for #128/#123 and keep both Issues open.
- Network root cause: shared `logged-on-user-command-policy` still rewrote every `runAsUser: 2` command to SYSTEM -> Scheduled Task -> WScript -> hidden PowerShell, so dev.39 never reached native MeshAgent UserOnly semantics. Mark only trusted built-in `network-adapter-properties` as `nativeUserSession` and let the existing policy bypass its script wrapper for that strict catalog-owned path; preserve type 2, route/Up-adapter selection and the proven FolderItem Properties verb.
- Admin root cause: Modern MeshCentral changes the active theme through `#theme-stylesheet.href`; the existing Admin observer did not watch that writer. Reuse the same observer for stylesheet `href` and `load`, then resync after CSS application; retain Classic `body.night`, parent surface copy, F5 recovery and form state without polling/request/rerender.
- Clean pre-bump full `npm test` GREEN in Actions `31375783695`; canonical runtime PR Test #546 GREEN. Final exact-version CI required before merge. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.40.md`.

## 0.1.1-dev.39 - 2026-08-10

- Real `0.1.1-dev.38` smoke: Results/View PASS; #237 completed. Network Settings still FAIL from MC-SIRK although its core FolderItemVerb body works manually; Admin Panel theme/color switching regressed after earlier dev.31 PASS.
- Network root cause: `network-adapter-properties` remained a type-1 CMD preset using `start "" powershell.exe ...`; under the canonical logged-on-user policy that detached the actual UI PowerShell from the runner lifetime. Convert only this preset to direct type-2 PowerShell while preserving `runAsUser: 2`, route/adapter selection, Namespace(49) and the proven Properties/Właściwości `FolderItemVerb.DoIt()` body.
- Admin root cause: the current parent observer watches `data-bs-theme`, but `hostIsDark()` returned legacy parent `nightMode` first. Prefer explicit same-origin parent html/body `data-bs-theme` when present; retain Classic `body.night`/`nightMode`, localStorage/system/computed fallbacks and the existing copied host surface. No second observer, polling, request or rerender.
- Runtime Test #540 GREEN before bump. #128 and #123 remain open for real `0.1.1-dev.39` smoke. #237, #126 and #134 closed from positive real smoke evidence. No tag/GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.39.md`.

## 0.1.1-dev.38 - 2026-08-10

- Follow up real `0.1.1-dev.37` smoke evidence: Network Settings still failed although the same `FolderItemVerb.DoIt()` operation worked manually, and Results View remained visually unchanged.
- Fix the Network invocation root cause: built-in `runAsUser: 2` commands no longer get pre-wrapped by the Commands module into the legacy `SIRK-Desktop-*` interactive-SYSTEM launcher; the existing `server/core/logged-on-user-command-policy.js` is now the single owner of logged-on-user execution.
- Remove the obsolete module-local `desktopLaunch()` / `interactiveDesktopCommand()` implementation instead of layering another launcher, while preserving the Network command body, stable IDs, route/adapter selection and real `Properties/Właściwości` verb.
- Fix the Results geometry owner identified in the native MeshCentral contract: stop passing `extra-large` to `setModalContent()`, so MC-SIRK no longer forces `modal-xl` on `#xxAddAgentModalConf`; result rendering, Copy, CSV, Debug and native close lifecycle remain unchanged.
- Full runtime/shared regression Test #528 is green before the version bump. Keep #128 and #237 open for real `0.1.1-dev.38` re-smoke; no tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.38.md`.

## 0.1.1-dev.37 - 2026-08-10

- Follow up real `0.1.1-dev.36` smoke evidence: Results content is present but the plugin root still owns a second card/viewport geometry inside the native MeshCentral modal, while Network Settings still does not open properties from the plugin.
- Remove standalone Results overlay/viewport geometry and stop mapping `.mc-results-viewer` to a second card, leaving the native MeshCentral modal as the sole outer surface/geometry owner while preserving parsed/table/Copy/CSV/Debug content.
- Tighten Network Settings default-route eligibility so each `Alive` route must map to a `Get-NetAdapter` object with `Status = Up`; preserve IPv4-first/IPv6 fallback and deterministic route/interface metric ordering.
- Replace the dev.36 PIDL/ShellExecuteEx false-success path with the actual `FolderItem.Verbs()` `Properties/Właściwości` verb and `FolderItemVerb.DoIt()` path proven to open the adapter properties UI on the real Windows host.
- Keep Issues #237 and #128 open for real dev.37 re-smoke; keep the revision below `1.0.0` with no tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.37.md`.

## 0.1.1-dev.36 - 2026-08-10

- Follow up real `0.1.1-dev.35` smoke evidence: Results content still flashed instead of presenting one stable final view, and Network Settings still reported launcher start without opening the adapter properties sheet.
- Build and theme the complete canonical Results parsed/table/Copy/CSV/Debug tree before Modern `showModal()` first paint, while preserving the untouched full payload only inside expandable Debug and keeping cleaned output in ordinary Results cells.
- Keep the verified default-route/PIDL Network Settings chain but add `SEE_MASK_NOASYNC` to `ShellExecuteEx` (`0x0000010C`) so the short-lived hidden helper cannot terminate before Shell properties activation completes.
- Verify the exact production Network Settings payload under Windows PowerShell 5.1 and the exact existing scheduled-task/VBS interactive launcher on Windows Server 2025; restore the canonical read-only workflow afterwards.
- Keep Issues #237 and #128 open for real dev.36 re-smoke; keep the revision below `1.0.0` with no tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.36.md`.

## 0.1.1-dev.35 - 2026-08-09

- Follow up real `0.1.1-dev.34` smoke evidence: the Results native modal became opaque but stopped before mounting output, while Network Settings still did not open the selected adapter properties.
- Complete the real MeshCentral Modern `showModal(modalId, okButtonId, ...)` contract with `idx_dlgOkButton` so the host setup returns and the existing canonical result renderer can mount Copy, structured output, CSV Download and Debug content.
- Keep deterministic default-route/InterfaceIndex adapter selection, but replace the ineffective locale-sensitive `FolderItem.InvokeVerb('properties')` path with the Windows-verified `SHGetIDListFromObject` PIDL plus `ShellExecuteEx` canonical `properties` verb using `SEE_MASK_INVOKEIDLIST`.
- Preserve the single logged-on-user desktop launcher, hidden Network Settings helper behavior and Network Control semantics; keep Issues #237 and #128 open for real dev.35 re-smoke.
- Keep the revision below `1.0.0`; no tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.35.md`.

## 0.1.1-dev.34 - 2026-08-09

- Follow up real `0.1.1-dev.33` smoke evidence: the row-level Results `View` button is now visibly native, while the opened Results viewer itself remained transparent; Network Settings still opened no adapter properties and flashed a helper window.
- Move Results viewer presentation from the plugin-owned overlay to the native MeshCentral Modern `setModalContent`/`showModal` or Classic `setDialogMode` dialog surface while keeping the canonical live result/CSV renderer.
- Replace the ineffective `shell:ConnectionsFolder` NameSpace input with the Network Connections CSIDL value `49`, and make the existing interactive launcher honor explicit `-WindowStyle Hidden` without changing visible PowerShell/CMD behavior.
- Add negative regressions that reject the dev.33 namespace and transparent custom viewer path; keep Issues #128 and #237 open for real dev.34 re-smoke and #125 open for its remaining button-theme matrix.
- Keep the revision below `1.0.0`; no tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.34.md`.

## 0.1.1-dev.33 - 2026-08-09

- Follow up real `0.1.1-dev.32` smoke failures for Results View surface, transient Commands/Plugins double selection and Network Settings execution.
- Reuse the existing native secondary button surface for Results `View`, applied synchronously at creation and kept under `MeshThemeAdapter` refresh, without a hardcoded CSS palette.
- Eliminate the `go(19) -> setTimeout(0)` selected-state gap so Commands/Plugins become mutually exclusive in the same transition; keep bounded reconcile only as recovery.
- Target the Windows `shell:ConnectionsFolder` instead of Shell namespace `3` before invoking the active default-route adapter properties.
- Keep Issues #125, #232 and #128 open for real dev.33 re-smoke; no tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.33.md`.

## 0.1.1-dev.32 - 2026-08-09

- Deliver one integrated smoke revision after PR #233 and PR #234 so MeshCentral update detection installs the current single-pending Move Requests and Commands/Plugins selection fixes together.
- Enforce at most one pending Move Request per stable `nodeId` inside the existing serialized approval transaction, preserving external idempotency, terminal/executing records, public payload isolation and one bounded persistence path while exposing terminal `Superseded` history through the shared status catalog.
- Keep Commands and native Plugins `style3sel`/`style3x` mutually exclusive in native view 19 from the existing device integration owner, including F5 reconstruction and Commands -> Plugins -> Commands round trips, without a new handler, observer, polling loop or lifecycle owner.
- Carry forward all dev.31 functionality; keep Issues requiring real MeshCentral evidence open and keep the revision below `1.0.0` with no tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.32.md`.

## 0.1.1-dev.31 - 2026-08-09

- Deliver the Issue #123 F5 correction after real `0.1.1-dev.30` smoke confirmed light/dark now works but native page 43 still loses SIRK Admin after reload.
- Move the actual empty page-43 restore from timing-sensitive `goPageEnd` into the existing serialized `onWebUIStartupEnd` owner, gated by the exact stored SIRK pin, `viewmode=43`, and an empty iframe.
- Keep `goPageStart` as the single ownership recorder/clearer, store the exact plugin pin, and remove duplicate restore state from `goPageEnd`; no timer, observer, polling, backend request or repeated DOM repair.
- Keep Issue #123 open for real MeshCentral F5 re-smoke; keep the revision below `1.0.0` with no tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.31.md`.

## 0.1.1-dev.30 - 2026-08-09

- Deliver the Issue #123 correction after real `0.1.1-dev.29` smoke proved the Admin iframe still stayed black on a light host and disappeared after F5.
- Bind the existing Admin theme owner to the same-origin parent MeshCentral `nightMode`/`body.night` state and copy the parent computed surface without adding a second observer, polling, request or rerender.
- Reuse existing `goPageStart`/`goPageEnd` plus scoped `sessionStorage` ownership to restore only the SIRK native page-43 iframe/title after F5 without hijacking another plugin.
- Keep Issue #123 open for real MeshCentral re-smoke; keep the revision below `1.0.0` with no tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.30.md`.

## 0.1.1-dev.29 - 2026-08-09

- Deliver the real `0.1.1-dev.28` smoke follow-up from PR #225 for Admin theme synchronization, native Devices control isolation and shared Output hover geometry.
- Make Admin consume the explicit MeshCentral `data-bs-theme` signal and existing host/system surface tokens without adding a second observer, polling, request or rerender.
- Scope generic `MeshThemeAdapter` form-control classes to SIRK roots and keep shared Output/detail cards invariant against host hover transform/scale/zoom while preserving host colors and shared column sizing.
- Keep Issues #123, #126 and #134 open for real MeshCentral re-smoke; keep the change below `1.0.0` with no tag or GitHub Release.

Current development notes: `docs/releases/0.1.1-dev.29.md`.

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

- Bump the pre-1.0 development revision so MeshCentral update detection installs the latest Quick Search height fix from current `main`.
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
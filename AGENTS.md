# MC-SIRK AI router

MC-SIRK is the native MeshCentral plugin `SIRKPortal` (SIRK Management Platform), NOT the separate SIRK multi-repository stack. Canonical branch: `main`. Speak Polish. Code/tests are source of truth, not historical notes.

## Request preflight
1. Normalize vague requests internally: goal -> owner -> symbol -> smallest source range -> test. Do not reinterpret the user's requirements.
2. Read `docs/INDEX.md` and exactly one layer index: `server/INDEX.md` backend; `public/INDEX.md` UI; `web/INDEX.md` admin; `scripts/INDEX.md` validation; `test/INDEX.md` regressions.
3. Prefer `node scripts/ai/code-locate.mjs --scope server --text "Symbol"` (or another narrow scope), then `--read server/core/file.js --from 40 --lines 35`. Search before reading. Do not scan `docs/releases`, changelog or all tests by default.
4. For multi-file lookup in Claude, delegate once to read-only `code-locator` (Haiku) and receive only verified path:line and dependencies. In Codex use the configured locator role if an available cheap model is configured; otherwise run targeted CLI search.
5. Inspect entrypoint, implementation, direct consumers and related targeted tests (normally <=5 source/test files); expand only on concrete evidence. Confirm loader and asset map before runtime edits.
6. Run targeted tests first. For required suite, use `node scripts/ai/quiet-run.mjs -- node scripts/run-tests.js`; the wrapper keeps full stdout/stderr locally and returns grouped errors with original exit status. Never treat a suppressed output as a passed test.
7. Keep `docs/PROJECT-STATE.md` current only for architectural/behavioral changes. Decisions and known failures belong in `docs/memory/PROJECT_MEMORY.md`, not copied raw logs.

## Conditional guidance
Read only when relevant:
- Process: `docs/agent/00-Agent-Core.md`, `01-Agent-Tryby.md`, `03-Agent-Jakosc-Bezpieczenstwo.md`.
- Automation/Git/release: `02-Agent-Automation.md`, `05-Agent-Git-Release.md`, `14-Agent-Wersjonowanie-Pre1.md`.
- Tests/docs/secrets/logs: `04-Agent-Testy-Weryfikacja.md`, `06-Agent-Dokumentacja-Stanu.md`, `07-Agent-Konfiguracja-Sekrety.md`, `09-Agent-Logi-Diagnostyka.md`.
- Runtime/plugin: `10-Agent-MeshCentral-Plugin.md`, `11-Agent-SIRK-Portal.md`; performance/reuse: `12-Agent-Wydajnosc-Reuse.md`.
- Issue: `13-Agent-Kontekst-Issues.md` and `.agents/skills/mc-sirk-issue-workflow/SKILL.md`.
- Technology: `20-Agent-PowerShell.md`, `21-Agent-JavaScript.md`, `22-Agent-Python.md`, `30-Agent-Windows.md`, `31-Agent-Linux.md`, `40-Agent-Infrastructure.md`, `41-Agent-Security.md`.
Do not treat archived one-off bootstrap prompts as standing instructions.

## Runtime, security and reuse
- Entry: `SIRKPortal.js -> plugin-main.js -> server/core/runtime.js -> server/modules/*`. Shared UI: `public/shared/*`; renderer: `public/modules/*`; admin: `admin.js`, `web/admin/*`.
- One runtime data root: `meshcentral-data/sirk-platform-data`. Audit events via `MeshCentral.DispatchEvent()`, never a parallel audit-log store. Do not restore legacy alias/loader/MyCompany.
- Authorization must be checked server-side; preserve rights, approval, tenant isolation, session/context boundaries, secrets and input validation. Never weaken signing/TLS/ACL or enable bypass for tests.
- Before adding helpers, observers, timers, CSS, renderers or services search for existing owner. Avoid duplicated UI/lifecycle, DOM churn and unbounded polling. Preserve permission-safe menu, one active view/session and theme/locale behavior when used by current code.
- Work on the actual source used by the loader, not a similar filename. Verify direct consumers, configuration, protocol and negative paths when security relevant.

## Issues and delivery
GitHub Issues are task packets: follow acceptance criteria, keep handoff with evidence/test/commit and a concrete next step. If a fix failed, return to evidence rather than stacking workarounds. Do not close without acceptance.

Product has no 1.0 release. Runtime changes intended for integration require a development bump `0.1.X` in both `package.json` and `config.json`, corresponding history/notes and tests; never revive old `1.8.x` numbering or mint release/tag without authorization. AI-only instruction/test tooling does not change plugin runtime version.

Use a branch/PR for scoped changes; commit/push automatically when verified. Merge when required CI and safety checks pass and diff is expected. No force push, destructive Git operations or production install as routine testing. Run `npm test` (quiet wrapper is equivalent) for runtime, loader, shared UI, permissions, structure or public contracts; targeted tests otherwise. Verify final diff, version sources when applicable and CI status. Distinguish test success from physical MeshCentral acceptance.

Documentation for Claude/Codex hooks and scripts: `docs/ai/OPERATIONS.md`.

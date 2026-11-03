# AI context efficiency - MC-SIRK

This is a routing layer on top of existing `docs/INDEX.md`, not a second memory system. On start: `AGENTS.md` -> one layer index -> symbol search -> bounded source ranges. Source code is authoritative and docs/PROJECT-STATE.md documents verified decisions.

## Quick start

From the repository root:

```powershell
git pull --ff-only
claude
# Or codex; review/trust hooks in the client before relying on them.
```

Use `/code-locate` to find one implementation or `/verify-quiet` for selected checks in Claude. In Codex, activate the corresponding skills from `.agents/skills`. Claude's `code-locator` subagent explicitly uses Haiku for multi-file read-only discovery. Codex's optional locator has no pinned model: assign a cheap available model locally. Spawning a subagent for one known symbol may cost more than direct CLI search.

## Deterministic commands

```powershell
node scripts/ai/code-locate.mjs --scope server/core --text "authorization" --max 20
node scripts/ai/code-locate.mjs --read server/core/runtime.js --from 1 --lines 40
node scripts/ai/quiet-run.mjs -- node test/security.test.js
node scripts/ai/quiet-run.mjs -- node scripts/run-tests.js
node scripts/ai/test-tools.mjs
```

The locator requires an explicit module/file scope, returns only revision/path/line JSON (never matched code), reads at most 80 source lines and excludes obvious secret paths. Do not run across archived releases unless needed.

The quiet runner retains raw stdout and stderr in `.codex-local/ai-logs` and prints one pass line or grouped failures. It preserves command exit code. Normalization groups timestamps only, not user IDs, host IDs or other possible evidence; inspect full logs when grouping is insufficient.

## Hooks and limitations

`.claude/hooks/ContextHook.mjs` scopes vague requests, denies unbounded large Read and historical release dumps, and may replace strongly repeated successful Bash output. Failing outputs are retained. `.codex/hooks.json` uses prompt and pre-tool hooks; it does not claim Claude-specific output rewrite support. Hook trust is client-dependent; review hooks before enabling. No hook can force a model switch or guarantee token savings.

Tests `scripts/ai/test-tools.mjs` use isolated Git fixtures and confirm bounded source reads, prompt routing, timestamp-only deduplication and failure exit codes. They do not validate plugin behavior; existing `npm test` remains authoritative.

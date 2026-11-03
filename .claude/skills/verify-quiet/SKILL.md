---
name: verify-quiet
description: Run a targeted test or full MC-SIRK test suite with errors-only output, unique diagnostics and unchanged exit status.
---

Select smallest relevant test through `test/INDEX.md`; invoke `node scripts/ai/quiet-run.mjs -- node test/<name>.test.js`. For runtime/loader/shared UI/security or release changes, run `node scripts/ai/quiet-run.mjs -- node scripts/run-tests.js`. Full raw stdout/stderr: `.codex-local/ai-logs`; do not paste logs into the main context. Never hide distinct failures or claim real MeshCentral acceptance from synthetic tests.

---
name: code-locate
description: Locate MC-SIRK implementation and callers in one module with exact path:line references and minimal source output.
---

Use `docs/INDEX.md` to select layer, then invoke `node scripts/ai/code-locate.mjs --scope server --text "Symbol" --max 20`. For a known range: `node scripts/ai/code-locate.mjs --read server/core/runtime.js --from 1 --lines 35`. Other scopes: public, web, test, scripts or an exact root filename. Never scan historical release notes without relevant acceptance. Show only owner, direct dependencies, line ranges and uncertainty. No source dumps.

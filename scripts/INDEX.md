# Validation scripts index

Główna komenda:

```bash
npm test
```

## Walidatory

| Cel | Plik |
|---|---|
| finalna struktura repozytorium | `validate-repository-layout.js` |
| statyczna kontrola sekretów i nowych prymitywów wykonania | `scripts/security-review.js` |
| kontrakty architektury | `validate-architecture.js` |

Pełna kolejność znajduje się w `package.json`.

Dla prostego sprawdzenia uruchom najpierw walidator najbliższy zmianie. Pełne `npm test` jest wymagane po zmianie runtime, loaderów, struktury katalogów, wspólnych komponentów albo bezpieczeństwa.

## AI CLI (bez zmian runtime)

- `scripts/ai/code-locate.mjs` — jedno scope, symbol i numery linii (bez dumpu kodu).
- `scripts/ai/quiet-run.mjs` — testy z pelnymi lokalnymi logami i deduplikacja bledow.
- `scripts/ai/test-tools.mjs` — izolowane fixture dla hookow i wrapperow.
- `docs/ai/OPERATIONS.md` — uzycie Claude/Codex i hookow.

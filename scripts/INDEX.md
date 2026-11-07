# Validation scripts index

Główna komenda:

```bash
npm test
```

## Walidatory

| Cel | Plik |
|---|---|
| indeks skryptów | `scripts/INDEX.md` |
| pełny zestaw walidatorów i testów (`npm test`) | `scripts/run-tests.js` |
| finalna struktura repozytorium | `scripts/validate-repository-layout.js` |
| kontrakty architektury | `scripts/validate-architecture.js` |

Pełna kolejność znajduje się w `scripts/run-tests.js`: najpierw `scripts/validate-repository-layout.js`, potem `scripts/validate-architecture.js`, a następnie wszystkie pliki `test/*.test.js` posortowane według nazwy. `package.json` wskazuje ten runner jako entrypoint `npm test`.

Dla prostego sprawdzenia uruchom najpierw walidator najbliższy zmianie. Pełne `npm test` jest wymagane po zmianie runtime, loaderów, struktury katalogów, wspólnych komponentów albo bezpieczeństwa.

## AI CLI (bez zmian runtime)

- `scripts/ai/code-locate.mjs` — jedno scope, symbol i numery linii (bez dumpu kodu).
- `scripts/ai/quiet-run.mjs` — testy z pelnymi lokalnymi logami i deduplikacja bledow.
- `scripts/ai/test-tools.mjs` — izolowane fixture dla hookow i wrapperow.
- `docs/ai/OPERATIONS.md` — uzycie Claude/Codex i hookow.

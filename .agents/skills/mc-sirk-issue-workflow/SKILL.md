---
name: mc-sirk-issue-workflow
description: Użyj do wykonania lub kontynuacji zadania reprezentowanego przez GitHub Issue w Eris92/MC-SIRK.
---

# MC-SIRK Issue workflow

1. Przeczytaj root `AGENTS.md` i `docs/INDEX.md`.
2. Przeczytaj wskazane Issue i ostatni handoff.
3. Wybierz jeden właściwy INDEX warstwy.
4. Czytaj tylko entrypoint/ownera, bezpośrednich konsumentów i targeted tests.
5. Stosuj `docs/agent/12-Agent-Wydajnosc-Reuse.md` dla zmian runtime/UI/refactor/performance.
6. Nie rozszerzaj scope o niezależne problemy — zaproponuj osobne Issue.
7. Po implementacji wykonaj targeted tests; `npm test` tylko gdy wymaga tego wspólny runtime/contract lub AGENTS.md.
8. Nie uznawaj zadania za rozwiązane, jeśli acceptance criteria nie są spełnione.
9. Po spełnieniu acceptance criteria i wymaganych testów automatycznie wykonaj commit i push zgodnie z projektowym workflow branch/PR, a następnie zapisz w Issue: root cause/decision, changed files, tests, commit/PR, risks i next step.
10. Gdy użytkownik zgłasza „nie działa”, traktuj poprzednią próbę jako nieskuteczną, nie zamykaj Issue i kontynuuj diagnostykę od aktualnego kodu/stanu Issue.

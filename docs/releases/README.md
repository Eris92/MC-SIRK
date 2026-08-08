# Release / development notes

MC-SIRK nie ma jeszcze pierwszego kompletnego product release.

Aktualna linia development:

- [`0.1.1-dev.18`](0.1.1-dev.18.md) — bieżąca rewizja development z pełnym native `modal-header -> modal-body -> modal-footer` surface contractem dla Move Request po real dev.17 re-smoke;
- [`0.1.1-dev.17`](0.1.1-dev.17.md) — poprzednia rewizja development z pełnym native `modal -> modal-dialog -> modal-content` chainem dla Move Request po real dev.16 re-smoke;
- [`0.1.1-dev.16`](0.1.1-dev.16.md) — poprzednia rewizja development z pełnym native modal variable-owner chainem dla Move Request po real dev.15 re-smoke;
- [`0.1.1-dev.15`](0.1.1-dev.15.md) — poprzednia rewizja development z natywnym `modal-content` dla Move Request i primary Submit po real dev.14 re-smoke;
- [`0.1.1-dev.14`](0.1.1-dev.14.md) — poprzednia rewizja development z class-specific opaque surface dla `.mc-move-dialog.card` po real dev.13 re-smoke;
- [`0.1.1-dev.13`](0.1.1-dev.13.md) — poprzednia rewizja development z opacity-safe layered surface dialogu Move Request;
- [`0.1.1-dev.12`](0.1.1-dev.12.md) — poprzednia rewizja development z pierwszą próbą nieprzezroczystego surface dialogu Move Request;
- [`0.1.1-dev.11`](0.1.1-dev.11.md) — poprzednia rewizja development po corrective UI smoke follow-up dla stabilnego indicator/icon geometry, wspólnego Approval list style i wycentrowanych Results actions;
- [`0.1.1-dev.10`](0.1.1-dev.10.md) — poprzednia rewizja development po corrective runtime smoke follow-up dla wspólnej osi first-column icons i kompaktowej kolumny View;
- [`0.1.1-dev.9`](0.1.1-dev.9.md) — poprzednia rewizja development po corrective runtime smoke follow-up dla row geometry, command labels, Results containment i human-readable Move Request summaries;
- [`0.1.1-dev.8`](0.1.1-dev.8.md) — poprzednia rewizja development ze stałym rozmiarem ikon 1. kolumny przy Collapse/Expand do real MeshCentral smoke;
- [`0.1.1-dev.7`](0.1.1-dev.7.md) — poprzednia rewizja development z krótszymi Commands labels, neutralnym shared navigation UI i czytelnymi tabelami Results do real MeshCentral smoke;
- [`0.1.1-dev.6`](0.1.1-dev.6.md) — poprzednia rewizja development z poprawką collapsed-primary dla geometrii Edit/Multi do real MeshCentral re-smoke;
- [`0.1.1-dev.5`](0.1.1-dev.5.md) — poprzednia rewizja development ze wspólną geometrią Edit/Multi;
- [`0.1.1-dev.4`](0.1.1-dev.4.md) — poprzednia rewizja development z atomic Edit lifecycle fix;
- [`0.1.1-dev.3`](0.1.1-dev.3.md) — poprzednia rewizja development z fixem Quick Search height;
- [`0.1.1-dev.2`](0.1.1-dev.2.md) — poprzednia rewizja development do aktualizacji i real MeshCentral re-smoke;
- [`0.1.1-dev.1`](0.1.1-dev.1.md) — poprzedni pre-1.0 development baseline.

Preferowana konwencja użytkownika `0.1.1.X` jest reprezentowana w npm/plugin metadata jako SemVer-compatible `0.1.1-dev.X`.

Pierwsze pełne wydanie produktu jest zarezerwowane dla `1.0.0` i wymaga jawnego release gate opisanego w `docs/agent/14-Agent-Wersjonowanie-Pre1.md`.

## Historyczne dokumenty

Pliki `1.8.x.md` w tym katalogu są historycznymi snapshotami wewnętrznego developmentu. Nie są źródłem bieżącej numeracji i nie oznaczają, że produkt osiągnął pierwsze wydanie.

Nie rekonstruuj, nie kontynuuj ani nie promuj numeracji `1.8.x` jako aktualnej linii produktu.

## Przy zmianie wersji

1. odczytaj `docs/agent/14-Agent-Wersjonowanie-Pre1.md`;
2. zwiększ tylko rewizję `0.1.1-dev.X`, jeśli bump jest wymagany;
3. utrzymaj identyczną wersję w `package.json` i `config.json`;
4. zaktualizuj bieżące development notes, `changelog.md` i `version-history.json` jeśli zadanie obejmuje wersję;
5. uruchom wymagane targeted tests, a przed świadomym release pełne `npm test` i real MeshCentral smoke test;
6. nie twórz taga/GitHub Release bez jawnego polecenia użytkownika.

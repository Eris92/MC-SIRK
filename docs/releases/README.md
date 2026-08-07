# Release / development notes

MC-SIRK nie ma jeszcze pierwszego kompletnego product release.

Aktualna linia development:

- [`0.1.1-dev.5`](0.1.1-dev.5.md) — bieżąca rewizja development ze wspólną stabilną geometrią Edit/Multi do real MeshCentral re-smoke;
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

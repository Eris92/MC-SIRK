# Release / development notes

MC-SIRK nie ma jeszcze pierwszego kompletnego product release.

Aktualna linia development:

- [`0.1.131`](0.1.131.md) — adds server-side single-flight for ordinary My Scripts executions so duplicate active requests reuse one underlying child process;
- [`0.1.130`](0.1.130.md) — single-flights My Scripts browser submissions and makes Results download the newest generated CSV through a dedicated attachment action without navigating the MeshCentral page;
- [`0.1.129`](0.1.129.md) — loads reset users directly from the canonical Jira cache and resolves only the selected UPN against AD at execution time instead of blocking dialog open on a whole-cache AD intersection;
- [`0.1.128`](0.1.128.md) — changes only AD account create/reset SMS wording to ASCII-safe Polish without diacritics after repeated real received-message mojibake;
- [`0.1.127`](0.1.127.md) — makes bundled My Scripts metadata, dynamic options and execution share one canonical `seed/MyScripts` source instead of allowing stale persistent script trees to shadow current definitions;
- [`0.1.126`](0.1.126.md) — makes Git deployment fail closed unless the actual MeshCentral service loads the exact staged MC-SIRK runtime, proven by artifact hashes and a fresh runtime-state marker;
- [`0.1.125`](0.1.125.md) — made development revisions visible to MeshCentral's plugin updater and added version-aware backend reload; real smoke later remained completely unchanged, so deployment activation was not proven;
- [`0.1.1-dev.124`](0.1.1-dev.124.md) — removed the ActiveDirectory module/CLIXML selector path with a bounded UTF-8 DirectoryServices bridge; real smoke later remained unchanged;
- [`0.1.1-dev.123`](0.1.1-dev.123.md) — bounded Jira-UPN/AD matching and ASCII-safe UTF-8 percent-encoded Windows PowerShell SMS forms;
- [`0.1.1-dev.122`](0.1.1-dev.122.md) — corrected the AD reset cache credential boundary and explicit UTF-8 SMS transport;
- [`0.1.1-dev.121`](0.1.1-dev.121.md) — direct built-in message workflows and the first Jira-cache/AD reset selector candidate.

Dokładny indeks wszystkich wcześniejszych development notes do stanu sprzed `0.1.126` jest zachowany w [`README-through-0.1.125.md`](README-through-0.1.125.md). Historyczne pliki per-revision pozostają bez zmian w tym katalogu. Dokładny changelog i version history do `0.1.1-dev.124` są dodatkowo zachowane w `changelog-through-0.1.1-dev.124.md` i `version-history-through-0.1.1-dev.124.json`.

Od rewizji 125 bieżąca konwencja npm/plugin metadata to numeric `0.1.X`; poprzednie `0.1.1-dev.X` pozostają historycznymi snapshotami wcześniejszego developmentu.

Pierwsze pełne wydanie produktu jest zarezerwowane dla `1.0.0` i wymaga jawnego release gate opisanego w `docs/agent/14-Agent-Wersjonowanie-Pre1.md`.

## Historyczne dokumenty

Pliki `1.8.x.md` w tym katalogu są historycznymi snapshotami wewnętrznego developmentu. Nie są źródłem bieżącej numeracji i nie oznaczają, że produkt osiągnął pierwsze wydanie.

Nie rekonstruuj, nie kontynuuj ani nie promuj numeracji `1.8.x` jako aktualnej linii produktu.

## Przy zmianie wersji

1. odczytaj `docs/agent/14-Agent-Wersjonowanie-Pre1.md`;
2. zwiększ trzeci segment rewizji `0.1.X`, jeśli bump jest wymagany;
3. utrzymaj identyczną wersję w `package.json` i `config.json`;
4. zaktualizuj bieżące development notes, `changelog.md` i `version-history.json` jeśli zadanie obejmuje wersję;
5. uruchom wymagane targeted tests, a przed świadomym release pełne `npm test` i real MeshCentral smoke test;
6. nie twórz taga/GitHub Release bez jawnego polecenia użytkownika.

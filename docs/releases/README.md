# Release / development notes

MC-SIRK nie ma jeszcze pierwszego kompletnego product release.

Aktualna linia development:

- [`0.1.168`](0.1.168.md) — signed RDP template mismatch diagnostics;
- [`0.1.167`](0.1.167.md) — script editor shows per-script CA template and RDP thumbprint;
- [`0.1.166`](0.1.166.md) — signed RDP: certificate by thumbprint or template (autoenroll);
- [`0.1.165`](0.1.165.md) — per-script CA template and RDP thumbprint;
- [`0.1.164`](0.1.164.md) — Quick re-reads vulnerability rules on open;
- [`0.1.163`](0.1.163.md) — Quick Undo clears the repaired mark (Fix/Undo intent);
- [`0.1.162`](0.1.162.md) — run dialog text contrast in light theme;
- [`0.1.161`](0.1.161.md) — Modern dialog button labels (Restart showed „Usuń”);
- [`0.1.160`](0.1.160.md) — Quick run dialog progress (elapsed time, status), close while running, timeout message; pending live smoke;
- [`0.1.159`](0.1.159.md) — Quick vulnerability Fix/Undo dialog with result; admin light/dark palette; pending live smoke;
- [`0.1.158`](0.1.158.md) — Entra SMS/Voice policy scope CSV report (#418); pending real Entra smoke;
- [`0.1.157`](0.1.157.md) — CSR upload, Enterprise CA signing and verified certificate download (#407); pending real CA smoke;
- [`0.1.156`](0.1.156.md) — shared CA integration, CA script category and signed RDP file command (#405, #406; integrated after 0.1.155); pending real device smoke;
- [`0.1.155`](0.1.155.md) — vulnerability rule type "Description" (text only, no Fix buttons); pending real smoke;
- [`0.1.154`](0.1.154.md) — Reboot request checkbox in vulnerability rules, red restart notice in Quick; pending real smoke;
- [`0.1.153`](0.1.153.md) — Vulnerabilities is the first Quick category; pending real smoke;
- [`0.1.152`](0.1.152.md) — Quick: rule reason, Fix/Undo side by side, repaired findings stay visible; pending real smoke;
- [`0.1.151`](0.1.151.md) — Quick Fix/Undo buttons styled in both MeshCentral UI themes; pending real smoke;
- [`0.1.150`](0.1.150.md) — Quick vulnerability row: actions only, fields in the details column; pending real smoke;
- [`0.1.149`](0.1.149.md) — Nessus hosts matched by host name without domain, never by IP; pending real smoke;
- [`0.1.148`](0.1.148.md) — Nessus CSV Repair column; repaired findings hidden until a newer scan; pending real smoke;
- [`0.1.147`](0.1.147.md) — Quick vulnerability buttons no longer squeezed by the tree icon grid; pending real smoke;
- [`0.1.146`](0.1.146.md) — expandable Quick vulnerability rows, collapsed scan summary behind View in Quick and Commands; pending real smoke;
- [`0.1.145`](0.1.145.md) — rules table in settings, rollback command, per-row Fix/Undo in Commands, compact Quick table, reboot-required script flag; pending real smoke;
- [`0.1.144`](0.1.144.md) — vulnerability exclusions/remediation rules, Fix actions, Quick table and My Scripts all-host table after first smoke; pending real smoke;
- [`0.1.141`](0.1.141.md) — adds the Nessus vulnerability dataset (#422) with Commands/Quick views, Desktop alert and an all-host My Script report (#423–#425); pending real smoke;
- [`0.1.139`](0.1.139.md) — fixes the real Quick concurrency regression with a server-resolved execution marker while keeping ordinary per-node guard; pending real smoke;
- [`0.1.138`](0.1.138.md) — adds explicit MeshCentral actor attribution to Jira Assets object comments after successful confirmation (Cloud Comments endpoint unsupported; real smoke required);
- [`0.1.134`](0.1.134.md) — allows concurrent native Desktop Quick direct launches on one device while preserving the ordinary per-node agent command guard;
- [`0.1.133`](0.1.133.md) — makes Entra ID My Scripts use the global Entra/AAD integration credentials instead of duplicate per-script tenant/client secrets;
- [`0.1.132`](0.1.132.md) — keeps full CSV diagnostics in Debug while the normal Results body shows only the current downloadable report and latest record count;
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

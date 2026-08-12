# Release / development notes

MC-SIRK nie ma jeszcze pierwszego kompletnego product release.

Aktualna linia development:

- [`0.1.1-dev.69`](0.1.1-dev.69.md) — isolate Windows admin tests from machine-wide fallback settings while preserving the production default;
- [`0.1.1-dev.68`](0.1.1-dev.68.md) — renderer-owned direct PDF fallback after real dev.67 Edge failure still escaped the protocol lifecycle;
- [`0.1.1-dev.67`](0.1.1-dev.67.md) — keep styled Jira protocol PDF first, then reuse the existing direct PDF renderer as a bounded browser-failure fallback;
- [`0.1.1-dev.66`](0.1.1-dev.66.md) — exclude Jira identity objects from assigned Assets and add bounded Edge PDF compatibility retry;
- [`0.1.1-dev.65`](0.1.1-dev.65.md) — invalidate the legacy 1000-user cache snapshot and expose workspace-wide user-bound Jira Assets;
- [`0.1.1-dev.64`](0.1.1-dev.64.md) — Windows service-safe styled protocol PDF rendering with an isolated per-render Chrome/Edge profile;
- [`0.1.1-dev.63`](0.1.1-dev.63.md) — concise Force-only Jira cache dialogs;
- [`0.1.1-dev.62`](0.1.1-dev.62.md) — stable workflow credential assignment across script folder moves;
- [`0.1.1-dev.61`](0.1.1-dev.61.md) — native-modal-safe equipment width marker;
- [`0.1.1-dev.60`](0.1.1-dev.60.md) — intrinsic-width Jira equipment modal with unwrapped option labels;
- [`0.1.1-dev.59`](0.1.1-dev.59.md) — native-modal persistence for the default Jira protocol radio selection;
- [`0.1.1-dev.58`](0.1.1-dev.58.md) — restored SN/inventory aliases, bounded active-only rendering and corrected protocol defaults;
- [`0.1.1-dev.57`](0.1.1-dev.57.md) — complete Jira Assets pagination plus corrected active-only and full-width Jira protocol lists;
- [`0.1.1-dev.56`](0.1.1-dev.56.md) — persistent shared protocol-logo upload and native field borders for Jira user/equipment lists;
- [`0.1.1-dev.55`](0.1.1-dev.55.md) — corrective Jira transfer/return list control after real Modern smoke exposed a read-only `HTMLSelectElement.type` assignment;
- [`0.1.1-dev.54`](0.1.1-dev.54.md) — Jira protocol searchable users, shared 24h equipment cache, checkbox multi-selection, MeshCentral IT identity and styled logo PDF;
- [`0.1.1-dev.53`](0.1.1-dev.53.md) — corrective shared dynamic-option provider bridge after real dev.52 smoke exposed an empty Jira User selector; real Jira/MeshCentral User -> Asset -> Protocol -> PDF smoke pending;
- [`0.1.1-dev.52`](0.1.1-dev.52.md) — corrective Modern parameter-dialog lifecycle: successful submit resolves only after host `hidden.bs.modal`, preventing the next Jira wizard step from racing a still-closing modal;
- [`0.1.1-dev.51`](0.1.1-dev.51.md) — Jira user cache refresh-before-Assets contract, hidden internal `_shared` My Scripts paths i always-visible disabled/enabled Credentials action; real Jira/MeshCentral smoke pending;
- [`0.1.1-dev.50`](0.1.1-dev.50.md) — corrective Jira wizard follow-up po real dev.49 FAIL: next step chains from the shared dialog promise without a second modal-hidden wait; real Jira/MeshCentral re-smoke pending;
- [`0.1.1-dev.49`](0.1.1-dev.49.md) — Jira #290: global integration connection-only, script-owned Assets scope/user binding i paginated dynamic options; real Jira/MeshCentral smoke pending;
- [`0.1.1-dev.48`](0.1.1-dev.48.md) — shared credentials/native-dialog/UI follow-up dla #280/#281/#284-#288; real MeshCentral smoke pending;
- [`0.1.1-dev.47`](0.1.1-dev.47.md) — Jira #252: secure SiteAdmin-only integration setup plus native multi-step Jira Asset Protocol wizard with Active/All user scope and cached dynamic options; real Jira/MeshCentral smoke pending;
- [`0.1.1-dev.46`](0.1.1-dev.46.md) — Move Requests #265: verified current MeshCentral changeDeviceMesh execution, fail-closed persistence verification i zachowane #224 single-pending; real move smoke pending;
- [`0.1.1-dev.45`](0.1.1-dev.45.md) — Jira Asset Protocol #252: canonical workflow, authoritative asset recheck, real milestone progress, dependency-free PDF i protected exactly-once Open/Download; real Jira/MeshCentral smoke pending;
- [`0.1.1-dev.44`](0.1.1-dev.44.md) — shared native execution parameter dialog (#253) plus real Windows Shell smoke infrastructure (#238); real MeshCentral parameter-dialog smoke pending;
- [`0.1.1-dev.43`](0.1.1-dev.43.md) — Commands #247: multi-device selector z All hosts, device groups, tagami, client-side search, stable nodeId dedupe i bootstrap maxMultiHostNodes; real MeshCentral smoke pending;
- [`0.1.1-dev.42`](0.1.1-dev.42.md) — Admin backlog: module-local Permissions, Move Request approval levels per target device group i live theme owner rebinding; Network #128 deferred;
- [`0.1.1-dev.41`](0.1.1-dev.41.md) — follow-up po real dev.40 FAIL: Network Settings używa trusted elevated interactive token w istniejącym shared ownerze; Admin kopiuje rzeczywistą nieprzezroczystą powierzchnię otaczającą `#p43iframe`;
- [`0.1.1-dev.40`](0.1.1-dev.40.md) — follow-up po real dev.39 FAIL: Network Settings omija script-oriented Scheduled Task wrapper i trafia do native MeshAgent UserOnly; Admin obserwuje rzeczywisty Modern `#theme-stylesheet` writer/load;
- [`0.1.1-dev.39`](0.1.1-dev.39.md) — follow-up po real `0.1.1-dev.38` smoke: Network Settings wykonuje sprawdzony PowerShell bezpośrednio przez shared logged-on-user runner; Admin preferuje jawny parent `data-bs-theme` przed legacy `nightMode` przy zachowaniu Classic fallback;
- [`0.1.1-dev.38`](0.1.1-dev.38.md) — follow-up po real `0.1.1-dev.37` smoke: Network Settings korzysta z jednego shared logged-on-user launch ownera zamiast modułowego interactive-SYSTEM pre-wrappera; Results nie wymusza już natywnego `modal-xl`;
- [`0.1.1-dev.37`](0.1.1-dev.37.md) — follow-up po real `0.1.1-dev.36` smoke: Results bez podwójnej powierzchni/geometrii oraz Network Settings wybierający tylko adapter `Up` i wykonujący rzeczywisty Shell `Properties/Właściwości` verb;
- [`0.1.1-dev.36`](0.1.1-dev.36.md) — follow-up po real `0.1.1-dev.35` smoke: finalny Results first paint z parsed/table + pełnym Debug oraz synchroniczne Shell properties activation dla Network Settings;
- [`0.1.1-dev.35`](0.1.1-dev.35.md) — poprzedni follow-up po real `0.1.1-dev.34` smoke: kompletny Modern Results modal contract oraz pierwsza PIDL/ShellExecuteEx próba Network Settings, nadal nieskuteczna w real smoke;
- [`0.1.1-dev.34`](0.1.1-dev.34.md) — poprzedni follow-up po real `0.1.1-dev.33` smoke: Results viewer na natywnym dialog managerze MeshCentral oraz nieskuteczna próba `InvokeVerb('properties')` dla Windows Network Settings;
- [`0.1.1-dev.33`](0.1.1-dev.33.md) — poprzedni follow-up po real `0.1.1-dev.32` smoke: Results View na standardowym native secondary surface, natychmiastowa wzajemna wyłączność Commands/Plugins oraz pierwsza nieskuteczna próba Windows ConnectionsFolder dla Network Settings;
- [`0.1.1-dev.32`](0.1.1-dev.32.md) — poprzednia zintegrowana rewizja smoke po PR #233/#234: single-pending Move Requests per stable host oraz wzajemnie wykluczające się zaznaczenie Commands/Plugins;
- [`0.1.1-dev.31`](0.1.1-dev.31.md) — poprzednia rewizja development z F5 startup recovery dla SIRK Admin po real dev.30 smoke; light/dark z dev.30 pozostaje zachowane;
- [`0.1.1-dev.30`](0.1.1-dev.30.md) — poprzednia rewizja development z korektą Admin po real dev.29 smoke: parent-owned light/dark oraz pierwsza, nieskuteczna próba scoped recovery natywnego page-43 iframe po F5;
- [`0.1.1-dev.29`](0.1.1-dev.29.md) — poprzednia rewizja development z poprawkami po real dev.28 smoke: synchronizacja Admin light/dark, izolacja natywnej geometrii Devices od SIRK form classes oraz stabilna geometria Output na hover;
- [`0.1.1-dev.28`](0.1.1-dev.28.md) — poprzednia rewizja development z większym wspólnym kontraktem ikon 2. kolumny: 28 px slot / 24 px SVG dla My Scripts, My Commands, Approval Center i Quick;
- [`0.1.1-dev.27`](0.1.1-dev.27.md) — poprzednia rewizja development z idempotentną rekonsyliacją widocznego stanu left menu bez ponownych zapisów klas, active state, source i geometrii ikon;
- [`0.1.1-dev.26`](0.1.1-dev.26.md) — tworzenie brakujących SIRK left-menu nodes dopiero po bieżącym natywnym `goPageEnd`, bez host-redraw blink/recreate race;
- [`0.1.1-dev.25`](0.1.1-dev.25.md) — poprzednia rewizja development z finalnym left-menu contractem już w pierwszym `core.ensureMenu()`, większym artworkiem i białą Classic family bez deferred reflow;
- [`0.1.1-dev.24`](0.1.1-dev.24.md) — poprzednia rewizja development z jednym ownerem rodziny/source ikon menu i bez późnej podmiany Modern SVG na białe Font Awesome;
- [`0.1.1-dev.23`](0.1.1-dev.23.md) — poprzednia rewizja development z bootstrap requestem uruchamianym zaraz po `core.js` i runtime-owned permission-safe Move Request host action;
- [`0.1.1-dev.22`](0.1.1-dev.22.md) — poprzednia rewizja development z wcześniejszym permission-safe bootstrap menu, równoległym bounded startupem rendererów i replay natywnego node/page contextu;
- [`0.1.1-dev.21`](0.1.1-dev.21.md) — poprzednia rewizja development z usuniętym Move Request host-button readiness retry staircase i synchronicznym reuse natywnych lifecycle callbacks;
- [`0.1.1-dev.20`](0.1.1-dev.20.md) — poprzednia rewizja development z poprawnym routingiem Move Request do natywnego Modern `setModalContent`/`showModal` albo Classic `setDialogMode`;
- [`0.1.1-dev.19`](0.1.1-dev.19.md) — poprzednia rewizja development z natywnym host dialog ownerem, zastąpiona po real dev.19 smoke ujawniającym błędny Modern `setDialogMode` contract;
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

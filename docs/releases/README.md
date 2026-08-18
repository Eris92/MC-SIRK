# Release / development notes

MC-SIRK nie ma jeszcze pierwszego kompletnego product release.

Aktualna linia development:

- [`0.1.1-dev.122`](0.1.1-dev.122.md) — corrects the dev.121 real-smoke AD reset cache credential boundary and preserves Polish SMS text through explicit UTF-8 transport;
- [`0.1.1-dev.121`](0.1.1-dev.121.md) — built-in SMS/Voice SMS/SMTP Relay default to direct execution, while Approval Center immediately transitions requester confirmations and shows Jira User/Assets context;
- [`0.1.1-dev.120`](0.1.1-dev.120.md) — Jira Asset Protocol moves the generated date to the top-right header and removes duplicated participant metadata above the equipment sections;
- [`0.1.1-dev.119`](0.1.1-dev.119.md) — Jira Asset Protocol uses fixed `Użytkownik` / `Przedstawiciel IT` participant labels while the equipment table remains the receive/return direction owner;
- [`0.1.1-dev.118`](0.1.1-dev.118.md) — Jira protocol PDF keeps the logo left-aligned while centering the protocol title across the shared A4 header;
- [`0.1.1-dev.117`](0.1.1-dev.117.md) — Jira protocol PDF preserves the full 72 px signature area in print/PDF output instead of compressing it to 32 px;
- [`0.1.1-dev.116`](0.1.1-dev.116.md) — Jira protocol PDF title is stacked on a separate line below the existing logo after real generated-PDF feedback;
- [`0.1.1-dev.115`](0.1.1-dev.115.md) — Jira protocol equipment Search updates on every typed character using the existing shared dialog owner and prefetched local inventory;
- [`0.1.1-dev.114`](0.1.1-dev.114.md) — Jira protocol PDF header top-aligns the logo and lowers the title for clearer visual hierarchy;
- [`0.1.1-dev.113`](0.1.1-dev.113.md) — Jira protocol changes table shows only actual receive/return operations with simplified business legend;
- [`0.1.1-dev.112`](0.1.1-dev.112.md) — Jira protocol title and equipment-state acknowledgement wording correction after real dev.111 acceptance;
- [`0.1.1-dev.111`](0.1.1-dev.111.md) — searchable optional warehouse handover and current-user return steps after the dev.110 Jira wizard real-smoke failure;
- [`0.1.1-dev.110`](0.1.1-dev.110.md) — requester-confirmed mixed per-asset Jira Asset Protocol changes with authoritative final inventory and bounded CMDB writes;
- [`0.1.1-dev.109`](0.1.1-dev.109.md) — restored the proven `Sprzęt użytkownika` Jira protocol/cache scope while retaining authoritative total-count pagination and truthful cache reporting;
- [`0.1.1-dev.108`](0.1.1-dev.108.md) — authoritative Jira Assets total-count pagination, workspace-wide scope and truthful cache completion count;
- [`0.1.1-dev.107`](0.1.1-dev.107.md) — restored bounded Jira Assets pagination, compact cache and explicit user binding on current main;
- [`0.1.1-dev.106`](0.1.1-dev.106.md) — workflow-key system credential propagation to PowerShell;
- [`0.1.1-dev.105`](0.1.1-dev.105.md) — optional SMTP sender and port 25 fallback;
- [`0.1.1-dev.104`](0.1.1-dev.104.md) — confirmed integration secret saves and stale backend detection;
- [`0.1.1-dev.103`](0.1.1-dev.103.md) — optical correction of the Settings gear center;
- [`0.1.1-dev.102`](0.1.1-dev.102.md) — neutral Active Directory UPN and OU placeholder examples;
- [`0.1.1-dev.101`](0.1.1-dev.101.md) — configurable SMTP Relay mail with multiline body, HTML and bounded attachments;
- [`0.1.1-dev.100`](0.1.1-dev.100.md) — neutral cache script filenames and labels without a Jira prefix;
- [`0.1.1-dev.99`](0.1.1-dev.99.md) — equipment prefetch while the Jira protocol user modal remains visible;
- [`0.1.1-dev.98`](0.1.1-dev.98.md) — SMSAPI/Voice SMS, external send API oraz zatwierdzane workflow resetu i tworzenia kont AD;
- [`0.1.1-dev.97`](0.1.1-dev.97.md) — internal hourly Windows Task Scheduler refresh for both Jira cache files without embedded credentials;
- [`0.1.1-dev.96`](0.1.1-dev.96.md) — Jira cache administration scripts moved under `settings/Jira`; JSON cache storage unchanged;
- [`0.1.1-dev.95`](0.1.1-dev.95.md) — 24-hour Jira user and equipment cache checks completed before their protocol wizard lists open;

- [`0.1.1-dev.94`](0.1.1-dev.94.md) — one-pixel optical lift for shared checklist radio/checkbox controls;
- [`0.1.1-dev.93`](0.1.1-dev.93.md) — radio/checkbox dots aligned on one axis with option text in every shared checklist;
- [`0.1.1-dev.92`](0.1.1-dev.92.md) — Debug/raw output sharing the standard Results surface instead of a nested card;
- [`0.1.1-dev.91`](0.1.1-dev.91.md) — explicit-only Jira protocol PDF opening and downloading without automatic popup;
- [`0.1.1-dev.90`](0.1.1-dev.90.md) — frontend-enforced equipment-only Jira protocol table for stale and historical text outputs;
- [`0.1.1-dev.89`](0.1.1-dev.89.md) — left-side Force checkbox in both Jira cache dialogs without changing other script forms;
- [`0.1.1-dev.88`](0.1.1-dev.88.md) — Jira protocol equipment-only JSON table, operation heading and one shared Copy/PDF action row;
- [`0.1.1-dev.87`](0.1.1-dev.87.md) — stable square checkbox geometry in shared native parameter dialogs across browser, theme and DPI differences;
- [`0.1.1-dev.86`](0.1.1-dev.86.md) — atomic prefetched Jira equipment modal without an empty first paint or duplicate request;
- [`0.1.1-dev.85`](0.1.1-dev.85.md) — neutral protocol `LOGO` fallback without company-specific branding;
- [`0.1.1-dev.84`](0.1.1-dev.84.md) — sandboxed Edge LocalSystem startup preserving the canonical styled Jira protocol template;
- [`0.1.1-dev.83`](0.1.1-dev.83.md) — isolated Edge PDF invocation with bounded retry and guaranteed direct fallback, preserving dev.82 Jira equipment behavior;
- [`0.1.1-dev.82`](0.1.1-dev.82.md) — user-directed full-tree restore of the real-smoke-confirmed dev.63 equipment-matching/PDF behavior, reverting dev.64-dev.81;
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
- [`0.1.1-dev.45`](0.1.1-dev.45.md) — Jira Asset Protocol #252: canonical workflow, authoritative Jira asset recheck, real milestone progress, dependency-free PDF i protected exactly-once Open/Download; real Jira/MeshCentral smoke pending;
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
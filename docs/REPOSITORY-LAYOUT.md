# SIRK Management Platform — struktura repozytorium

## Nazwy produktu

- repozytorium: `MC-SIRK`;
- techniczna nazwa pluginu MeshCentral: `SIRKPortal`;
- nazwa wyświetlana: `SIRK Management Platform`;
- nazwa skrócona: `SIRK Platform`.

Repozytorium nie utrzymuje zgodności z testową strukturą `MyCompany` ani historycznymi warstwami compatibility. Stare entrypointy, shimy, aliasy, hot-patche runtime i niekanoniczne loadery są usunięte.

## Hierarchia indeksów

```text
AGENTS.md
  -> docs/INDEX.md
       -> server/INDEX.md
       -> public/INDEX.md
       -> web/INDEX.md
       -> scripts/INDEX.md
       -> test/INDEX.md
```

## Struktura kanoniczna

```text
MC-SIRK/
├── AGENTS.md
├── README.md
├── SIRKPortal.js
├── SIRKPortalAdmin.js
├── plugin-main.js
├── admin.js
├── config.json
├── package.json
├── server/
│   ├── INDEX.md
│   ├── core/
│   └── modules/
│       ├── approval-center/
│       ├── automation/
│       ├── commands/
│       └── move-requests/
├── public/
│   ├── INDEX.md
│   ├── native/
│   │   ├── desktop-commands.js
│   │   ├── desktop-commands.css
│   │   └── approval.css
│   ├── shared/
│   │   ├── core.js
│   │   ├── module-shell.js
│   │   ├── runtime.js
│   │   ├── styles/
│   │   └── ui/
│   └── modules/
│       ├── approvals/
│       ├── automation/
│       ├── commands/
│       └── move-requests/
├── web/
│   ├── INDEX.md
│   └── admin/
├── views/SIRK-Portal.handlebars
├── tools/install/
├── scripts/
│   ├── INDEX.md
│   ├── run-tests.js
│   ├── validate-architecture.js
│   └── validate-repository-layout.js
├── test/
│   └── INDEX.md
├── docs/
│   ├── INDEX.md
│   ├── PROJECT-STATE.md
│   ├── REPOSITORY-LAYOUT.md
│   ├── releases/
│   └── agent/
└── seed/
```

## Backend

Cały kod backendu Node/MeshCentral znajduje się w `server/`.

- `server/core/runtime.js` jest jedynym runtime backendu;
- `server/core/` zawiera storage, security, audyt, integracje i wspólne usługi;
- `server/modules/` zawiera moduły funkcjonalne;
- katalogi `core/` i `modules/` w root są zabronione;
- backend nie może znajdować się w `public/`.

Jedyny katalog danych runtime:

```text
meshcentral-data/sirk-platform-data
```

Plugin nie odczytuje i nie migruje `mycompany-data`.

## Frontend

`public/` zawiera trzy warstwy:

- `public/native/` — integracja z natywnym GUI MeshCentral i Quick;
- `public/shared/` — core, lifecycle, komponenty i style współdzielone;
- `public/modules/` — pojedyncze renderery modułów.

`public/shared/runtime.js` odpowiada za uruchomienie modułów i przekazywanie lifecycle. `public/shared/module-shell.js` jest właścicielem atomic render.

Pliki aplikacyjne nie mogą leżeć bezpośrednio w `public/`. `public/shared-ui/` jest zabroniony.

## UI i style

Podział odpowiedzialności jest jednoznaczny:

- `public/shared/ui/layout.js` — struktura layoutu i Collapse state;
- `public/shared/ui/shared-ui.css` — jedna globalna geometria workspace i kolumn;
- `public/shared/ui/toolbar.css` — geometria toolbaru, wspólnych wierszy oraz wyjątek Edit/Multi dla mierzonego action track;
- `public/shared/ui/toolbar-config.js` — `MeshThemeAdapter`, native classes i jedyny observer nowego DOM/theme;
- `public/native/desktop-commands.css` — geometria panelu Quick.

Plugin nie utrzymuje własnej palety standardowych kontrolek. Hover, selected, przyciski, karty, formularze i tabele korzystają z klas aktywnego UI MeshCentral.

Runtime JavaScript nie wstrzykuje arkuszy `<style>` dla layoutu i nie używa polling `setInterval`. Plugin nie podmienia globalnego `MutationObserver`.

Kanoniczne desktopowe tracki shared UI:

```text
primary:            minmax(165px,205px)
collapsed primary:  64px
secondary:          minmax(285px,340px)
details:            minmax(420px,1fr)
```

Edit/Multi mogą rozszerzyć drugą kolumnę wyłącznie o zmierzony action track.

## Stan i lifecycle

`public/shared/core.js` utrzymuje jednego `activePlugin` dla workspace SIRK.

`public/shared/module-shell.js`:

- renderuje `secondary` i `details` do odłączonych sekcji;
- używa `renderSequence` do odrzucania nieaktualnych renderów;
- podmienia live DOM podczas atomic commit;
- po commit wykonuje `MeshThemeAdapter.refresh()`;
- nie wykonuje pośredniego `go(1)` podczas przejścia SIRK -> SIRK.

Approval Center, Commands i My Scripts współdzielą Collapse state przez:

```text
sirkPlatform.layout.shared-script-columns.collapsed
```

## Quick

`public/native/desktop-commands.js` jest jedynym właścicielem stanu Quick.

Nie istnieją:

```text
public/native/mesh-plugin-core.js
public/native/quick-output-state.js
```

Output używa `state.detailsCollapsed` oraz klasy `is-details-collapsed`. Attention/pending są stanem runtime. Quick nie używa własnego MutationObservera ani drugiego controllera Output.

## Moduły

Backend i frontend jednego modułu są dwiema warstwami tego samego kontraktu, np.:

```text
server/modules/approval-center/index.js
public/modules/approvals/index.js
```

Dla jednego modułu może istnieć tylko jeden renderer i jeden właściciel logiki wykonawczej.

## Loadery

Backend:

```text
SIRKPortal.js
  -> plugin-main.js
    -> server/core/runtime.js
      -> server/modules/*
```

Frontend:

```text
plugin-main.js
  -> public/shared/core.js
  -> public/shared/ui/*
  -> public/shared/module-shell.js
  -> public/shared/runtime.js
  -> public/modules/*
```

`admin.js` utrzymuje mapę assetów. Każda publiczna nazwa assetu wskazuje dokładnie jeden kanoniczny plik.

Nie istnieją warstwy:

```text
download-results.js
script-edit-actions.js
mesh-plugin-core.js
quick-output-state.js
```

## Panel administracyjny

```text
admin.js
views/SIRK-Portal.handlebars
web/admin/admin.js
web/admin/admin.css
```

Kanoniczny obiekt danych panelu to `window.SirkPlatformAdminData`.

## Testy i workflow

Repozytorium ma jeden utrzymywany workflow:

```text
.github/workflows/test.yml
```

CI używa Node.js 24 oraz `actions/checkout@v7` i `actions/setup-node@v7`.

`npm test` deleguje do `scripts/run-tests.js`, który uruchamia walidatory oraz wszystkie `test/*.test.js` w deterministycznej kolejności.

Walidatory blokują m.in.:

- stare entrypointy i identyfikatory `MyCompany`;
- podwójne runtime/renderery;
- compatibility hot-patche i release-specific DOM contracts;
- polling i runtime style injection;
- globalne podmienianie `MutationObserver`;
- niekanoniczne ścieżki loaderów i assetów;
- rozbieżność wersji `package.json` i `config.json`.

## Instalacja

```text
https://github.com/Eris92/MC-SIRK
tools/install/Install-SIRK-Portal-FromGit.ps1
tools/install/Install-SIRK-Portal-FromGit_RUN.ps1
```

## Walidacja

```bash
npm test
```

Aktualny potwierdzony stan znajduje się w `docs/PROJECT-STATE.md`.

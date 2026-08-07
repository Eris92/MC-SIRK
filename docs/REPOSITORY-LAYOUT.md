# SIRK Management Platform — struktura repozytorium

## Nazwy produktu

- repozytorium: `MC-SIRK`;
- techniczna nazwa pluginu MeshCentral: `SIRKPortal`;
- nazwa wyświetlana: `SIRK Management Platform`;
- nazwa skrócona: `SIRK Platform`.

Repozytorium nie utrzymuje zgodności z testową strukturą `MyCompany` ani z historycznymi warstwami naprawczymi. Stare entrypointy, shimy, aliasy, migracje danych, hot-patche runtime i niekanoniczne ścieżki są usunięte.

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

Odczyt repozytorium zaczyna się od indeksów. Po wybraniu warstwy należy czytać tylko wskazany entrypoint lub moduł oraz jego bezpośrednie zależności.

## Struktura

```text
MC-SIRK/
├── AGENTS.md
├── SIRKPortal.js
├── SIRKPortalAdmin.js
├── plugin-main.js
├── admin.js
├── config.json
├── package.json
├── server/
│   ├── INDEX.md
│   ├── core/
│   │   ├── runtime.js
│   │   ├── settings-store.js
│   │   ├── secret-store.js
│   │   ├── approval-service.js
│   │   ├── device-service.js
│   │   ├── audit-log.js
│   │   └── pozostałe usługi wspólne
│   └── modules/
│       ├── approval-center/
│       ├── automation/
│       ├── commands/
│       └── move-requests/
├── public/
│   ├── INDEX.md
│   ├── native/
│   ├── shared/
│   └── modules/
├── web/
│   ├── INDEX.md
│   └── admin/
├── assets/icons/sirk-ui.svg
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
│   ├── portal-integration.md
│   └── agent/
└── seed/
```

## Backend

Cały kod Node.js i integracje MeshCentral znajdują się w `server/`.

- `server/core/runtime.js` jest jedynym runtime backendu;
- `server/core/` zawiera storage, security, audyt, integracje i wspólne usługi;
- `server/modules/` zawiera moduły funkcjonalne;
- katalogi `core/` i `modules/` w root są zabronione;
- backend nie może znajdować się w `public/`.

Jedyny katalog danych:

```text
meshcentral-data/sirk-platform-data
```

Plugin nie odczytuje i nie migruje `mycompany-data`.

## Frontend

`public/` zawiera trzy warstwy:

- `public/native/` — integracja z natywnym GUI MeshCentral;
- `public/shared/` — wspólny loader/lifecycle, komponenty i style;
- `public/modules/` — pojedyncze renderery modułów.

`public/shared/runtime.js` odpowiada wyłącznie za ładowanie modułów i lifecycle. Nie może nadpisywać API modułów ani naprawiać ich DOM po renderze.

Pliki aplikacyjne nie mogą leżeć bezpośrednio w `public/`. `public/shared-ui/` jest zabroniony.

## UI i style

Renderery tworzą docelowy DOM bez warstw normalizujących po fakcie. Wspólne listy otrzymują klasy `sirk-shared-list-*` bezpośrednio w rendererze.

- geometria i stany list/toolbarów mają jednego właściciela: `public/shared/ui/toolbar.css`;
- CSS wspólny jest ładowany po CSS Quick, aby moduły nie konkurowały o finalny wygląd;
- runtime JavaScript nie wstrzykuje arkuszy `<style>`;
- kod przeglądarkowy nie używa polling `setInterval`;
- jedynym dozwolonym obserwatorem zmian motywu jest lokalny `MeshThemeAdapter` w `public/shared/ui/toolbar-config.js`;
- plugin nie podmienia globalnego `MutationObserver` ani innych API przeglądarki.

## Moduły

Backend i frontend jednego modułu są dwiema warstwami tego samego kontraktu, np.:

```text
server/modules/approval-center/index.js
public/modules/approvals/index.js
```

Dla jednego modułu może istnieć tylko jeden renderer i jeden właściciel logiki wykonawczej.

## Loadery

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

- `admin.js` utrzymuje mapę assetów natywnego UI i panelu administracyjnego;
- każda publiczna nazwa assetu wskazuje dokładnie jeden kanoniczny plik;
- nie istnieją dodatkowe pliki typu `runtime-base`, `mesh-plugin-core` lub `quick-output-state`.

## Panel administracyjny

```text
admin.js
views/SIRK-Portal.handlebars
web/admin/admin.js
web/admin/admin.css
```

Handlebars jest deklaratywnym szablonem. Logika General, Logs i pozostałych ustawień znajduje się w `web/admin/admin.js`, a prezentacja w `web/admin/admin.css`.

Nie istnieje alias danych `window.MyCompanyAdminData`. Kanoniczny obiekt to `window.SirkPlatformAdminData`.

## Testy i workflow

Repozytorium ma jeden utrzymywany workflow:

```text
.github/workflows/test.yml
```

`npm test` deleguje do `scripts/run-tests.js`, który uruchamia oba walidatory repozytorium oraz automatycznie wszystkie pliki `test/*.test.js` w deterministycznej kolejności. Dodanie nowego testu nie wymaga modyfikacji `package.json`.

Walidatory blokują m.in.:

- dodatkowe jednorazowe workflowy i pliki tymczasowe;
- stare entrypointy, widoki i identyfikatory `MyCompany`;
- podwójne runtime i renderery;
- compatibility hot-patche i release-specific DOM contracts;
- polling oraz runtime style injection w `public/`;
- globalne podmienianie `MutationObserver`;
- niekanoniczne ścieżki loaderów i assetów.

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

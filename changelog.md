## 1.6.10

- Restored complete Approval Center settings for every provider.
- Added provider visibility, immediate execution and Level 1-3 approver group controls.
- Persisted every Approval option from the simplified native administration panel.

## 1.6.9

- Restored the Commands button beside MeshCentral's native Desktop Tools button.
- Restored the compact desktop command menu above the native footer.

## 1.6.8

- Fixed native Commands tab registration before its plugin page is opened.
- Unified the full Approval Center with the shared approval settings store.
- Fixed admin settings POST action routing.
- Added regression coverage for native UI contracts.

## 1.6.7

- Restored the complete historical Approval Center workspace, provider filters and request views.

## 1.6.6

- Added a visible Approval Center menu with approval and rejection actions.
- Added the Approval Center visibility switch to its configuration.

## 1.6.5

- Restored the native Commands device tab and removed the overlapping Desktop overlay.

## 1.6.4

- Fixed explicit dark-panel colors for all Approval Center form fields.
- Made the Desktop Commands button work with both supported MeshCentral desktop layouts.

## 1.6.3

- Reduced the admin navigation to Approval Center, Move Request, My Commands and My Scripts.
- Restored the Commands quick menu in the native Desktop view.
- Switched update metadata and installer defaults to the `MC-SIRK` repository.

## 1.6.2

- Fixed Portal settings save by excluding the current `SIRKPortal` instance from obsolete standalone-plugin conflict detection.
- Prevented the admin save status from collapsing the save button on narrow layouts.
- Added regression coverage for the self-conflict and save-bar layout.

## 1.5.151

- Completed the standalone Portal asset manifest for all shared UI components and feature modules.
- Added the Portal UI contract JavaScript endpoint.
- Fixed Settings and Management URLs to use `SIRKPortal`.
- Replaced raw disabled-module JSON with the shared unavailable-state presentation.

## 1.5.150

- Fixed the standalone Portal bootstrap pin to use `SIRKPortal`.
- Added the missing `portal-ui-contract.css` asset route with a CSS MIME type.
- Added regression coverage for runtime Portal asset URLs.

# Changelog

## 1.5.144

- Zmieniono techniczny identyfikator pluginu MeshCentral z niebezpiecznego `SIRK-Portal` na poprawny identyfikator JavaScript `SIRKPortal`.
- Dodano kanoniczne entrypointy `SIRKPortal.js` i `SIRKPortalAdmin.js`.
- Usunięto entrypointy z myślnikiem, które powodowały błędny kod `obj.SIRK-Portal` w `pluginHandler.prepExports()` i biały ekran po zalogowaniu.
- Zaktualizowano instalator, aby używał katalogu `meshcentral-data/plugins/SIRKPortal` i usuwał wadliwe katalogi testowych identyfikatorów.
- Rozszerzono testy i walidator o wymóg JavaScript-safe `shortName`.

## 1.5.143

- Dodano administracyjny entrypoint delegujący obsługę panelu do kanonicznej implementacji `admin.js`.
- Wydanie zostało zastąpione przez `1.5.144`, ponieważ identyfikator z myślnikiem nie jest zgodny z generatorem JavaScript MeshCentral.

## 1.5.142

- Opublikowano uporządkowany layout repozytorium SIRK-Portal na branchu `main`.
- Zawarto finalny wspólny kontrakt UI dla Overview, Devices i pozostałych zakładek.
- Zsynchronizowano źródła wersji i dokumentację wydania do testów instalacyjnych.

## 1.5.141

- Rozszerzono kanoniczny kontrakt UI na wszystkie widoki SIRK Portal.
- Overview i Devices korzystają teraz ze wspólnych klas `mc-portal-*` dla surface, cards, toolbarów, przycisków, inputów, statusów, badge i list.
- Devices zachowuje własną geometrię listy, szczegółów i workspace sesji, ale nie utrzymuje już oddzielnego systemu wizualnego.
- Dodano test regresyjny blokujący ponowne odseparowanie Overview lub Devices od wspólnego kontraktu UI.

## 1.5.140

- Zmieniono kanoniczną nazwę repozytorium i wszystkie URL-e metadata na `Eris92/SIRK-Portal`.
- Usunięto z dokumentacji i instrukcji informacje o kompatybilności, fallbackach oraz migracji `MyCompany`.
- Ujednolicono dokumentację z finalnym layoutem `server/`, `public/`, `web/admin/` i `views/SIRK-Portal.handlebars`.
- Dodano hierarchię indeksów `AGENTS.md -> docs/INDEX.md -> <warstwa>/INDEX.md`.
- Wymuszono selektywny odczyt tylko właściwej części repozytorium i bezpośrednich zależności.
- Zaktualizowano reguły agenta, prompt startowy, stan projektu, integrację Portalu i dokumentację instalacji.
- Ustawiono nową bazę historii wersji dla SIRK Management Platform po świadomym zerwaniu kompatybilności z testową strukturą MyCompany.

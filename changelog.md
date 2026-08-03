## 1.6.59

- Synchronize the MeshCentral wrapper surrounding the administration panel with night mode.
- Remove the remaining light frame around the dark administration surface.

## 1.6.58

- Follow MeshCentral's native live `nightMode` state in the administration panel.
- Ignore the permanently light plugin wrapper when determining the host theme.

## 1.6.57

- Detect the effective MeshCentral host theme even when no `body.night` class is exposed.
- Resynchronize the administration panel colors whenever the host theme changes.

## 1.6.56

- Render the selected Commands item immediately in the third column.
- Restore the variables form and Run button without relying on a nested module render.

## 1.6.55

- Make the administration panel follow MeshCentral's live light and night theme class.
- Replace forced dark surfaces with shared theme variables for cards, navigation, tables and inputs.

## 1.6.54

- Prevent the active remote Desktop keyboard handler from intercepting Quick commands form input.
- Reduce the Quick commands Run action to a compact 84 by 32 pixel control.

## 1.6.53

- Mark SIRK workspaces with their logical view number while they reuse MeshCentral page p1.
- Allow native go(1) to redraw the device list instead of treating the return as a no-op.
- Preserve removal of custom viewmode and an empty URL fragment when leaving SIRK.

## 1.6.52

- Prevent the browser runtime decorator from restoring script credential actions outside Edit mode.
- Cover both script action renderers with Edit-mode visibility regression checks.

## 1.6.51

- Clear stale variable controls and output before running a parameter-free Quick command.
- Keep the newly selected command highlighted and show only its own execution result in the third column.

## 1.6.50

- Store Approval requests in a writable ProgramData fallback when MeshCentral data under Program Files is read-only.
- Reuse the persisted fallback after restart instead of retrying the blocked plugin directory.

## 1.6.49

- Fix the My Commands selection race that could remove Run from the third column.
- Render a clearly visible Run action and start the selected script only after it is clicked.

## 1.6.48

- Move Quick commands execution output from the full-width footer into the third column.
- Keep long command and script output scrollable together with variable controls and Run.

## 1.6.47

- Show per-script credential controls only while script edit mode is active.
- Keep the normal My Scripts and My Commands lists free of administration-only actions.

## 1.6.46

- Keep long My Commands and My Scripts editors within the visible MeshCentral workspace.
- Add independent vertical scrolling to every workspace column so all definition fields and actions remain reachable.

## 1.6.45

- Fix PowerShell and CMD Desktop commands by removing the scheduled-task state race.
- Confirm the launch from task run information and let the console-free launcher clean up its own file safely.

## 1.6.44

- Added separate per-script visibility controls for Desktop Quick commands and the My Commands card.
- Desktop and card script trees now respect their respective visibility setting; Site Admin still sees every script in the card for administration.

## 1.6.43

- Replace the intermittent hidden PowerShell Desktop launcher with console-free `wscript.exe`.
- Launch the requested tool independently and activate its new process without displaying a helper window.
- Fall back to activating an existing matching process for single-instance Windows tools.

## 1.6.42

- Reduce the selected script heading size in the Quick commands variable panel.
- Give Run a dedicated blue action-button design that cannot be overridden by tree button styles.
- Add a play indicator and clearer hover, shadow and disabled states to Run.

## 1.6.41

- Keep the temporary Desktop launch task until its hidden launcher has actually started and completed.
- Replace the unsafe fixed 750 ms cleanup delay with scheduled-task state monitoring.
- Report a real launcher startup failure instead of a false successful start.

## 1.6.40

- Show Quick commands only while MeshCentral reports `desktop.State === 3`.
- Close and hide the launcher immediately after Desktop disconnection.
- Recheck the active Desktop connection before opening the launcher and before every execution.

## 1.6.39

- Render folders, nested folders and scripts together in the second Quick commands column.
- Use the third column exclusively for variable fields belonging to the selected item.
- Execute variable-free items immediately and show Run only when variables must be supplied.

## 1.6.38

- Bring newly launched Desktop tools to the foreground automatically.
- Use a hidden PowerShell launcher and `AppActivate` without displaying another console window.
- Retry activation while the requested application creates its main window.

## 1.6.37

- Fall back to `C:\ProgramData\SIRK Management Platform\settings.json` when MeshCentral data settings cannot be written.
- Continue reading the fallback settings after service restarts.
- Add a regression test for `EPERM`/blocked settings storage and command override persistence.

## 1.6.36

- Launch interactive Windows tools directly from the scheduled task.
- Remove the temporary helper `cmd.exe` window that flashed before the requested application.
- Keep the requested CMD window open with its own `/K` argument.

## 1.6.35

- Always show every built-in command to Site Admin in My Commands.
- Keep Desktop-only filtering for non-administrative users.
- Allow Site Admin to reach the editor for every command without first changing its availability.

## 1.6.34

- Resolve the active Windows desktop user from the owner of `explorer.exe`.
- Retain `Win32_ComputerSystem.UserName` only as a fallback for systems without Explorer details.
- Fix false "No interactive Windows user is logged on" errors during active Desktop sessions.

## 1.6.33

- Add separate per-command switches for Desktop Quick commands and execution without a Desktop connection.
- Default every System and Other command to Desktop-only availability.
- Filter both interfaces and enforce command availability on the server API.

## 1.6.32

- Launch PowerShell, CMD and Windows management tools on the visible interactive desktop.
- Use a short-lived Windows scheduled task for GUI commands instead of MeshAgent's hidden terminal session.
- Return an explicit error when no interactive Windows user is logged on.

## 1.6.31

- Preserve the complete nested script directory structure in Desktop Quick commands.
- Expand and collapse folders in the second column like the My Commands tree.
- Show only scripts belonging directly to the selected directory in the third column.

## 1.6.30

- Wait for the MeshCentral agent response before reporting successful command execution.
- Show command output, execution errors or a confirmation timeout in Desktop Quick commands.
- Keep the immediate-click launcher without the obsolete lower Run panel.

## 1.6.29

- Match every Desktop Quick command icon with its corresponding My Commands icon.
- Execute a command immediately when its row is selected.
- Remove the lower command details and Run panel from the Desktop launcher.

## 1.6.28

- Restore Network, System and Other next to Scripts in Desktop Quick commands.
- Keep all built-in Desktop commands direct and Request-free while retaining script Approval behavior.
- Recover from inaccessible `mycommands/results.json` through alternate disk storage and an in-memory fallback.

## 1.6.27

- Make every built-in Network, System and Other command execute without Request.
- Reserve Approval levels exclusively for file-backed scripts.
- Remove Approval controls from the built-in command editor while retaining label, description and confirmation settings.

## 1.6.26

- Restore a functional edit pencil for built-in My Commands entries.
- Add persistent command label, description, confirmation and Approval-level settings.
- Stop assigning Approval level 1 to every built-in command by default and execute commands with no configured levels directly.

## 1.6.25

- Keep all accessible file-backed scripts visible in Desktop Commands regardless of the main Approval setting.
- Execute Desktop scripts directly while preserving Approval behavior in the main My Commands and My Scripts pages.
- Keep built-in command presets excluded from the direct Desktop launcher.

## 1.6.24

- Always display Run instead of Request in the direct-only Desktop script launcher.
- Replace stale browser scripts and stylesheets automatically when the plugin version changes.
- Recreate Desktop Commands when a newer frontend version is loaded into an existing MeshCentral page.

## 1.6.23

- Limit Desktop Quick commands to file-backed scripts that do not require approval.
- Execute validated no-approval Desktop scripts directly without writing Approval requests.
- Add theme-aware folder and script icons, including configured directory SVG artwork.

## 1.6.22

- Restore the missing Desktop Commands folder column for file-backed scripts.
- Display categories, top-level folders and scripts as three separate columns.
- Preserve the direct two-column layout for built-in Network, System and Other commands.

## 1.6.21

- Synchronize the Desktop Quick commands first column with the main My Commands categories.
- Group all file-backed command scripts under one Scripts entry.
- Remove duplicated Network, System and Other entries from the Desktop launcher.

## 1.6.20

- Recover automatically when `requests.json` is a directory, locked file or has incompatible Windows permissions.
- Switch Approval persistence to `approval-requests.json` without deleting the blocked legacy path.
- Prevent Approval storage failures from blocking My Scripts definition editing.

## 1.6.19

- Show the definition edit action only for real file-backed scripts, not built-in command presets.
- Prevent Approval Center startup from rewriting an unchanged or empty requests database.
- Keep My Commands browsing and edit mode independent from Approval storage availability.

## 1.6.18

- Made administration saves complete synchronously through MeshCentral's settings file interface.
- Added body-based action routing for MeshCentral versions that do not preserve the action query parameter.
- Added an end-to-end admin POST regression test that verifies the JSON response and persisted value.

## 1.6.17

- Restored same-name SVG folder artwork loaded from the My Scripts and My Commands directory trees.
- Added distinct SVG icons for Scripts, Network, System and Other in My Commands.
- Rendered every command with its command-specific SVG instead of a generic menu icon.

## 1.6.16

- Replaced black filled placeholders with consistent theme-aware line icons.
- Unified toolbar, Approval Center, status, catalog, command and script-tree icon rendering.
- Replaced the script-tree square fallback with clear folder and document icons.

## 1.6.15

- Made the Desktop Commands launcher and workspace follow MeshCentral light and night themes.
- Added theme-aware colors for panels, categories, fields, muted text and errors.

## 1.6.14

- Fixed administration saves that remained in progress indefinitely.
- Removed unrelated integration and secret-store writes from module settings saves.
- Added a 15-second request timeout and visible server-response errors.

## 1.6.13

- Restored the historical right-edge Desktop Commands launcher.
- Restored the full compact Commands workspace with search, category navigation, scripts and parameters.
- Removed the simplified footer command list.

## 1.6.12

- Remove SIRK `viewmode` parameters when returning to native MeshCentral pages.
- Prevent Approval Center or another module from reopening over the Devices page.
- Remove the empty trailing URL hash left by the workspace navigation.

## 1.6.11

- Restored the original purple Approval Center menu icon with the green approval mark.
- Prevented Approval Center from retaining the cloned My Devices icon.

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

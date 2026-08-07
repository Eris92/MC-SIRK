# Changelog

## 1.8.20 — 2026-08-07

- Complete the pre-handoff cleanup and remove legacy compatibility layers.
- Consolidate native MeshCentral theme, workspace layout, Collapse and Quick state ownership.
- Use atomic module rendering and avoid intermediate Devices redraws between SIRK workspaces.
- Restore a single shared Collapse state for Approval Center, Commands and My Scripts.
- Keep Edit and Multi mutually exclusive while preserving direct switching between them.
- Remove duplicate Quick output controllers, DOM repair paths and plugin-owned hover/selected styling.
- Route SIRK action history through native MeshCentral Events and remove standalone audit storage and Logs UI.
- Persist General icon mode through the canonical administration settings endpoint.
- Keep Approval status text native while applying semantic colors to icons only; align Approval Overview with Results.
- Stop SIRK CSS and Commands routing from changing the visual state of the native Devices toolbar and Plugins tab.
- Centralize generated CSV rendering/downloads and GET request timeout/cancellation ownership.
- Synchronize package/plugin version, release documentation and CI with 1.8.20 and Node.js 24.
- Reset this public changelog to the verified 1.8.20 handoff baseline. Earlier development history remains available in Git and `docs/releases/`.

Detailed release notes: `docs/releases/1.8.20.md`.

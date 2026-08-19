## 0.1.127 - 2026-08-19

- Record the real `0.1.126` Issue #382 follow-up as still unchanged; keep #382/#386 open and do not count deployment CI as feature acceptance.
- Correct the My Scripts source split where `automation-root.js` could prefer persistent `sirk-platform-data` script trees for metadata while execution always used `pluginRoot/seed/MyScripts`.
- Make bundled My Scripts metadata/tree/dynamic options and execution share one canonical `seed/MyScripts` owner; legacy persistent script directories remain untouched but no longer shadow current definitions.
- Add a regression with stale persistent AD reset copies proving the bundled `ad-users` and local Search metadata remains authoritative and legacy files are not modified.
- Preserve the current bounded DirectoryServices AD selector bridge and ASCII-safe percent-encoded SMS UTF-8 transport unchanged.
- Keep Issue #382 open for real selector/received-SMS acceptance and Issue #386 open for real runtime activation acceptance; no tag or GitHub Release.

Current development notes: `docs/releases/0.1.127.md`.

## 0.1.126 - 2026-08-19

- Record the real `0.1.125` Issue #382/#386 smoke as ineffective because the user observed no behavior change after the update/runtime candidate.
- Correct the maintained Git installer so it no longer assumes `meshcentral.exe` is the Windows service name; auto-detect the upstream-standard `MeshCentral` service first, then a unique service whose command belongs to the configured MeshCentral root, with explicit `-ServiceName` as the fail-closed override.
- Hash the complete staged runtime artifact with SHA-256 and verify the installed plugin tree and `config.json` version before restarting MeshCentral.
- Have the stable `SIRKPortal.js` entrypoint write `sirk-platform-data/runtime-state.json` with the disk version, loaded runtime version, PID and actual plugin root; installer success now requires a fresh matching proof after the real service reaches Running.
- Keep the AD DirectoryServices selector and UTF-8 SMS transport unchanged until deployment evidence proves that the intended backend/script files are actually loaded.
- Keep Issues #386 and #382 open for real `0.1.126` activation proof and subsequent AD selector / received-SMS acceptance; no tag or GitHub Release.

Current development notes: `docs/releases/0.1.126.md`.

## 0.1.125 - 2026-08-19

- Record the real `0.1.1-dev.124` Issue #382 smoke as ineffective because both the reset selector and the actually received SMS remained unchanged.
- Correct the underlying native MeshCentral update contract: use numeric `0.1.X` revisions because the current MeshCentral plugin comparator removes prerelease suffixes before comparing versions, which made the earlier `0.1.1-dev.X` revisions indistinguishable.
- Keep `SIRKPortal.js` as a stable version-aware backend bootstrap that reuses the same-version runtime but reloads only MC-SIRK internal modules when the on-disk plugin version changes.
- Preserve the dev.124 AD DirectoryServices bridge and dev.123 SMS transport unchanged until the real environment proves that the intended backend revision is actually active.
- Require one normal MeshCentral backend restart for the first `0.1.125` installation so the new stable bootstrap itself replaces the already cached pre-fix entrypoint.
- Preserve the exact changelog through `0.1.1-dev.124` in `docs/releases/changelog-through-0.1.1-dev.124.md`; all historical development notes remain indexed in `docs/releases/README.md`.

Current development notes: `docs/releases/0.1.125.md`.

## 0.1.1-dev.124 - 2026-08-19

- Correct the real dev.123 AD reset selector failure where Windows PowerShell ActiveDirectory module progress/failure surfaced as raw `#< CLIXML` with mojibake and the user list remained empty.
- Replace the selector-only `Import-Module ActiveDirectory` / `Get-ADUser` hot path with one bounded `System.DirectoryServices` bridge querying only Jira-cache UPN identities in escaped LDAP chunks.
- Emit one explicit UTF-8 JSON envelope from the bridge, suppress non-data PowerShell streams and never copy raw stderr/CLIXML into the native parameter dialog.
- Keep the selector bounded to 15 seconds, preserve local Search and the Jira `emailAddress -> AD UserPrincipalName -> sAMAccountName` contract without a new cache, timer, observer or per-search request.
- Preserve dev.123 percent-encoded SMS transport unchanged; Issue #382 remains open until both the real selector and actually received Polish SMS are accepted.

Current development notes: `docs/releases/0.1.1-dev.124.md`.

## 0.1.1-dev.123 - 2026-08-18

- Correct the real dev.122 reset-selector latency by matching only Jira-cache e-mail identities to AD `UserPrincipalName` through escaped, chunked LDAP filters instead of enumerating up to 10,000 directory users for every dialog open.
- Keep one PowerShell process for the bounded AD match, stream large identity sets through stdin, skip AD entirely when Jira exposes no usable UPNs, and preserve local Search with no per-keystroke requests.
- Correct the Windows PowerShell 5.1 SMS transport by percent-encoding Unicode form values before HTTP so the request body is ASCII-safe while SMSAPI receives `encoding=utf-8` and UTF-8 form semantics.
- Add a Windows PowerShell 5.1 smoke that validates the exact UTF-8 percent encoding of `Zażółć gęślą jaźń`, while preserving the existing Network Connections smoke.
- Keep Issue #382 open until real MeshCentral/SMSAPI acceptance confirms prompt reset-list availability and correct Polish characters in the received SMS.

Current development notes: `docs/releases/0.1.1-dev.123.md`.

## 0.1.1-dev.122 - 2026-08-18

- Correct the dev.121 real-smoke AD reset failure by removing the redundant per-script Jira credential gate from the `ad-users` option path while retaining AD authorization and the existing server-owned Jira users cache.
- Remove `SirkSystemCredential: Jira` from the AD reset script; reset execution still requires AD and SMSAPI credentials, while Jira cache authentication remains owned server-side.
- Preserve Polish SMS text by setting SMSAPI `encoding=utf-8` on the Node SMS path and explicit UTF-8 form charset plus `encoding='utf-8'` on the Windows PowerShell 5.1 AD SMS helper.
- Keep case-insensitive Jira e-mail -> AD UPN matching, AD-safe values and local shared Search filtering with no per-keystroke Jira/AD requests or new cache owner.
- Preserve AD reset/unlock/mobile lookup, ChangePasswordAtLogon, account-creation OU allowlist, cryptographic password generation and no-login/no-UPN SMS wording.

Current development notes: `docs/releases/0.1.1-dev.122.md`.

## 0.1.1-dev.121 - 2026-08-18

- Default built-in SMS, Voice SMS and SMTP Relay workflows to no pre-approval while preserving explicit approval levels and the ordinary My Scripts Level 1 fallback.
- Move accepted requester confirmation immediately to the existing `confirming` UI state so it leaves `Requests requiring action` before Jira CMDB finalization finishes, and show prepared Jira `User` / changed `Assets` context without extra requests.
- Make AD password reset reuse the Jira users cache, intersect cached `emailAddress` with AD `UserPrincipalName`, and filter the loaded matched list locally with the shared Search/list contract.
- Preserve Polish AD workflow text with UTF-8 BOM and send create/reset SMS messages with the configured AD domain plus a blank line and temporary password, without login/UPN.
- Preserve requester/SiteAdmin confirmation/cancel semantics, Jira CMDB exactly-once behavior, AD OU allowlist, cryptographic password generation, mobile re-read, unlock and ChangePasswordAtLogon.

Current development notes: `docs/releases/0.1.1-dev.121.md`.

## Earlier development history

The exact changelog through `0.1.1-dev.124`, including every earlier development revision, is preserved in [`docs/releases/changelog-through-0.1.1-dev.124.md`](docs/releases/changelog-through-0.1.1-dev.124.md). The per-revision development notes remain linked from [`docs/releases/README.md`](docs/releases/README.md).

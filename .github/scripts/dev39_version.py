from pathlib import Path
import json

OLD='0.1.1-dev.38'
NEW='0.1.1-dev.39'
DATE='2026-08-10'

for name in ['package.json','config.json']:
    p=Path(name); data=json.loads(p.read_text(encoding='utf-8'))
    if data.get('version') != OLD: raise RuntimeError(f'{name} version is {data.get("version")}')
    data['version']=NEW
    p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

for name in ['README.md','docs/PROJECT-STATE.md']:
    p=Path(name); text=p.read_text(encoding='utf-8')
    if OLD not in text: raise RuntimeError(f'{name} lacks {OLD}')
    p.write_text(text.replace(OLD,NEW),encoding='utf-8')

idx=Path('docs/releases/README.md'); text=idx.read_text(encoding='utf-8')
marker=f'- [`{OLD}`]({OLD}.md)'
if text.count(marker)!=1: raise RuntimeError('release index marker mismatch')
line=f'- [`{NEW}`]({NEW}.md) — follow-up po real `{OLD}` smoke: Network Settings wykonuje sprawdzony PowerShell bezpośrednio przez shared logged-on-user runner; Admin preferuje jawny parent `data-bs-theme` przed legacy `nightMode` przy zachowaniu Classic fallback;\n'
idx.write_text(text.replace(marker,line+marker,1),encoding='utf-8')

ch=Path('changelog.md'); old=ch.read_text(encoding='utf-8')
if old.startswith(f'## {NEW}'): raise RuntimeError('changelog already bumped')
entry=f'''## {NEW} - {DATE}\n\n- Real `{OLD}` smoke: Results/View PASS; #237 completed. Network Settings still FAIL from MC-SIRK although its core FolderItemVerb body works manually; Admin Panel theme/color switching regressed after earlier dev.31 PASS.\n- Network root cause: `network-adapter-properties` remained a type-1 CMD preset using `start "" powershell.exe ...`; under the canonical logged-on-user policy that detached the actual UI PowerShell from the runner lifetime. Convert only this preset to direct type-2 PowerShell while preserving `runAsUser: 2`, route/adapter selection, Namespace(49) and the proven Properties/Właściwości `FolderItemVerb.DoIt()` body.\n- Admin root cause: the current parent observer watches `data-bs-theme`, but `hostIsDark()` returned legacy parent `nightMode` first. Prefer explicit same-origin parent html/body `data-bs-theme` when present; retain Classic `body.night`/`nightMode`, localStorage/system/computed fallbacks and the existing copied host surface. No second observer, polling, request or rerender.\n- Runtime Test #540 GREEN before bump. #128 and #123 remain open for real `{NEW}` smoke. #237, #126 and #134 closed from positive real smoke evidence. No tag or GitHub Release.\n\nCurrent development notes: `docs/releases/{NEW}.md`.\n\n'''
ch.write_text(entry+old,encoding='utf-8')

vh=Path('version-history.json'); data=json.loads(vh.read_text(encoding='utf-8'))
if not isinstance(data,list) or not data or data[0].get('version')!=OLD: raise RuntimeError('version-history head mismatch')
if any(x.get('version')==NEW for x in data): raise RuntimeError('version-history already bumped')
data.insert(0,{'version':NEW,'date':DATE,'changes':[
    'Bump the pre-1.0 development revision after real dev.38 Network Settings and Admin theme regressions while Results/View passes.',
    'Execute Network Settings as direct type-2 PowerShell through the single canonical logged-on-user runner instead of detaching powershell.exe via CMD start; preserve the proven route/adapter and real Shell Properties verb body.',
    'Prefer explicit parent data-bs-theme over stale legacy nightMode in the existing Admin host theme owner while retaining Classic fallbacks and copied host surface; add functional stale-signal regression.',
    'Runtime Test #540 is green before bump; #128/#123 remain open for real dev.39 smoke; no automatic tag or GitHub Release.'
]})
vh.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

notes=Path(f'docs/releases/{NEW}.md')
if notes.exists(): raise RuntimeError('notes already exist')
notes.write_text(f'''# {NEW}\n\nStatus: **development pre-1.0**. Follow-up to real `{OLD}` smoke. Test build only; no tag or GitHub Release.\n\n## Real `{OLD}` evidence\n\n- **Results / View (#237): PASS.** User confirms View is OK; #237 is completed.\n- **Network Settings (#128): FAIL.** The plugin still does not open adapter properties, while the same route/adapter + actual `Properties/Właściwości` `FolderItemVerb.DoIt()` body works when run directly in the user's PowerShell session.\n- **Admin theme (#123): regression.** User reports the Admin Panel again fails when changing color/theme after the earlier dev.31 real PASS.\n\n## Network root cause / change\n\nDev.38 correctly restored one canonical logged-on-user execution owner, but the Network Settings catalog entry itself was still `type: 1` and wrapped its real PowerShell operation in `start "" powershell.exe ...`. The shared policy therefore executed `command.cmd`; CMD `start` detached the child PowerShell and could let the runner/task lifecycle finish independently of the actual Shell UI operation. That is materially different from the manually proven direct PowerShell path.\n\nDev.39 changes only `network-adapter-properties` to direct `type: 2` PowerShell with `runAsUser: 2`. The existing shared policy now writes `command.ps1` and invokes Windows PowerShell directly in its interactive-user runner. Route selection, `Status=Up`, IPv4/IPv6 fallback, metrics, `Namespace(49)`, exact adapter mapping and real `FolderItemVerb.DoIt()` remain unchanged. No second launcher, fixed sleep or panel fallback.\n\n## Admin root cause / change\n\nThe Admin JS/CSS owner is byte-identical to the dev.31 real-PASS state, so this is not a later local file overwrite. The current owner observes same-origin parent html/body `data-bs-theme` changes, but `hostIsDark()` returned legacy parent `nightMode` before reading that explicit signal. A Modern host can therefore trigger the observer with a current `data-bs-theme` while a stale `nightMode` value wins the decision.\n\nDev.39 makes explicit **parent** html/body `data-bs-theme` authoritative when present, then falls back to parent Classic `body.night` / `nightMode`, stored/system/computed signals. This is different from the ineffective dev.29 iframe-local signal attempt: the existing dev.30+ parent-window binding and copied parent surface are preserved. No second observer, palette, polling, backend request or Admin rerender.\n\n## Verification before bump\n\nClean runtime **Test #540** is GREEN with exactly four changed runtime/test files. Targeted regressions now require direct type-2 Network Settings with no nested `powershell.exe`/CMD `start`, and functionally verify parent `data-bs-theme=dark/light` overrides an opposite stale `nightMode`. Full runtime/shared/security suite remains green.\n\nA final full `npm test` is required on exact `{NEW}` metadata before automatic merge.\n\n## Required real smoke\n\n1. **Network Settings** on the same Windows host where direct `FolderItemVerb.DoIt()` worked: properties for the preferred `Up` adapter must open; no CMD/PowerShell helper flash.\n2. **Network Control** still opens only Network Connections.\n3. **Admin**: while staying on SIRK Admin, switch light -> dark -> light (and Modern/Classic mode where available). The Admin surface and controls must follow the parent host immediately without losing active section or unsaved form state. F5 recovery must remain intact.\n\nDo not close #128 or #123 until this real `{NEW}` smoke passes.\n''',encoding='utf-8')

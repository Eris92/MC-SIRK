import json
from pathlib import Path

OLD='0.1.1-dev.41'
NEW='0.1.1-dev.42'
DATE='2026-08-10'

# package/config
for name in ('package.json','config.json'):
    p=Path(name); data=json.loads(p.read_text(encoding='utf-8')); data['version']=NEW; p.write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

# README targeted version references only.
p=Path('README.md'); text=p.read_text(encoding='utf-8'); text=text.replace('# SIRK Management Platform '+OLD, '# SIRK Management Platform '+NEW, 1); text=text.replace('docs/releases/'+OLD+'.md', 'docs/releases/'+NEW+'.md', 1); p.write_text(text, encoding='utf-8')

# project state targeted current-version refs.
p=Path('docs/PROJECT-STATE.md'); text=p.read_text(encoding='utf-8'); text=text.replace('Current version: `'+OLD+'`','Current version: `'+NEW+'`',1); text=text.replace('package.json -> '+OLD,'package.json -> '+NEW,1); text=text.replace('config.json  -> '+OLD,'config.json  -> '+NEW,1); text=text.replace('docs/releases/'+OLD+'.md','docs/releases/'+NEW+'.md',1); p.write_text(text, encoding='utf-8')

note='''# 0.1.1-dev.42\n\nStatus: **development pre-1.0**. Admin backlog batch after real `0.1.1-dev.41` smoke. Network Settings #128 is explicitly deferred by user and is not changed in this build. No tag or GitHub Release.\n\n## Scope\n\n### #249 Permissions placement\n- remove the obsolete top-level Permissions tab;\n- reuse the existing `modulePermissions()` owner as a local `Permissions` disclosure inside My Commands and My Scripts;\n- each module Save serializes only its own permission payload while the backend keeps the existing `folderAccess.normalizeRules` validation and one settings transaction.\n\n### #248 Move Request approval levels per target group\n- reuse the existing Move Requests `meshRows`, `normalizeMeshApprovalLevels`, `configuredLevels` and persisted `targetMeshApprovalLevels`;\n- central Admin snapshot includes one bounded Move Request settings + meshes payload;\n- Move Request Admin renders Level 1/2/3 per target device group; missing mapping displays effective Level 1, explicit no-level selection persists `[]`;\n- central Admin Save routes validation through the Move Requests module owner instead of duplicating the security boundary.\n\n### #123 Admin live theme lifecycle\nReal dev.41 evidence: the panel becomes correct after F5 but not during live theme switch. Dev.42 keeps one parent MutationObserver and extends its lifecycle ownership: it detects replacement of the Modern theme stylesheet, rebinds its `href/load` owner, watches the current effective page-43 surface `class/style`, and rebinds those live owners before synchronization. No polling, second observer, backend request or Admin rerender.\n\n## Verification\n- Dev42 Admin gate run `31381645620`: targeted Admin tests + full `npm test` + `git diff --check` GREEN.\n- canonical runtime PR Test #563 / run `31381737524`: GREEN on the clean 9-file runtime/test diff.\n- final exact-version `0.1.1-dev.42` full gate is required before automatic merge.\n\n## Required real smoke\n1. Admin live light -> dark -> light without F5; then F5 recovery.\n2. My Commands and My Scripts each show their local Permissions section; save/reload preserves only the edited module rules.\n3. Move Request Admin lists device groups, supports `[1]`, `[1,2,3]` and explicit `[]`, and reload restores the same effective state.\n4. Submit safe Move Requests to configured target groups to confirm required approval levels.\n\nKeep #123 open until live theme smoke passes. Close #248/#249 only after their real Admin/Move Request acceptance smoke. #128 remains deferred/open.\n'''
Path('docs/releases/'+NEW+'.md').write_text(note,encoding='utf-8')

# release index prepend one line under list.
p=Path('docs/releases/README.md'); text=p.read_text(encoding='utf-8'); marker='Aktualna linia development:\n\n'; line=f'- [`{NEW}`]({NEW}.md) — Admin backlog: module-local Permissions, Move Request approval levels per target device group i live theme owner rebinding; Network #128 deferred;\n';
if line not in text: text=text.replace(marker, marker+line,1)
p.write_text(text,encoding='utf-8')

# changelog prepend, preserve history byte-for-byte after header insertion.
p=Path('changelog.md'); text=p.read_text(encoding='utf-8'); entry=f'''## {NEW} - {DATE}\n\n- Admin #249: remove top-level Permissions and reuse the existing collapsible permission renderer inside My Commands/My Scripts with partial module-only save payloads.\n- Admin/Move Requests #248: add target-device-group Level 1/2/3 policy UI using existing `targetMeshApprovalLevels` and module-side normalization; missing mapping shows effective Level 1, explicit empty selection remains `[]`.\n- Admin #123: follow real dev.41 evidence (correct only after F5) by rebinding the same observer to replaced Modern stylesheet and current page-43 surface mutations; no polling/second observer/rerender.\n- Network Settings #128 remains explicitly deferred by user and is not changed in this build.\n- Dev42 Admin gate `31381645620` and canonical runtime PR Test #563 GREEN; final exact-version gate required before merge. No tag/GitHub Release.\n\nCurrent development notes: `docs/releases/{NEW}.md`.\n\n'''
if not text.startswith('## '+NEW): text=entry+text
p.write_text(text,encoding='utf-8')

# version history prepend preserving previous entries semantically.
p=Path('version-history.json'); data=json.loads(p.read_text(encoding='utf-8'))
if not data or data[0].get('version')!=NEW:
    data.insert(0, {'version':NEW,'date':DATE,'summary':'Admin backlog: module-local Permissions, Move Request approval levels per target group and live theme owner rebinding; Network deferred.','notes':'docs/releases/'+NEW+'.md'})
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

print('dev42 metadata finalized')

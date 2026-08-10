from pathlib import Path
import json

OLD='0.1.1-dev.40'
NEW='0.1.1-dev.41'
DATE='2026-08-10'

def text(path): return Path(path).read_text(encoding='utf-8')
def write(path, value): Path(path).write_text(value, encoding='utf-8')
def replace_exact(path, old, new, count=None):
    s=text(path)
    n=s.count(old)
    expected = 1 if count is None else count
    if n != expected: raise SystemExit(f'{path}: expected {expected} matches, got {n}: {old!r}')
    write(path, s.replace(old,new,expected))

# SemVer/plugin metadata.
pkg=json.loads(text('package.json'))
cfg=json.loads(text('config.json'))
if pkg.get('version')!=OLD or cfg.get('version')!=OLD: raise SystemExit('package/config are not dev.40')
pkg['version']=NEW; cfg['version']=NEW
write('package.json', json.dumps(pkg, indent=2, ensure_ascii=False)+'\n')
write('config.json', json.dumps(cfg, indent=2, ensure_ascii=False)+'\n')

replace_exact('README.md', '# SIRK Management Platform '+OLD, '# SIRK Management Platform '+NEW)
replace_exact('README.md', '[Aktualne development notes](docs/releases/'+OLD+'.md)', '[Aktualne development notes](docs/releases/'+NEW+'.md)')
replace_exact('docs/PROJECT-STATE.md', 'Current version: `'+OLD+'`', 'Current version: `'+NEW+'`')
replace_exact('docs/PROJECT-STATE.md', 'package.json -> '+OLD, 'package.json -> '+NEW)
replace_exact('docs/PROJECT-STATE.md', 'config.json  -> '+OLD, 'config.json  -> '+NEW)
replace_exact('docs/PROJECT-STATE.md', 'Aktualne development notes: `docs/releases/'+OLD+'.md`.', 'Aktualne development notes: `docs/releases/'+NEW+'.md`.')

notes='''# 0.1.1-dev.41

Status: **development pre-1.0**. Follow-up to real `0.1.1-dev.40` failures. No tag or GitHub Release.

## Real dev.40 evidence

- **#128 Network Settings: FAIL.** Direct MeshAgent UserOnly still did not open the adapter properties.
- **#123 Admin theme/color: FAIL.** Watching Modern `#theme-stylesheet` still produced no visible correction.

## Network root cause / change

The working manual Windows test was run in an elevated interactive Administrator context. Upstream MeshAgent `runAsUser:2` uses the console user with TERM/UserOnly semantics, but does not explicitly reproduce that elevated token. Dev.40 therefore still differed from the only real path proven to open `FolderItemVerb.DoIt()` properties.

Dev.41 reuses the existing single `logged-on-user-command-policy` Scheduled Task owner. Ordinary logged-on-user commands remain `RunLevel Limited`. Only the canonical trusted built-in `network-adapter-properties` carries `elevatedUserSession:true` and receives `RunLevel Highest`. The known-good route selection, `Status=Up`, IPv4/IPv6 fallback, `Namespace(49)` and real localized `Properties/Właściwości` `FolderItemVerb.DoIt()` body are unchanged. No second launcher, sleep or polling path is added.

## Admin root cause / change

MeshCentral renders plugin administration inside the native `#p43iframe`. Dev.40 observed the correct parent document but copied `parent.body` background/color. In Modern UI the body is not guaranteed to be the actual opaque page-43 surface surrounding that iframe, so the callback could run and repeatedly copy the same stale/non-effective surface.

Dev.41 keeps the existing single owner/observer but resolves the first opaque computed host surface by walking from `#p43iframe.parentElement` through its ancestors, with host body only as fallback. Theme luminance and the iframe body background/color use that actual effective surface. Existing `data-bs-theme`, Classic `body.night`, stylesheet signal/load, F5 recovery and unsaved form state remain intact. No second observer or private palette.

## Verification

- Dev41 Patch run `31378927708`: targeted + full `npm test` GREEN after stale-test correction.
- Canonical runtime PR Test #558 / run `31379084686`: GREEN on the clean 7-file runtime/test diff.
- Final exact-version full `npm test` on `0.1.1-dev.41` is required before automatic merge.

## Required real smoke

1. Network Settings must open properties for the preferred Up adapter on the same Windows host/session.
2. Network Control must still open only Network Connections.
3. Admin: while staying in SIRK Admin switch light -> dark -> light / Modern color theme; the visible Admin surface must follow immediately, preserve active section and unsaved values, and F5 recovery must remain functional.

Keep #128 and #123 OPEN until this smoke passes.
'''
Path('docs/releases/'+NEW+'.md').write_text(notes,encoding='utf-8')

idx=text('docs/releases/README.md')
anchor='Aktualna linia development:\n\n'
bullet=f'- [`{NEW}`]({NEW}.md) — follow-up po real dev.40 FAIL: Network Settings używa trusted elevated interactive token w istniejącym shared ownerze; Admin kopiuje rzeczywistą nieprzezroczystą powierzchnię otaczającą `#p43iframe`;\n'
if idx.count(anchor)!=1: raise SystemExit('release index anchor mismatch')
write('docs/releases/README.md', idx.replace(anchor,anchor+bullet,1))

cl=text('changelog.md')
if not cl.startswith('## '+OLD): raise SystemExit('changelog does not start with dev.40')
entry=f'''## {NEW} - {DATE}\n\n- Real `{OLD}` smoke: Network Settings and Admin theme/color remain FAIL; keep #128/#123 open and record dev.40 as ineffective.\n- Network: match the manually proven elevated Administrator context by reusing the single logged-on-user Scheduled Task owner with `RunLevel Highest` only for trusted built-in `network-adapter-properties`; ordinary user commands remain `Limited`, and the proven FolderItem Properties body is unchanged.\n- Admin: derive effective background/color from the first opaque parent surface around native `#p43iframe` instead of assuming parent `body` is the painted page-43 surface; reuse the existing observer/signals and preserve F5/form state.\n- Dev41 Patch run `31378927708` and canonical runtime Test #558 (`31379084686`) GREEN before bump; final exact-version suite required before merge. No tag or GitHub Release.\n\nCurrent development notes: `docs/releases/{NEW}.md`.\n\n'''
write('changelog.md',entry+cl)

hist=json.loads(text('version-history.json'))
if not isinstance(hist,list) or not hist or hist[0].get('version')!=OLD: raise SystemExit('version history head mismatch')
hist.insert(0,{
  'version':NEW,'date':DATE,'changes':[
    'Bump the pre-1.0 development revision after real dev.40 Network Settings and Admin theme/color failures.',
    'Reuse the single logged-on-user launcher with RunLevel Highest only for the trusted Network Settings built-in so its interactive token matches the manually proven elevated Administrator context; ordinary user commands remain Limited.',
    'Resolve the actual opaque MeshCentral page-43 surface around p43iframe for Admin background/color synchronization instead of assuming parent body is the painted surface.',
    'Dev41 Patch run 31378927708 and canonical runtime Test #558 are green before bump; #128/#123 remain open for real dev.41 smoke; no tag or GitHub Release.'
  ]
})
write('version-history.json',json.dumps(hist,indent=2,ensure_ascii=False)+'\n')

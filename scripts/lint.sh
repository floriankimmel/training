#!/usr/bin/env bash
# Consistency lint for the training repo.
# Checks: current-race symlink health, single HR-zone source, forbidden data
# sources, and staleness of living docs. Run manually or as a pre-commit hook.
#
# Usage: scripts/lint.sh [--max-age-days N]   (default 30)
set -uo pipefail

cd "$(dirname "$0")/.." || exit 2
ROOT="$(pwd)"

MAX_AGE=30
[ "${1:-}" = "--max-age-days" ] && MAX_AGE="${2:-30}"

ERRORS=0
WARNINGS=0
err()  { printf '  \033[31mFAIL\033[0m %s\n' "$1"; ERRORS=$((ERRORS+1)); }
warn() { printf '  \033[33mWARN\033[0m %s\n' "$1"; WARNINGS=$((WARNINGS+1)); }
ok()   { printf '  \033[32mOK\033[0m   %s\n' "$1"; }

# days since a YYYY-MM-DD date (python3: works with BSD and GNU date setups)
days_since() {
  python3 -c 'import sys,datetime as d; print((d.date.today()-d.date.fromisoformat(sys.argv[1])).days)' "$1" 2>/dev/null || echo -1
}

echo "== 1. current-race symlink =="
mapfile -t CR < <(find races -maxdepth 1 -name 'current-race-*.md' 2>/dev/null)
if [ "${#CR[@]}" -eq 0 ]; then
  ok "no current race (none active)"
elif [ "${#CR[@]}" -gt 1 ]; then
  err "multiple current-race files: ${CR[*]} (expect exactly one)"
else
  f="${CR[0]}"
  if [ -L "$f" ]; then
    tgt="$(readlink "$f")"
    if [ -e "races/$tgt" ]; then ok "$f -> $tgt (resolves)"; else err "$f -> $tgt (BROKEN symlink)"; fi
  elif [ -f "$f" ]; then
    warn "$f is a regular file, not a symlink (convention: symlink to archive race file)"
  fi
fi

echo "== 2. single HR-zone source =="
# Only zones.md may contain the canonical zone numbers. These docs must reference, not redefine.
for f in AGENTS.md athlete.md STATUS.md; do
  [ -f "$f" ] || continue
  if grep -Eq '161-179|125-142.*Extensive|\| *Z4 *\|' "$f"; then
    err "$f contains hardcoded zone values (should reference zones.md only)"
  else
    ok "$f references zones.md (no hardcoded table)"
  fi
done
# '[–-]' is a reversed/invalid bracket range (en-dash..hyphen) → never matches; use alternation
[ -f zones.md ] && grep -Eq '161(–|-)179' zones.md && ok "zones.md holds canonical values" || err "zones.md missing canonical zone values"

echo "== 3. forbidden data sources =="
# HealthFit only. Live-API mentions banned in data docs. AGENTS.md/athlete.md are
# excluded: they legitimately STATE the "no Tredict/Strava/..." policy.
HITS=$(grep -rIl -E 'Tredict|tredict|Runalyze|runalyze|Strava|strava' \
        STATUS.md injuries.md benchmarks.md zones.md strength-plan.md fueling.md 2>/dev/null)
if [ -n "$HITS" ]; then err "forbidden data-source mention in: $(echo "$HITS" | tr '\n' ' ')"; else ok "no Tredict/Runalyze/Strava in living docs"; fi
[ -e .mcp.json ] && err ".mcp.json present (should be removed)" || ok ".mcp.json absent"

echo "== 4. staleness (Last updated, >${MAX_AGE}d) =="
# zones.md excluded: only changes on a new test, not on a schedule.
for f in STATUS.md athlete.md injuries.md benchmarks.md; do
  [ -f "$f" ] || { err "$f missing"; continue; }
  line=$(grep -iE 'Last updated' "$f" | head -1)
  if [ -z "$line" ]; then warn "$f has no 'Last updated' line"; continue; fi
  d=$(echo "$line" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)
  [ -z "$d" ] && { warn "$f 'Last updated' has no ISO date"; continue; }
  age=$(days_since "$d")
  if [ "$age" -lt 0 ]; then warn "$f unparseable date: $d"
  elif [ "$age" -gt "$MAX_AGE" ]; then warn "$f stale: ${age}d old ($d)"
  else ok "$f fresh (${age}d)"; fi
done

echo "== 5. strength vs. calendar travel days =="
# HARD rule: no Kraft (🏋️/💪/"Kraft Tag") on days the calendar marks strength "not possible"
# (travel/trip days). Cross-check each trainings/week-*.md day against calendar no-strength ranges.
#
# Two escape hatches:
#   1) Fly-out day (range start) + return day (range end, when calendar Notes mention
#      departure/return that day → you're home in the evening) allow Kraft. Only the full
#      away days between are banned.
#   2) Explicit, remembered override: put `<!-- lint-allow: kraft-travel — reason -->`
#      anywhere inside that day's section in trainings/week-*.md. Lint then skips that day
#      silently (self-documenting, lives next to the plan, travels with it).
CAL_HITS=$(python3 - <<'PY'
import re, glob
from datetime import date, timedelta

def dates(s):
    return re.findall(r'\d{4}-\d{2}-\d{2}', s)

def d(s):
    y,m,dd=map(int,s.split('-')); return date(y,m,dd)

RETURN_KW = ('departure', 'back ', 'return', 'rückflug', 'rückkehr', 'heimflug')

ranges=[]
try:
    cal=open('calendar.md',encoding='utf-8').read()
except OSError:
    cal=''
for line in cal.splitlines():
    if not line.strip().startswith('|'):
        continue
    cols=[c.strip() for c in line.strip().strip('|').split('|')]
    if len(cols) < 5:
        continue
    strength_col=cols[4]
    if 'not possible' not in strength_col.lower():
        continue
    ds=dates(cols[0])
    if not ds:
        continue
    start, end = ds[0], ds[-1]
    notes = cols[5].lower() if len(cols) > 5 else ''
    if len(ds)>=2 and start!=end:
        # Fly-out day (range start) allows AM Kraft before flight.
        start=(d(start)+timedelta(days=1)).isoformat()
        # Return day (range end) allows evening Kraft at home, when Notes say so.
        if any(k in notes for k in RETURN_KW):
            end=(d(end)-timedelta(days=1)).isoformat()
    if start <= end:
        ranges.append((start, end))

def within(d):
    for a,b in ranges:
        if a<=d<=b:
            return (a,b)
    return None

ALLOW_MARK='lint-allow: kraft-travel'

bad=[]
for f in glob.glob('trainings/week-*.md'):
    # Split file into day blocks so an override marker anywhere in the day counts.
    text=open(f,encoding='utf-8').read()
    parts=re.split(r'(?m)^(##\s+\w+,\s*\d{4}-\d{2}-\d{2}.*)$', text)
    # parts = [pre, heading1, body1, heading2, body2, ...]
    for i in range(1, len(parts), 2):
        heading=parts[i]; body=parts[i+1] if i+1 < len(parts) else ''
        m=re.match(r'##\s+\w+,\s*(\d{4}-\d{2}-\d{2})', heading)
        if not m:
            continue
        day=m.group(1)
        block=heading+body
        has_kraft = ('🏋' in block or '💪' in block or 'Kraft Tag' in block)
        if not has_kraft:
            continue
        if ALLOW_MARK in block:
            continue  # explicit remembered override — stay silent
        r=within(day)
        if r:
            bad.append(f"{f}: Kraft on {day} (travel {r[0]}..{r[1]})")
for b in sorted(set(bad)):
    print(b)
PY
)
if [ -n "$CAL_HITS" ]; then
  while IFS= read -r l; do err "$l"; done <<< "$CAL_HITS"
else
  ok "no Kraft scheduled on calendar travel days"
fi

echo
echo "== 6. STATUS hygiene (snapshot stays short, history in STATUS-log.md) =="
MAX_STATUS_LINES=80
MAX_UPDATED_CHARS=400
if [ ! -f STATUS-log.md ]; then
  err "STATUS-log.md missing (history lives there)"
else
  n=$(wc -l < STATUS.md | tr -d ' ')
  [ "$n" -gt "$MAX_STATUS_LINES" ] && err "STATUS.md is $n lines (max $MAX_STATUS_LINES) — move detail to STATUS-log.md" || ok "STATUS.md $n lines (max $MAX_STATUS_LINES)"
  ul=$(grep -iE 'Last updated' STATUS.md | head -1 | wc -c | tr -d ' ')
  [ "$ul" -gt "$MAX_UPDATED_CHARS" ] && err "STATUS.md 'Last updated' line is $ul chars (max $MAX_UPDATED_CHARS) — put detail in STATUS-log.md" || ok "STATUS.md 'Last updated' line short ($ul chars)"
  sd=$(grep -iE 'Last updated' STATUS.md | head -1 | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' | head -1)
  ld=$(grep -oE '^- [0-9]{4}-[0-9]{2}-[0-9]{2}' STATUS-log.md | head -1 | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
  if [ -n "$sd" ] && [ -n "$ld" ] && [[ "$ld" < "$sd" ]]; then
    err "STATUS-log.md newest entry ($ld) older than STATUS.md Last updated ($sd) — add a log entry"
  else
    ok "STATUS-log.md up to date (newest entry ${ld:-none})"
  fi
fi

echo
echo "== 7. strength pointer vs. latest week plan =="
# strength-plan.md carries a machine-readable marker:
#   <!-- strength-pointer: program=first-class week=5 calendar=47 -->
# Checks (latest trainings/week-*.md only):
#   a) marker exists and calendar == latest plan's week number (pointer not stale)
#   b) every 💪 block names no other program / week than the pointer
#   c) every (S.NNN) page ref in 💪 blocks exists in the digitized program section
#      (plans/strength-program-mark-lauren.md) for that program + week
STR_HITS=$(python3 - <<'PY'
import re, glob, os

def out(m): print(m)

try:
    sp=open('strength-plan.md',encoding='utf-8').read()
except OSError:
    out('strength-plan.md missing'); raise SystemExit
m=re.search(r'<!--\s*strength-pointer:\s*program=(\S+)\s+week=(\d+)\s+calendar=(\d+)\s*-->', sp)
if not m:
    out('strength-plan.md: marker "<!-- strength-pointer: program=first-class week=N calendar=KW -->" missing'); raise SystemExit
prog, wk, cal = m.group(1), int(m.group(2)), int(m.group(3))
if prog not in ('first-class','master-class'):
    out(f'strength-plan.md: unknown program "{prog}" (first-class|master-class)'); raise SystemExit
pname = 'First Class' if prog=='first-class' else 'Master Class'
other = 'Master Class' if prog=='first-class' else 'First Class'

files=[]
for f in glob.glob('trainings/week-*.md'):
    mm=re.match(r'week-(\d+)-(\d{4})\.md', os.path.basename(f))
    if mm: files.append((int(mm.group(2)), int(mm.group(1)), f))
if not files:
    raise SystemExit
year, week, latest = max(files)

if cal != week:
    out(f'strength-plan.md pointer is for calendar W{cal}, latest plan is W{week} ({latest}) — update "Current program week" + marker')

# digitized section for program + week
prog_md=open('plans/strength-program-mark-lauren.md',encoding='utf-8').read()
parts=re.split(r'(?m)^# (?=First Class|Master Class)', prog_md)
body=next((p for p in parts if p.startswith(pname)), '')
refs=None
for sec in re.split(r'(?m)^## ', body)[1:]:
    head=sec.split('\n',1)[0]
    hm=re.match(r'Woche (\d+)(?:\s*(?:und|/)\s*(\d+))?', head)
    if not hm: continue
    lo=int(hm.group(1)); hi=int(hm.group(2) or lo)
    if lo <= wk <= hi:
        refs=set(re.findall(r'S\.(\d+)', sec.split('\n',1)[1])); lo_hi=(lo,hi); break
if refs is None:
    out(f'plans/strength-program-mark-lauren.md: no "{pname}" section for Woche {wk}')
    raise SystemExit

# 💪 blocks in latest plan
lines=open(latest,encoding='utf-8').read().split('\n')
i=0
while i < len(lines):
    if lines[i].startswith('- 💪'):
        j=i+1
        while j < len(lines) and lines[j].startswith('  '): j+=1
        block='\n'.join(lines[i:j])
        tag=re.search(r'Kraft Tag \d', block); tag=tag.group(0) if tag else f'line {i+1}'
        if other in block:
            out(f'{latest}: {tag} mentions "{other}" but pointer says {pname}')
        for w in re.findall(r'(?:Woche|\bW)\s*\**\s*(\d+)(?:/(\d+))?', block):
            a=int(w[0]); b=int(w[1] or a)
            if (a,b)!=lo_hi and not (lo_hi[0] <= a <= lo_hi[1]):
                out(f'{latest}: {tag} says week {a}, pointer says {pname} Woche {lo_hi[0]}..{lo_hi[1]}')
        bad=sorted(set(re.findall(r'S\.(\d+)', block)) - refs, key=int)
        if bad:
            out(f'{latest}: {tag} page refs not in {pname} Woche {wk} table: S.' + ', S.'.join(bad))
        i=j
    else:
        i+=1
PY
)
if [ -n "$STR_HITS" ]; then
  while IFS= read -r l; do err "$l"; done <<< "$STR_HITS"
else
  ok "strength pointer, latest plan and digitized program agree"
fi

echo
echo "== 8. Apple Reminders vs. latest week plan =="
# Source of truth for the schedule is Apple Reminders (list 🏅 Trainingsplan, tag training).
# Compares the latest trainings/week-*.md with remctl (incl. completed) per day:
#   - every non-rest session has a reminder of the same type (run/bike/strength/footwork), and vice versa
#   - run/bike: duration in title == plan header; @workout line present, right sport, minutes ~ plan
#   - strength/footwork: no @workout; strength Tag N: page refs (S.NNN) in notes == plan block
# Skipped (warning) when remctl is unavailable or fails (e.g. CI, unsigned host).
REM_HITS=$(python3 - <<'PY'
import re, glob, os, json, subprocess, shutil
from datetime import date, timedelta

LIST='🏅 Trainingsplan'
if not shutil.which('remctl'):
    print('SKIP:remctl not installed'); raise SystemExit
try:
    r=subprocess.run(['remctl','show',LIST,'--completed','--json'],capture_output=True,text=True,timeout=60)
    rem=json.loads(r.stdout)
except Exception as e:
    print(f'SKIP:remctl failed ({type(e).__name__})'); raise SystemExit

files=[]
for f in glob.glob('trainings/week-*.md'):
    m=re.match(r'week-(\d+)-(\d{4})\.md', os.path.basename(f))
    if m: files.append((int(m.group(2)), int(m.group(1)), f))
if not files: raise SystemExit
_, _, latest = max(files)

def kind(s):
    if '🚴' in s: return 'bike'
    if '🏃' in s or '⚡' in s: return 'run'
    if '💪' in s or '🏋' in s: return 'strength'
    if '🦶' in s: return 'footwork'
    return None

def mins(tok):
    m=re.search(r'(\d+)\s*[×x]\s*(\d+)\s*min', tok)
    if m: return int(m.group(1))*int(m.group(2))
    m=re.search(r'(\d+)\s*min', tok)
    return int(m.group(1)) if m else None

def tsec(x):
    m=re.fullmatch(r'(\d+)(min|s)', x)
    if m: return int(m.group(1))*(60 if m.group(2)=='min' else 1)
    m=re.fullmatch(r'(\d+):(\d+)', x)
    return int(m.group(1))*60+int(m.group(2)) if m else 0

def spec_minutes(spec):
    total=0
    for tok in re.findall(r'\d+x\([^)]*\)|\S+', spec):
        m=re.fullmatch(r'(\d+)x\((.*)\)', tok)
        if m:
            inner=sum(tsec(t) for t in re.findall(r'time:([0-9:]+(?:min|s)?)', m.group(2)))
            total+=int(m.group(1))*inner
        else:
            t=re.search(r'time:([0-9:]+(?:min|s)?)', tok)
            if t: total+=tsec(t.group(1))
    return total/60

# ---- plan sessions
text=open(latest,encoding='utf-8').read()
plan={}   # date -> list of dict
days=re.split(r'(?m)^## (\w+, \d{4}-\d{2}-\d{2}).*$', text)
for i in range(1,len(days),2):
    day=re.search(r'\d{4}-\d{2}-\d{2}', days[i]).group(0)
    for sec in re.split(r'(?m)^### ', days[i+1])[1:]:
        head=sec.split('\n',1)[0]; body=sec.split('\n',1)[1] if '\n' in sec else ''
        if '🛌' in head: continue
        k=kind(head)
        if not k: continue
        item={'kind':k,'head':head,'dur':mins(head.rsplit(' — ',1)[-1]) if k in('run','bike') else None}
        if k=='strength':
            t=re.search(r'Kraft Tag (\d)', head+body); item['tag']=t.group(1) if t else None
            item['refs']=set(re.findall(r'S\.(\d+)', body))
        plan.setdefault(day,[]).append(item)
if not plan: raise SystemExit
dates=sorted(plan); lo, hi = dates[0], dates[-1]
# widen to the plan week (Mon..Sun) so stray reminders are caught
d0=date.fromisoformat(lo); mon=d0-timedelta(days=d0.weekday()); sun=mon+timedelta(days=6)
lo, hi = mon.isoformat(), sun.isoformat()

# ---- reminders in the plan week
R={}
for t in rem:
    due=(t.get('dueDate') or '')[:10]
    if not due or not (lo<=due<=hi): continue
    k=kind(t['title'])
    if not k: continue
    R.setdefault(due,[]).append({'kind':k,'title':t['title'],'notes':t.get('notes') or ''})

for day in sorted(set(plan)|set(R)):
    P=plan.get(day,[]); Rm=R.get(day,[])
    for k in ('run','bike','strength','footwork'):
        pk=[x for x in P if x['kind']==k]; rk=[x for x in Rm if x['kind']==k]
        if k=='strength':
            pm={x['tag']:x for x in pk}; rm={}
            for x in rk:
                t=re.search(r'Kraft Tag (\d)', x['title']); rm[t.group(1) if t else x['title']]=x
            for tag in sorted(set(pm)|set(rm), key=str):
                if tag not in rm: print(f'{day}: plan has Kraft Tag {tag}, no reminder')
                elif tag not in pm: print(f'{day}: reminder "{rm[tag]["title"]}" not in plan')
                else:
                    pr=pm[tag]['refs']; nr=set(re.findall(r'S\.(\d+)', rm[tag]['notes']))
                    if pr!=nr:
                        d=sorted(pr^nr, key=int)
                        print(f'{day}: Kraft Tag {tag} page refs differ plan vs reminder (S.'+', S.'.join(d)+')')
                    if '@workout' in rm[tag]['notes']: print(f'{day}: Kraft Tag {tag} reminder must not have @workout')
            continue
        if len(pk)!=len(rk):
            print(f'{day}: {len(pk)} {k} session(s) in plan, {len(rk)} reminder(s)'); continue
        for p,r in zip(pk,rk):
            notes=r['notes']; lines=[l for l in notes.strip().split('\n') if l.strip()]
            last=lines[-1] if lines else ''
            if k=='footwork':
                if '@workout' in notes: print(f'{day}: footwork reminder must not have @workout')
                continue
            td=mins(r['title'].rsplit(' — ',1)[-1])
            if p['dur'] is not None and td is not None and p['dur']!=td:
                print(f'{day}: {k} duration plan {p["dur"]}min vs reminder title {td}min')
            if not last.startswith(f'@workout {k} '):
                print(f'{day}: {k} reminder "{r["title"]}" does not end with "@workout {k} ..."'); continue
            sm=spec_minutes(last)
            if p['dur'] and abs(sm-p['dur'])>max(3,0.1*p['dur']):
                print(f'{day}: {k} @workout spec ~{sm:.0f}min vs plan {p["dur"]}min')
PY
)
if [ -z "$REM_HITS" ]; then
  ok "reminders match latest week plan"
else
  while IFS= read -r l; do
    case "$l" in
      SKIP:*) warn "reminders check skipped — ${l#SKIP:}" ;;
      *) err "$l" ;;
    esac
  done <<< "$REM_HITS"
fi

echo
echo "== 9. threshold trend (benchmarks.md) vs. DuckDB =="
# benchmarks.md "Schwelle (Z3, HF 153–160)" table feeds the webview trend card.
# Recompute monthly median per-second pace @ HF 153–160 on flat runs (<15 hm/km, missing
# ascent = flat), only runs with >=300 s in band (else Z2 HF spikes), month >=180 s. Warn when the DB has a newer qualifying month than
# the table's last row, or when the last row's value drifts >10 s from the DB.
# Skipped (warning) when db/.venv or db/training.duckdb is unavailable.
TREND_HITS=$( [ -x db/.venv/bin/python ] && [ -f db/training.duckdb ] || { echo 'SKIP:db/.venv or db/training.duckdb missing'; exit; }
db/.venv/bin/python - <<'PY'
import re
try:
    import duckdb
    con = duckdb.connect('db/training.duckdb', read_only=True)
except Exception as e:
    print(f'SKIP:duckdb unavailable ({type(e).__name__})'); raise SystemExit

MON = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
ALIAS = {'Mar': 'Mär', 'May': 'Mai', 'Oct': 'Okt', 'Dec': 'Dez'}
fmt = lambda p: f'{int(p)}:{round((p % 1) * 60):02d}'

s = open('benchmarks.md', encoding='utf-8').read()
i = s.find('**Schwelle (Z3')
if i < 0:
    print('benchmarks.md: "Schwelle (Z3" trend section missing'); raise SystemExit
rows = re.findall(r'\|\s*([A-Za-zä]+) (\d{4})\s*\|\s*\*{0,2}(\d+):(\d+) /km', s[i:(s.find('\n**', i + 2) if s.find('\n**', i + 2) > 0 else i + 800)])
if not rows:
    print('benchmarks.md: Schwelle table has no rows'); raise SystemExit
m, y, mm, ss = rows[-1]
m = ALIAS.get(m, m)
if m not in MON:
    print(f'benchmarks.md: unknown month "{m}" in trend table'); raise SystemExit
last = f'{y}-{MON.index(m)+1:02d}'
last_pace = int(mm) + int(ss) / 60

q = '''
with z as (
  select r.activity_id, r.ts, r.speed
  from records r join activities a on a.id = r.activity_id
  where a.sport = 'running' and r.hr between 153 and 160 and r.speed > 1.5
    and coalesce(a.total_ascent, 0) / nullif(a.distance_m/1000, 0) < 15
    and r.ts >= ?::date)
select strftime(date_trunc('month', ts), '%Y-%m') mon, count(*) secs, median(1000/speed)/60 pace
from z where activity_id in (select activity_id from z group by 1 having count(*) >= 300)
group by 1 having count(*) >= 180 order by 1'''
db = {mon: pace for mon, _, pace in con.execute(q, [f'{last}-01']).fetchall()}

if last in db and abs(db[last] - last_pace) * 60 > 10:
    print(f'WARN:benchmarks.md trend {m} {y} = {fmt(last_pace)} /km, DB says {fmt(db[last])} /km')
for mon in sorted(k for k in db if k > last):
    yy, mo = mon.split('-')
    print(f'WARN:benchmarks.md trend missing {MON[int(mo)-1]} {yy}: {fmt(db[mon])} /km (DB, flat, HF 153–160) — add row')
PY
)
if [ -z "$TREND_HITS" ]; then
  ok "threshold trend table up to date with DB"
else
  while IFS= read -r l; do
    case "$l" in
      SKIP:*) warn "trend check skipped — ${l#SKIP:}" ;;
      WARN:*) warn "${l#WARN:}" ;;
      *) err "$l" ;;
    esac
  done <<< "$TREND_HITS"
fi

if [ "$ERRORS" -gt 0 ]; then
  printf '\033[31m%d error(s), %d warning(s)\033[0m\n' "$ERRORS" "$WARNINGS"; exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  printf '\033[33m0 errors, %d warning(s)\033[0m\n' "$WARNINGS"; exit 0
else
  printf '\033[32mAll checks passed\033[0m\n'; exit 0
fi

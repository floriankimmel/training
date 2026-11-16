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

if [ "$ERRORS" -gt 0 ]; then
  printf '\033[31m%d error(s), %d warning(s)\033[0m\n' "$ERRORS" "$WARNINGS"; exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  printf '\033[33m0 errors, %d warning(s)\033[0m\n' "$WARNINGS"; exit 0
else
  printf '\033[32mAll checks passed\033[0m\n'; exit 0
fi

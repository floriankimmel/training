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

# days since a YYYY-MM-DD date (macOS/BSD date)
days_since() {
  local d="$1" then now
  then=$(date -j -f "%Y-%m-%d" "$d" +%s 2>/dev/null) || { echo -1; return; }
  now=$(date +%s)
  echo $(( (now - then) / 86400 ))
}

echo "== 1. current-race symlink =="
mapfile -t CR < <(find races -maxdepth 1 -name 'current-race-*.md' 2>/dev/null)
if [ "${#CR[@]}" -eq 0 ]; then
  err "no races/current-race-*.md found"
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
[ -f zones.md ] && grep -Eq '161[–-]179' zones.md && ok "zones.md holds canonical values" || err "zones.md missing canonical zone values"

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
CAL_HITS=$(python3 - <<'PY'
import re, glob
from datetime import date, timedelta

def dates(s):
    return re.findall(r'\d{4}-\d{2}-\d{2}', s)

def d(s):
    y,m,dd=map(int,s.split('-')); return date(y,m,dd)

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
    # Fly-out day (range start) allows AM Kraft before flight (calendar convention:
    # "shift Kraft to Mon before flight"). Ban only the full away days start+1..end.
    if len(ds)>=2 and start!=end:
        start=(d(start)+timedelta(days=1)).isoformat()
    ranges.append((start, end))

def within(d):
    for a,b in ranges:
        if a<=d<=b:
            return (a,b)
    return None

bad=[]
for f in glob.glob('trainings/week-*.md'):
    day=None
    for line in open(f,encoding='utf-8'):
        m=re.match(r'##\s+\w+,\s*(\d{4}-\d{2}-\d{2})', line)
        if m:
            day=m.group(1); continue
        if day and ('🏋' in line or '💪' in line or 'Kraft Tag' in line):
            r=within(day)
            if r:
                bad.append(f"{f}: Kraft on {day} (travel {r[0]}..{r[1]})")
                day=None
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
if [ "$ERRORS" -gt 0 ]; then
  printf '\033[31m%d error(s), %d warning(s)\033[0m\n' "$ERRORS" "$WARNINGS"; exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  printf '\033[33m0 errors, %d warning(s)\033[0m\n' "$WARNINGS"; exit 0
else
  printf '\033[32mAll checks passed\033[0m\n'; exit 0
fi

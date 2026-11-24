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
# while-read, not mapfile: macOS /bin/bash is 3.2 (no mapfile)
CR=()
while IFS= read -r f; do CR+=("$f"); done < <(find races -maxdepth 1 -name 'current-race-*.md' 2>/dev/null)
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

echo
echo "== 5. STATUS hygiene (snapshot stays short, history in STATUS-log.md) =="
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
  MAX_LOG_ENTRY_CHARS=400
  le=$(grep -m1 -E '^- [0-9]{4}-[0-9]{2}-[0-9]{2}' STATUS-log.md | wc -m | tr -d ' ')
  [ "${le:-0}" -gt "$MAX_LOG_ENTRY_CHARS" ] && warn "STATUS-log.md newest entry is $le chars (max $MAX_LOG_ENTRY_CHARS) — detail belongs in week/feedback files" || ok "STATUS-log.md newest entry short (${le:-0} chars)"
fi

echo
echo "== 6. training.lint (plan format, Kraft vs. travel, strength pointer, threshold trend, reminders) =="
# Plan parsing lives in training/plan.py (ADR 0001); checks in training/lint.py.
# Override for a deliberate Kraft-on-travel day: put `<!-- lint-allow: kraft-travel — reason -->`
# inside that day's section in trainings/week-*.md.
PY_BIN=db/.venv/bin/python
if [ -x "$PY_BIN" ] && "$PY_BIN" -c 'import training.lint' 2>/dev/null; then
  while IFS= read -r l; do
    case "$l" in
      SECTION:*) echo " -- ${l#SECTION:}" ;;
      OK:*) ok "${l#OK:}" ;;
      WARN:*) warn "${l#WARN:}" ;;
      ERR:*) err "${l#ERR:}" ;;
      *) [ -n "$l" ] && err "$l" ;;
    esac
  done < <("$PY_BIN" -m training lint 2>&1)
else
  warn "plan checks skipped — training package not installed (db/.venv/bin/python -m pip install -e '.[dev]')"
fi


if [ "$ERRORS" -gt 0 ]; then
  printf '\033[31m%d error(s), %d warning(s)\033[0m\n' "$ERRORS" "$WARNINGS"; exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  printf '\033[33m0 errors, %d warning(s)\033[0m\n' "$WARNINGS"; exit 0
else
  printf '\033[32mAll checks passed\033[0m\n'; exit 0
fi

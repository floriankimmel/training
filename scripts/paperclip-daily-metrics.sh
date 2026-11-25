#!/usr/bin/env bash
# Daily Metrics for Paperclip's `process` adapter: no LLM, zero tokens.
# Runs auto-import.sh, builds the 3-5 line report the agent used to write,
# comments it on the run issue and closes it. Problems -> exit 1, so the run
# fails and shows up in the Paperclip inbox.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG="$ROOT/db/auto-import.log"
DB="$ROOT/db/training.duckdb"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

before=$(wc -l < "$LOG" 2>/dev/null || echo 0)
since=$(date '+%F %T')
bash "$ROOT/scripts/auto-import.sh"
rc=$?
new_lines=$(tail -n +"$((before + 1))" "$LOG" 2>/dev/null)

q() { duckdb -init /dev/null -no-agent -readonly -noheader -list "$DB" "$1" 2>&1; }
new_acts=$(q "SELECT coalesce(string_agg(strftime(start_time, '%d.%m.') || ' ' || sport || ' ' || CAST(round(timer_s/60) AS INT) || ' min', ', ' ORDER BY start_time), '') FROM activities WHERE imported_at >= TIMESTAMP '$since';")
newest_act=$(q "SELECT max(start_time)::DATE FROM activities;")
newest_day=$(q "SELECT max(day) FROM daily_metrics;")
gaps=$(printf '%s\n' "$new_lines" | grep 'verify GAP:' || true)
errors=$(printf '%s\n' "$new_lines" | grep -E 'FAILED|error=[1-9]|missing|Error' || true)

problems=()
[ "$rc" -ne 0 ] && problems+=("auto-import.sh exit $rc")
[ -n "$errors" ] && problems+=("$errors")
today=$(date +%F)
age() { echo $(( ( $(date -j -f %F "$today" +%s) - $(date -j -f %F "$1" +%s 2>/dev/null || echo 0) ) / 86400 )); }
[ "$(age "$newest_act")" -gt 3 ] && problems+=("Neueste Aktivität $newest_act älter als 3 Tage")
[ "$(age "$newest_day")" -gt 2 ] && problems+=("Neuester Metrics-Tag $newest_day älter als 2 Tage")

report="**Daily Metrics $today**
- Neue Aktivitäten: ${new_acts:-keine}
- Neueste Aktivität: $newest_act · neuester Metrics-Tag: $newest_day
- Verify-Gaps: ${gaps:-keine}"
if [ ${#problems[@]} -gt 0 ]; then
  report="$report
- ⚠️ Problem: $(printf '%s; ' "${problems[@]}")"
fi
printf '%s\n' "$report"

# process adapter sets no PAPERCLIP_TASK_ID: resolve the issue from the run.
if [ -z "${PAPERCLIP_TASK_ID:-}" ] && [ -n "${PAPERCLIP_RUN_ID:-}" ] && [ -n "${PAPERCLIP_API_URL:-}" ]; then
  run_json=$(curl -s "$PAPERCLIP_API_URL/api/heartbeat-runs/$PAPERCLIP_RUN_ID" \
    -H "Authorization: Bearer ${PAPERCLIP_API_KEY:-}")
  PAPERCLIP_TASK_ID=$(printf '%s' "$run_json" | jq -r '.issueId // .contextSnapshot.issueId // empty' 2>/dev/null)
  # fallback: oldest open issue assigned to this agent
  [ -z "$PAPERCLIP_TASK_ID" ] && PAPERCLIP_TASK_ID=$(curl -s "$PAPERCLIP_API_URL/api/agents/me/inbox-lite" \
    -H "Authorization: Bearer ${PAPERCLIP_API_KEY:-}" | jq -r '[(if type=="array" then . else (.issues // []) end)[] | select(.status=="todo" or .status=="in_progress")] | first | .id // empty' 2>/dev/null)
  [ -z "$PAPERCLIP_TASK_ID" ] && echo "paperclip: no issue for run $PAPERCLIP_RUN_ID: $(printf '%s' "$run_json" | head -c 300)" >&2
fi
if [ -n "${PAPERCLIP_TASK_ID:-}" ] && [ -n "${PAPERCLIP_API_URL:-}" ]; then
  status=done; [ ${#problems[@]} -gt 0 ] && status=blocked
  curl -s -o /dev/stderr -w ' http=%{http_code}\n' -X PATCH "$PAPERCLIP_API_URL/api/issues/$PAPERCLIP_TASK_ID" \
    -H "Authorization: Bearer ${PAPERCLIP_API_KEY:-}" -H "X-Paperclip-Run-Id: ${PAPERCLIP_RUN_ID:-}" \
    -H 'Content-Type: application/json' \
    -d "$(jq -n --arg c "$report" --arg s "$status" '{status:$s, comment:$c}')"
fi

[ ${#problems[@]} -eq 0 ]

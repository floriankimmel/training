#!/usr/bin/env bash
# Auto-import new HealthFit .fit files + metrics into db/training.duckdb.
# Triggered by launchd (WatchPaths on the HealthFit iCloud folder) — see scripts/launchd/.
# Idempotent. Backup (db/backup.sh) at most once per day.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="$ROOT/db/.venv/bin/python"
HF="$HOME/Library/Mobile Documents/iCloud~com~altifondo~HealthFit/Documents"
LOG="$ROOT/db/auto-import.log"
STAMP="$ROOT/db/.last-backup"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*" >> "$LOG"; }

# debounce: iCloud writes bursts of files
sleep 20

[ -d "$HF" ] || { log "HealthFit folder missing: $HF"; exit 1; }

for attempt in 1 2 3; do
  if out=$("$PY" "$ROOT/db/import_fit.py" "$HF" 2>&1); then
    log "import_fit: $(printf '%s' "$out" | tail -1)"
    break
  fi
  log "import_fit attempt $attempt failed: $(printf '%s' "$out" | tail -1)"
  sleep 30
done

"$PY" "$ROOT/db/import_metrics.py" >/dev/null 2>&1 && log "import_metrics ok"

today=$(date +%F)
if [ "$(cat "$STAMP" 2>/dev/null)" != "$today" ]; then
  if "$ROOT/db/backup.sh" >/dev/null 2>&1; then echo "$today" > "$STAMP"; log "backup ok"; else log "backup FAILED"; fi
fi

#!/usr/bin/env bash
# Backup DuckDB training database to Dropbox as a compressed Parquet dump.
#
# The .duckdb file is ~900MB and lives outside git. This exports a zstd-19
# Parquet snapshot (~65MB) and rsyncs it to Dropbox.
#
# Usage:
#   db/backup.sh            # export + sync
#   db/backup.sh --restore  # restore DB from the Dropbox dump
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="$ROOT/db/.venv/bin/python"
DB="$ROOT/db/training.duckdb"
DUMP="$ROOT/db/dump"
DEST="$HOME/Dropbox/02 Areas/training-db-backup"

if [[ "${1:-}" == "--restore" ]]; then
  if [[ -e "$DB" ]]; then
    echo "Refusing to overwrite existing $DB — move it aside first." >&2
    exit 1
  fi
  echo "Restoring DB from $DEST ..."
  "$PY" -c "import duckdb; duckdb.connect('$DB').execute(\"IMPORT DATABASE '$DEST'\")"
  echo "Restored $DB"
  exit 0
fi

echo "Exporting $DB -> $DUMP (zstd-19) ..."
rm -rf "$DUMP"
"$PY" -c "import duckdb; duckdb.connect('$DB', read_only=True).execute(\"EXPORT DATABASE '$DUMP' (FORMAT PARQUET, CODEC 'zstd', COMPRESSION_LEVEL 19)\")"

echo "Syncing -> $DEST ..."
mkdir -p "$DEST"
rsync -a --delete "$DUMP/" "$DEST/"

echo "Done. Backup size:"
du -sh "$DEST"

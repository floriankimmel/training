# Training Database (DuckDB)

Personal training database built from `.fit(.gz)` exports. Single-file, offline,
no daemon. **Multi-source**: HealthFit (native, iCloud) + TrainingPeaks exports
(+ Suunto/Zwift/Komoot files inside them) merge into one deduplicated dataset.

Current coverage: 2020 → 2026, ~1600 activities, 6M+ per-second records.

## Files

- `schema.sql` — 3-tier schema: `activities` → `laps` → `records` (all TIMESTAMPTZ/UTC), plus `daily_metrics` (daily recovery)
- `import_fit.py` — multi-source, idempotent importer
  (auto-reconciles `total_ascent`: if the FIT session summary disagrees with the
  per-second altitude track by >30% and >20 m — e.g. HealthFit reporting ~0 hm
  while the Watch barometer recorded a real climb — it uses the 30s-smoothed
  record-derived ascent and logs the swap)
- `import_metrics.py` — parse `metrics/*.md` (Apple HealthKit sleep/HRV/RHR) into `daily_metrics`
- `import_tredict.py` — pull missing activities from the Tredict API + import
- `training.duckdb` — the database (git-ignored; regenerate anytime)
- `.venv/` — python env with `duckdb` + `garmin-fit-sdk` (git-ignored)

## Import

```bash
# HealthFit iCloud folder + any TrainingPeaks export folders, one command
db/.venv/bin/python db/import_fit.py \
  "$HOME/Library/Mobile Documents/iCloud~com~altifondo~HealthFit/Documents" \
  /path/to/unzipped-trainingpeaks-export

# single file, or force replace
db/.venv/bin/python db/import_fit.py path/to/x.fit.gz --force
```

TrainingPeaks exports come as yearly `.zip` — unzip first:
```bash
unzip -o WorkoutFileExport-*.zip -d /tmp/tp && \
  db/.venv/bin/python db/import_fit.py /tmp/tp
```

### Tredict (API export)

Tredict often holds activities never recorded via the Watch running app
(yoga, pilates, hiking, diving, strength) plus anything missing from other
sources. Download the per-activity `.fit` and import with an explicit source tag:

```bash
# one command: list Tredict, diff DB by start_time, download missing, import tagged
db/.venv/bin/python db/import_tredict.py     # needs $TREDICT_API_KEY
```

Or import already-downloaded files manually with an explicit tag:
```bash
db/.venv/bin/python db/import_fit.py /tmp/tredict --source tredict
```

`--source` overrides provenance detection (filenames from the API carry no
source hint). Dedup still applies, so re-importing is safe.

### Recovery metrics (daily_metrics)

The `metrics/metrics-WW-YYYY.md` files (generated daily ~10:00 from Apple
HealthKit: sleep, HRV/SDNN, resting HR) load into the `daily_metrics` table.
One row per calendar day, idempotent upsert by `day` (re-running refreshes):

```bash
db/.venv/bin/python db/import_metrics.py            # all metrics/*.md
db/.venv/bin/python db/import_metrics.py metrics/metrics-35-2026.md   # one file
```

Query the recovery trend:
```sql
SELECT day, weekday, sleep_min, deep_min, rem_min, efficiency_pct,
  hrv_night_avg, resting_hr FROM daily_metrics ORDER BY day DESC LIMIT 14;
```
Used read-only by the `feedback`, `coach`, and `training-db` skills for
recovery/readiness context.

### Deduplication (source-independent)

- activity id = **surrogate BIGINT** (chronological by start_time; dedup does
  **not** use the id)
- an incoming file matches an existing activity when start_time is within
  **90 s** and sport matches
- on a match the **higher-fidelity file (more record rows) wins** and reuses the
  existing numeric id; ties keep the existing row unless `--force`

So the same workout from HealthFit *and* TrainingPeaks lands as one row, and
re-running any folder is safe. Import statuses: `ok` (new), `replace` (richer
file replaced existing), `skip` (existing was equal/better).

## Query

```bash
duckdb db/training.duckdb          # interactive
duckdb db/training.duckdb "SELECT sport, count(*) FROM activities GROUP BY sport"
```

### Example: HR zone distribution (running), zones from ../zones.md

```sql
SELECT CASE
    WHEN hr <= 124 THEN 'Recovery' WHEN hr <= 142 THEN 'Z1'
    WHEN hr <= 152 THEN 'Z2'       WHEN hr <= 160 THEN 'Z3'
    WHEN hr <= 179 THEN 'Z4'       ELSE 'Z5' END AS hrzone,
  printf('%.1f%%', 100.0*count(*)/sum(count(*)) OVER ()) AS pct
FROM records r JOIN activities a ON a.id=r.activity_id
WHERE a.sport='running' AND hr IS NOT NULL
GROUP BY hrzone ORDER BY hrzone;
```

## Schema

- **activities** — 1 row/session: distance, elapsed/timer, avg/max HR + power + speed,
  cadence, ascent/descent, calories, sport, `source`, `record_count`, source_file.
  PK = surrogate BIGINT id (`seq_activities`, chronological by start_time).
- **laps** — per-lap splits. PK = (activity_id, lap_index).
- **records** — per-second samples: ts, distance, hr, cadence, power, speed, altitude.

## Data gotchas

1. **HR is a separate interleaved stream.** Recording is 1 Hz, but only ~1/4 of
   `records` rows carry `hr` (distance/cadence and HR arrive in different record
   messages). Zone *proportions* are valid; absolute zone-hours undercount.
   Fix when needed — forward-fill HR per activity:
   ```sql
   SELECT *, last_value(hr IGNORE NULLS) OVER (
            PARTITION BY activity_id ORDER BY ts) AS hr_ffill
   FROM records;
   ```
2. **Timestamps are UTC** (`TIMESTAMPTZ`). DuckDB displays them in the session
   timezone; the stored instant is UTC. The `id` is a surrogate BIGINT; use
   `start_time` for the actual UTC start.
3. **Filenames vary wildly** across sources (nbsp/hyphen separators, hashes,
   `Apple Watch`, `Komoot`, `Suunto`). `source` is best-effort provenance; genuine
   Suunto/Zwift device files keep their own source tag.
4. **Non-run sports** (`generic`, `rock_climbing`, `walking`, `cycling`) may lack
   distance. Small files may have no `session` → reported `no-session`.

## Migration path

DuckDB → Postgres later is trivial if a webapp/API ever needs concurrent writers.
Until then, single file is the right call.

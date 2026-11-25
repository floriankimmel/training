# Training Database (DuckDB)

Personal training database built from `.fit(.gz)` exports. Single-file, offline,
no daemon. **Multi-source**: HealthFit (native, iCloud) + TrainingPeaks exports
(+ Suunto/Zwift/Komoot files inside them) merge into one deduplicated dataset.

Current coverage: 2020 → 2026, ~1600 activities, 6M+ per-second records.

## Files

- `schema.sql` — 3-tier schema: `activities` → `laps` → `records` (all TIMESTAMPTZ/UTC), plus `daily_metrics` (daily recovery) and `nutrition_daily` (Vita Fit intake)
- `import_fit.py` — multi-source, idempotent importer
  (auto-reconciles `total_ascent`: if the FIT session summary disagrees with the
  per-second altitude track by >30% and >20 m — e.g. HealthFit reporting ~0 hm
  while the Watch barometer recorded a real climb — it uses the 30s-smoothed
  record-derived ascent and logs the swap)
- `import_metrics.py` — parse `metrics/*.md` (Apple HealthKit sleep/HRV/RHR/weight) into `daily_metrics`, Ernährung sections into `nutrition_daily`
- `import_tredict.py` — pull missing activities from the Tredict API + import
- `training.duckdb` — the database (git-ignored; regenerate anytime)
- `.venv/` — python env with `duckdb` + `garmin-fit-sdk` (git-ignored)

## Domain package (`training/`)

Plan parsing, zones, Pace in Zone and Readiness live in the `training/` package at the
repo root (see `docs/adr/0001-python-domain-core-cli-bridge.md`). Install it into the
same venv once, then run tests:

```bash
db/.venv/bin/python -m pip install -e '.[dev]'
db/.venv/bin/python -m pytest -q
```

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

### Nutrition (nutrition_daily)

Vita Fit -> Apple Health -> daily-metrics writes, per entry, a section
`#### 🍽️ Ernährung (Vortag YYYY-MM-DD)` (Kalorien, Protein, Kohlenhydrate, Fett,
Ballaststoffe, Zucker, optional Wasser). `import_metrics.py` (and `import_all.py`)
upsert it into `nutrition_daily`, **keyed by the heading's date (the day eaten), not
the entry day**. `_Keine Ernährungsdaten erfasst._` = no row. Data from 2026-11-25 on.
Columns: `date` PK, `kcal`, `protein_g`, `carbs_g`, `fat_g`, `fiber_g`, `sugar_g`,
`water_ml`, `source='vitafit'`.

HealthKit active/basal energy is **not** in the DB yet: energy balance uses workout
kcal from `activities.calories` + an estimated basal (`22 kcal/kg` body mass, set
`bmr_kcal_per_kg` to taste). Treat the balance as a trend, not an exact number
(logging gaps and the basal estimate dominate the error).

```sql
-- Energy balance per day (intake - workout kcal - estimated basal), 7-day rolling
WITH w AS (
  SELECT day, avg(body_mass_kg) OVER (ORDER BY day ROWS 6 PRECEDING) AS kg7
  FROM daily_metrics),
act AS (
  SELECT (start_time AT TIME ZONE 'Europe/Vienna')::DATE AS d, sum(calories) AS workout_kcal
  FROM activities GROUP BY 1),
bal AS (
  SELECT n.date, n.kcal, coalesce(a.workout_kcal, 0) AS workout_kcal,
         round(22 * w.kg7) AS basal_est,                     -- bmr_kcal_per_kg = 22
         n.kcal - coalesce(a.workout_kcal, 0) - round(22 * w.kg7) AS balance
  FROM nutrition_daily n LEFT JOIN act a ON a.d = n.date
  LEFT JOIN w ON w.day = n.date)
SELECT *, round(avg(balance) OVER (ORDER BY date ROWS 6 PRECEDING)) AS balance_7d
FROM bal ORDER BY date DESC LIMIT 14;

-- Protein g/kg body mass (weight = latest weigh-in on/before the day)
SELECT n.date, n.protein_g, m.body_mass_kg,
       round(n.protein_g / m.body_mass_kg, 2) AS protein_g_per_kg
FROM nutrition_daily n
ASOF LEFT JOIN (SELECT day, body_mass_kg FROM daily_metrics WHERE body_mass_kg IS NOT NULL) m
  ON n.date >= m.day
ORDER BY n.date DESC LIMIT 14;

-- Carbs on the day before and the day of each long run (>= 90 min)
SELECT (a.start_time AT TIME ZONE 'Europe/Vienna')::DATE AS run_day,
       round(a.distance_m / 1000, 1) AS km, round(a.timer_s / 60) AS min,
       prev.carbs_g AS carbs_day_before,
       round(prev.carbs_g / m.body_mass_kg, 1) AS carbs_g_per_kg_day_before,
       same.carbs_g AS carbs_run_day
FROM activities a
LEFT JOIN nutrition_daily prev ON prev.date = (a.start_time AT TIME ZONE 'Europe/Vienna')::DATE - 1
LEFT JOIN nutrition_daily same ON same.date = (a.start_time AT TIME ZONE 'Europe/Vienna')::DATE
ASOF LEFT JOIN (SELECT day, body_mass_kg FROM daily_metrics WHERE body_mass_kg IS NOT NULL) m
  ON (a.start_time AT TIME ZONE 'Europe/Vienna')::DATE >= m.day
WHERE a.sport = 'running' AND a.timer_s >= 90 * 60
  AND (prev.date IS NOT NULL OR same.date IS NOT NULL)
ORDER BY run_day DESC;
```

### Frozen readiness (daily_readiness)

`import_metrics.py` (and `import_all.py`) end by calling `training.readiness.freeze`,
which judges every past day once with the Readiness gate (GLOSSARY.md, ADR 0002):
HRV 3-day z-score, resting HR 7-day delta and sleep debt vs. the 30 days before that
day raise Recovery-Flags; 0/1/2+ flags = GREEN/AMBER/RED. Only data up to the day is
used, so a frozen day never changes unless its own inputs change (late correction).
Today stays unfrozen and is judged live by the same module (webview: dashed border).
Rule changes: edit `training/readiness.py` only and bump `ALGO_VERSION`; the next
freeze re-judges every day.

```bash
db/.venv/bin/python -m training readiness --freeze   # freeze/re-judge without re-importing
```

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

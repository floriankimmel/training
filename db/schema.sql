-- Training database schema (DuckDB)
-- 3 tiers: activities (session summary) -> laps -> records (per-second samples)
--
-- Design for multi-source import (HealthFit + TrainingPeaks):
--   * All timestamps stored TIMESTAMPTZ in UTC (no local-time drift).
--   * activity id = UTC start_time ISO string ('2026-03-02T10:22:46Z') -> stable
--     across sources, so the same activity from HealthFit and TrainingPeaks
--     collapses to one row.
--   * source column tracks provenance; on collision the higher-fidelity file
--     (more record rows) wins.

CREATE TABLE IF NOT EXISTS activities (
  id              VARCHAR PRIMARY KEY,   -- UTC start_time ISO, e.g. 2026-03-02T10:22:46Z
  start_time      TIMESTAMPTZ,
  timestamp       TIMESTAMPTZ,           -- session end time
  sport           VARCHAR,
  sub_sport       VARCHAR,
  distance_m      DOUBLE,
  elapsed_s       DOUBLE,
  timer_s         DOUBLE,
  avg_hr          INTEGER,
  max_hr          INTEGER,
  avg_power       INTEGER,
  max_power       INTEGER,
  avg_speed       DOUBLE,                -- m/s
  max_speed       DOUBLE,
  avg_cadence     INTEGER,
  total_ascent    INTEGER,
  total_descent   INTEGER,
  calories        INTEGER,
  num_laps        INTEGER,
  manufacturer    VARCHAR,
  source          VARCHAR,               -- 'healthfit' | 'trainingpeaks' | other
  record_count    INTEGER,               -- fidelity marker for dedup
  source_file     VARCHAR,
  imported_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS laps (
  activity_id     VARCHAR,
  lap_index       INTEGER,
  start_time      TIMESTAMPTZ,
  timestamp       TIMESTAMPTZ,
  distance_m      DOUBLE,
  timer_s         DOUBLE,
  elapsed_s       DOUBLE,
  avg_hr          INTEGER,
  max_hr          INTEGER,
  avg_speed       DOUBLE,
  max_speed       DOUBLE,
  avg_cadence     INTEGER,
  avg_power       INTEGER,
  max_power       INTEGER,
  calories        INTEGER,
  PRIMARY KEY (activity_id, lap_index)
);

CREATE TABLE IF NOT EXISTS records (
  activity_id     VARCHAR,
  ts              TIMESTAMPTZ,
  distance_m      DOUBLE,
  hr              INTEGER,
  cadence         INTEGER,
  power           INTEGER,
  speed           DOUBLE,
  altitude        DOUBLE
);

CREATE INDEX IF NOT EXISTS idx_records_act ON records(activity_id);
CREATE INDEX IF NOT EXISTS idx_records_ts  ON records(ts);
CREATE INDEX IF NOT EXISTS idx_laps_act    ON laps(activity_id);
CREATE INDEX IF NOT EXISTS idx_act_start   ON activities(start_time);

-- Training database schema (DuckDB)
-- 3 tiers: activities (session summary) -> laps -> records (per-second samples)
--
-- Design for multi-source import (HealthFit + TrainingPeaks):
--   * All timestamps stored TIMESTAMPTZ in UTC (no local-time drift).
--   * activity id = surrogate BIGINT from seq_activities. Dedup is by start_time
--     (+/- tolerance) + sport, so the same activity from HealthFit and
--     TrainingPeaks still collapses to one row regardless of the numeric id.
--   * source column tracks provenance; on collision the higher-fidelity file
--     (more record rows) wins.

CREATE SEQUENCE IF NOT EXISTS seq_activities START 1;

CREATE TABLE IF NOT EXISTS activities (
  id              BIGINT PRIMARY KEY DEFAULT nextval('seq_activities'),
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
  activity_id     BIGINT,
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
  activity_id     BIGINT,
  ts              TIMESTAMPTZ,
  distance_m      DOUBLE,
  hr              INTEGER,
  cadence         INTEGER,
  power           INTEGER,
  speed           DOUBLE,
  altitude        DOUBLE
);

-- Daily wellness/recovery metrics from Apple HealthKit (metrics/metrics-WW-YYYY.md).
-- One row per calendar day, keyed by the local date. Idempotent upsert on day.
CREATE TABLE IF NOT EXISTS daily_metrics (
  day             DATE PRIMARY KEY,
  weekday         VARCHAR,
  -- sleep
  bedtime_start   VARCHAR,               -- 'HH:MM' local
  bedtime_end     VARCHAR,               -- 'HH:MM' local
  time_in_bed_min INTEGER,
  sleep_min       INTEGER,
  efficiency_pct  INTEGER,
  deep_min        INTEGER,
  deep_pct        INTEGER,
  rem_min         INTEGER,
  rem_pct         INTEGER,
  core_min        INTEGER,
  core_pct        INTEGER,
  awake_min       INTEGER,
  -- HRV (SDNN)
  hrv_night_avg   DOUBLE,                -- ms
  hrv_day_avg     DOUBLE,                -- ms
  hrv_min         DOUBLE,                -- ms
  hrv_max         DOUBLE,                -- ms
  hrv_samples     INTEGER,
  -- resting HR
  resting_hr      INTEGER,               -- bpm
  source_file     VARCHAR,
  imported_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_records_act ON records(activity_id);
CREATE INDEX IF NOT EXISTS idx_records_ts  ON records(ts);
CREATE INDEX IF NOT EXISTS idx_laps_act    ON laps(activity_id);
CREATE INDEX IF NOT EXISTS idx_act_start   ON activities(start_time);

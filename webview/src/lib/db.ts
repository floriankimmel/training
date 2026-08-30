import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Reuse project-root detection logic (parent of webview/ holding trainings/)
function findProjectRoot(): string {
  let dir = import.meta.dirname;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'trainings')) && fs.existsSync(path.join(dir, 'db'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return path.resolve(process.cwd(), '..');
}

const PROJECT_ROOT = findProjectRoot();
const DB_PATH = path.join(PROJECT_ROOT, 'db', 'training.duckdb');
const TZ = 'Europe/Vienna';

export function dbAvailable(): boolean {
  return fs.existsSync(DB_PATH);
}

// Run a query read-only, return parsed JSON rows. Empty array on any failure.
function query<T = Record<string, unknown>>(sql: string): T[] {
  if (!dbAvailable()) return [];
  try {
    const out = execFileSync('duckdb', ['-readonly', '-json', DB_PATH, sql], {
      encoding: 'utf-8',
      maxBuffer: 32 * 1024 * 1024,
    });
    const trimmed = out.trim();
    if (!trimmed) return [];
    return JSON.parse(trimmed) as T[];
  } catch (err) {
    console.error('[db] query failed:', (err as Error).message);
    return [];
  }
}

export interface DayActivity {
  date: string;          // local ISO date
  sport: string;
  n: number;             // sessions merged that day
  km: number | null;
  min: number | null;    // moving time minutes
  avgHr: number | null;
  maxHr: number | null;
  vert: number | null;   // ascent m
  pace: number | null;   // min/km
}

export interface DayMetric {
  date: string;
  sleepMin: number | null;
  hrvNight: number | null;
  restingHr: number | null;
}

export interface WeekTotals {
  sessions: number;
  km: number;
  min: number;
  vert: number;
  avgHr: number | null;
}

export interface TrendPoint {
  week: number;
  year: number;
  km: number;
  vert: number;
  min: number;
}

export interface ZoneBucket {
  zone: string;   // Z0..Z5
  secs: number;
}

export interface Lap {
  index: number;
  km: number | null;
  secs: number | null;
  avgHr: number | null;
  maxHr: number | null;
  pace: number | null;   // min/km
  power: number | null;
}

export interface ActivityDetail {
  id: number;
  start: string;         // local ISO datetime
  km: number | null;
  movingMin: number | null;
  elapsedMin: number | null;
  avgHr: number | null;
  maxHr: number | null;
  avgPower: number | null;
  maxPower: number | null;
  avgCadence: number | null;
  vert: number | null;
  descent: number | null;
  calories: number | null;
  pace: number | null;   // min/km
  zones: ZoneBucket[];
  laps: Lap[];
}

// Per-day running actuals for [start,end] local dates (inclusive).
export function getWeekActivities(start: string, end: string): DayActivity[] {
  const sql = `
    SELECT
      (start_time AT TIME ZONE '${TZ}')::date::varchar AS date,
      any_value(sport) AS sport,
      count(*) AS n,
      round(sum(distance_m)/1000, 2) AS km,
      round(sum(timer_s)/60) AS min,
      round(sum(avg_hr * timer_s) / nullif(sum(timer_s), 0)) AS "avgHr",
      max(max_hr) AS "maxHr",
      sum(total_ascent) AS vert,
      round((sum(timer_s)/60) / nullif(sum(distance_m)/1000, 0), 2) AS pace
    FROM activities
    WHERE sport = 'running'
      AND (start_time AT TIME ZONE '${TZ}')::date BETWEEN DATE '${start}' AND DATE '${end}'
    GROUP BY 1
    ORDER BY 1`;
  return query<DayActivity>(sql).map(r => ({
    date: r.date,
    sport: r.sport,
    n: Number(r.n) || 0,
    km: r.km == null ? null : Number(r.km),
    min: r.min == null ? null : Number(r.min),
    avgHr: r.avgHr == null ? null : Number(r.avgHr),
    maxHr: r.maxHr == null ? null : Number(r.maxHr),
    vert: r.vert == null ? null : Number(r.vert),
    pace: r.pace == null ? null : Number(r.pace),
  }));
}

// Daily recovery metrics for the week.
export function getWeekMetrics(start: string, end: string): DayMetric[] {
  const sql = `
    SELECT day::varchar AS date,
           sleep_min AS "sleepMin",
           hrv_night_avg AS "hrvNight",
           resting_hr AS "restingHr"
    FROM daily_metrics
    WHERE day BETWEEN DATE '${start}' AND DATE '${end}'
    ORDER BY day`;
  return query<DayMetric>(sql);
}

export function getWeekTotals(start: string, end: string): WeekTotals {
  const sql = `
    SELECT
      count(*) AS sessions,
      round(sum(distance_m)/1000, 1) AS km,
      round(sum(timer_s)/60) AS min,
      coalesce(sum(total_ascent), 0) AS vert,
      round(sum(avg_hr * timer_s) / nullif(sum(timer_s), 0)) AS "avgHr"
    FROM activities
    WHERE sport = 'running'
      AND (start_time AT TIME ZONE '${TZ}')::date BETWEEN DATE '${start}' AND DATE '${end}'`;
  const r = query<WeekTotals>(sql)[0];
  if (!r) return { sessions: 0, km: 0, min: 0, vert: 0, avgHr: null };
  return {
    sessions: Number(r.sessions) || 0,
    km: Number(r.km) || 0,
    min: Number(r.min) || 0,
    vert: Number(r.vert) || 0,
    avgHr: r.avgHr == null ? null : Number(r.avgHr),
  };
}

// Rolling weekly running totals for the N ISO weeks ending at (endDate), for sparklines/trend.
export function getTrend(endDate: string, weeks = 8): TrendPoint[] {
  const sql = `
    WITH runs AS (
      SELECT
        (start_time AT TIME ZONE '${TZ}')::date AS d,
        distance_m, timer_s, total_ascent
      FROM activities
      WHERE sport = 'running'
        AND (start_time AT TIME ZONE '${TZ}')::date
            BETWEEN DATE '${endDate}' - INTERVAL '${weeks * 7 - 1}' DAY AND DATE '${endDate}'
    )
    SELECT
      cast(week(d) AS INTEGER) AS "week",
      cast(year(d) AS INTEGER) AS "year",
      round(sum(distance_m)/1000, 1) AS km,
      coalesce(sum(total_ascent), 0) AS vert,
      round(sum(timer_s)/60) AS min
    FROM runs
    GROUP BY year(d), week(d)
    ORDER BY year(d), week(d)`;
  return query<TrendPoint>(sql).map(r => ({
    week: Number(r.week),
    year: Number(r.year),
    km: Number(r.km) || 0,
    vert: Number(r.vert) || 0,
    min: Number(r.min) || 0,
  }));
}

// Full detail for the primary running activity on a given local date (largest by distance).
export function getActivityDetail(date: string): ActivityDetail | null {
  const actSql = `
    SELECT
      id,
      strftime(start_time AT TIME ZONE '${TZ}', '%Y-%m-%d %H:%M') AS start,
      round(distance_m/1000, 2) AS km,
      round(timer_s/60, 1) AS "movingMin",
      round(elapsed_s/60, 1) AS "elapsedMin",
      avg_hr AS "avgHr", max_hr AS "maxHr",
      avg_power AS "avgPower", max_power AS "maxPower",
      avg_cadence AS "avgCadence",
      total_ascent AS vert, total_descent AS descent,
      calories,
      round((timer_s/60)/nullif(distance_m/1000,0), 2) AS pace
    FROM activities
    WHERE sport='running'
      AND (start_time AT TIME ZONE '${TZ}')::date = DATE '${date}'
    ORDER BY distance_m DESC NULLS LAST
    LIMIT 1`;
  const a = query<Record<string, unknown>>(actSql)[0];
  if (!a) return null;
  const id = Number(a.id);

  const zoneSql = `
    SELECT CASE WHEN hr IS NULL THEN 'na'
           WHEN hr<=124 THEN 'Z0' WHEN hr<=142 THEN 'Z1' WHEN hr<=152 THEN 'Z2'
           WHEN hr<=160 THEN 'Z3' WHEN hr<=179 THEN 'Z4' ELSE 'Z5' END AS "zone",
           count(*) AS secs
    FROM records WHERE activity_id=${id} GROUP BY 1 ORDER BY 1`;
  const zones = query<ZoneBucket>(zoneSql)
    .filter(z => z.zone !== 'na')
    .map(z => ({ zone: z.zone, secs: Number(z.secs) || 0 }));

  const lapSql = `
    SELECT lap_index AS index,
           round(distance_m/1000, 2) AS km,
           round(timer_s) AS secs,
           avg_hr AS "avgHr", max_hr AS "maxHr",
           round((timer_s/60)/nullif(distance_m/1000,0), 2) AS pace,
           avg_power AS power
    FROM laps WHERE activity_id=${id} ORDER BY lap_index`;
  const laps = query<Lap>(lapSql).map(l => ({
    index: Number(l.index),
    km: l.km == null ? null : Number(l.km),
    secs: l.secs == null ? null : Number(l.secs),
    avgHr: l.avgHr == null ? null : Number(l.avgHr),
    maxHr: l.maxHr == null ? null : Number(l.maxHr),
    pace: l.pace == null ? null : Number(l.pace),
    power: l.power == null ? null : Number(l.power),
  }));

  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
    id,
    start: String(a.start),
    km: num(a.km),
    movingMin: num(a.movingMin),
    elapsedMin: num(a.elapsedMin),
    avgHr: num(a.avgHr),
    maxHr: num(a.maxHr),
    avgPower: num(a.avgPower),
    maxPower: num(a.maxPower),
    avgCadence: num(a.avgCadence),
    vert: num(a.vert),
    descent: num(a.descent),
    calories: num(a.calories),
    pace: num(a.pace),
    zones,
    laps,
  };
}

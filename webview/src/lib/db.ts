import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { REPO_ROOT as PROJECT_ROOT } from './repo';
import { coreZones } from './core';
const DB_PATH = path.join(PROJECT_ROOT, 'db', 'training.duckdb');
const TZ = 'Europe/Vienna';

// Filter out GPS/import fragments & broken-summary duplicates (e.g. a 767m/143s
// row that overlaps the real run). Real short runs are >=500m and >=180s.
const REAL_RUN = `sport='running' AND distance_m >= 500 AND timer_s >= 180`;

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
  bodyKg: number | null;
  kcal: number | null;       // nutrition_daily (Vita Fit), keyed by day eaten; null = not logged
  proteinGkg: number | null; // protein g per kg, last known body weight <= day
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
  synthetic?: boolean;   // reconstructed from records (missing .fit lap)
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
  lapsCoverFull: boolean;   // laps cover >=90% of distance (else partial .fit → misleading)
  pausedSec: number | null; // elapsed - moving
  pauses: PauseSeg[];       // individual stops reconstructed from record gaps
}

export interface PauseSeg { atKm: number | null; startLocal: string; durSec: number; }


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
    WHERE ${REAL_RUN}
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

// Kraft sessions per local day. HealthFit imports Apple Watch "Core-Training" as sport=generic;
// older Garmin ones are training/strength_training. Yoga/Pilates excluded.
export interface DayStrength { date: string; n: number; min: number; }
export function getWeekStrength(start: string, end: string): DayStrength[] {
  return query<DayStrength>(`
    SELECT (start_time AT TIME ZONE '${TZ}')::date::varchar AS date, count(*) AS n, round(sum(timer_s)/60) AS min
    FROM activities
    WHERE (sport = 'generic' OR (sport = 'training' AND sub_sport = 'strength_training'))
      AND coalesce(sub_sport, 'generic') IN ('generic', 'strength_training')
      AND timer_s >= 300
      AND (start_time AT TIME ZONE '${TZ}')::date BETWEEN DATE '${start}' AND DATE '${end}'
    GROUP BY 1 ORDER BY 1`).map(r => ({ date: r.date, n: Number(r.n), min: Number(r.min) }));
}

// Daily recovery metric values for the week (Readiness itself comes from the Python core).
export function getWeekMetrics(start: string, end: string): DayMetric[] {
  // Full join: a day can have food logged but no recovery row (and vice versa).
  return query<DayMetric>(`
    SELECT coalesce(m.day, n.date)::varchar AS date, m.sleep_min AS "sleepMin", m.hrv_night_avg AS "hrvNight",
           m.resting_hr AS "restingHr", m.body_mass_kg AS "bodyKg", n.kcal,
           round(n.protein_g / (SELECT body_mass_kg FROM daily_metrics w
                                WHERE w.body_mass_kg IS NOT NULL AND w.day <= coalesce(m.day, n.date)
                                ORDER BY w.day DESC LIMIT 1), 2) AS "proteinGkg"
    FROM (SELECT * FROM daily_metrics WHERE day BETWEEN DATE '${start}' AND DATE '${end}') m
    FULL OUTER JOIN (SELECT * FROM nutrition_daily WHERE date BETWEEN DATE '${start}' AND DATE '${end}') n
      ON m.day = n.date
    ORDER BY 1`);
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
    WHERE ${REAL_RUN}
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
      WHERE ${REAL_RUN}
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
           ${coreZones().map(z => `WHEN hr<=${z.hi} THEN '${z.name}'`).join(' ')} ELSE 'na' END AS "zone",
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
  const kmVal = num(a.km);
  const movingSec = num(a.movingMin) != null ? Math.round(num(a.movingMin)! * 60) : null;
  const lapKmSum = laps.reduce((s, l) => s + (l.km ?? 0), 0);
  const lapSecSum = laps.reduce((s, l) => s + (l.secs ?? 0), 0);
  // Reconstruct the uncovered tail from records when .fit laps are partial
  // (missing distance OR missing time vs the activity totals).
  const distGap = kmVal != null && kmVal > 0 && lapKmSum < kmVal * 0.97;
  const timeGap = movingSec != null && movingSec > 0 && lapSecSum < movingSec * 0.97;
  if (laps.length > 0 && (distGap || timeGap)) {
    const coveredM = Math.round(lapKmSum * 1000);
    const restSql = `
      WITH t AS (
        SELECT ts, distance_m, hr, power,
               date_diff('second', lag(ts) OVER(ORDER BY ts), ts) AS gap
        FROM records WHERE activity_id=${id} AND distance_m > ${coveredM}
      )
      SELECT round((max(distance_m)-min(distance_m))/1000, 2) AS km,
             round(date_diff('second', min(ts), max(ts))
                   - coalesce(sum(gap) FILTER(WHERE gap > 3), 0)) AS secs,
             round(avg(hr)) AS "avgHr", max(hr) AS "maxHr",
             round(avg(power)) AS power
      FROM t`;
    const r = query<Lap>(restSql)[0];
    if (r && r.km != null && Number(r.km) > 0.05) {
      const km = Number(r.km);
      const secs = r.secs == null ? null : Number(r.secs);
      const pace = secs != null && km > 0 ? Math.round((secs / 60) / km * 100) / 100 : null;
      laps.push({
        index: laps.length,
        km,
        secs,
        avgHr: r.avgHr == null ? null : Number(r.avgHr),
        maxHr: r.maxHr == null ? null : Number(r.maxHr),
        pace,
        power: r.power == null ? null : Number(r.power),
        synthetic: true,
      });
    }
  }
  const lapKmTotal = laps.reduce((s, l) => s + (l.km ?? 0), 0);
  const lapSecTotal = laps.reduce((s, l) => s + (l.secs ?? 0), 0);
  const kmOk = kmVal != null && kmVal > 0 && lapKmTotal >= kmVal * 0.95;
  const secOk = movingSec != null && movingSec > 0 && lapSecTotal >= movingSec * 0.95;
  const lapsCoverFull = kmOk && (movingSec == null || secOk);

  // Pauses: record gaps > 3s. Sum matches elapsed - timer.
  const pauseSql = `
    WITH r AS (SELECT ts, distance_m, lag(ts) OVER(ORDER BY ts) prev FROM records WHERE activity_id=${id})
    SELECT round(distance_m/1000, 2) AS "atKm",
           strftime(prev AT TIME ZONE '${TZ}', '%H:%M') AS "startLocal",
           date_diff('second', prev, ts) AS "durSec"
    FROM r WHERE date_diff('second', prev, ts) > 3 ORDER BY prev`;
  const pauses: PauseSeg[] = query<PauseSeg>(pauseSql).map(p => ({
    atKm: p.atKm == null ? null : Number(p.atKm),
    startLocal: String(p.startLocal),
    durSec: Number(p.durSec) || 0,
  }));
  const mv = num(a.movingMin), el = num(a.elapsedMin);
  const pausedSec = mv != null && el != null ? Math.round((el - mv) * 60) : null;
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
    lapsCoverFull,
    pausedSec,
    pauses,
  };
}

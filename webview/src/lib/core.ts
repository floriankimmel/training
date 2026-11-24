// Adapter to the Python domain core (docs/adr/0001-python-domain-core-cli-bridge.md).
// One `python -m training page --json` call per page load; no domain rules live here.
import { execFileSync } from 'node:child_process';
import { repoPath, REPO_ROOT } from './repo';

export type EinheitArt = 'run' | 'bike' | 'strength' | 'footwork' | 'rest';

export interface Einheit {
  kind: EinheitArt | null;
  title: string;
  duration: string;
  minutes: number | null;
  body: string;
  strength_tag: string | null;
  page_refs: string[];
}

export interface PlanDay {
  date: string;
  weekday: string;
  body: string;
  einheiten: Einheit[];
}

export interface Plan {
  year: number;
  week: number;
  title: string;
  philosophy: string;
  summary_table: string;
  legacy: boolean;
  days: PlanDay[];
  problems: string[];
}

export interface Zone { name: string; label: string; lo: number; hi: number; }

// Schwelle trend card (training/benchmarks.py)
export interface FitnessTrend {
  label: string;
  rows: { period: string; value: string; month: string | null }[];
  note: string;
  staleMonths: number;
}

// Readiness gate per day (training/readiness.py, ADR 0002). Flag null = not enough data.
export interface Readiness {
  day: string;
  verdict: 'GREEN' | 'AMBER' | 'RED' | null;
  hrv_flag: boolean | null;
  rhr_flag: boolean | null;
  sleep_flag: boolean | null;
  reasons: string[];
  frozen: boolean;
}

// Season context for the header (training/context.py): race, macro phase, injuries, progression.
export interface RaceInfo {
  name: string;
  distanceKm: number | null;
  vertHm: number | null;
  date: string;          // ISO
  daysToGo: number | null;
  goal: string | null;
}

export interface PhaseInfo {
  week: number;
  phase: string;         // "Build 2"
  longRun: string;       // "85min"
  vertTarget: number | null;  // ~450
  focus: string;
}

export interface InjuryInfo { title: string; status: string; }

export interface LrPoint { week: number; phase: string; lrMin: number | null; vert: number | null; }

export interface SeasonContext {
  race: RaceInfo | null;
  phase: PhaseInfo | null;
  injuries: InjuryInfo[];
  progression: LrPoint[];
}

export interface PageData {
  weeks: { year: number; week: number }[];
  current: { year: number; week: number } | null;
  plan: Plan | null;
  trend: FitnessTrend | null;
  zones: Zone[];
  readiness: Readiness[];
  context: SeasonContext;
}

// Insights modal (training/insights.py)
export interface MonthPoint { month: string; value: number | null; n?: number; }
export interface LoadPoint { week: number; year: number; km: number; vert: number; }
export interface Insights {
  efficiency: MonthPoint[];   // Aerobe Effizienz: Pace in Zone Z1 as km/h per month
  ef: MonthPoint[];
  rhr: MonthPoint[];
  hrv: MonthPoint[];
  load: LoadPoint[];
  verdict: { level: 'up' | 'flat' | 'down'; effDeltaPct: number | null; text: string };
}

const EMPTY: PageData = {
  weeks: [], current: null, plan: null, trend: null, zones: [], readiness: [],
  context: { race: null, phase: null, injuries: [], progression: [] },
};

function runCore<T>(args: string[], fallback: T): T {
  try {
    const out = execFileSync(repoPath('db', '.venv', 'bin', 'python'), ['-m', 'training', ...args], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      maxBuffer: 16 * 1024 * 1024,
    });
    return JSON.parse(out) as T;
  } catch (err) {
    console.error(`[core] python -m training ${args[0]} failed:`, (err as Error).message);
    return fallback;
  }
}

export function corePage(year?: number, week?: number): PageData {
  const args = ['page', '--json'];
  if (year && week) args.push('--year', String(year), '--week', String(week));
  return runCore(args, EMPTY);
}

export function coreInsights(months = 8): Insights | null {
  return runCore(['insights', '--json', '--months', String(months)], null);
}

let zonesCache: Zone[] | null = null;
export function coreZones(): Zone[] {
  return (zonesCache ??= runCore<Zone[]>(['zones'], []));
}

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

export interface PageData {
  weeks: { year: number; week: number }[];
  current: { year: number; week: number } | null;
  plan: Plan | null;
}

const EMPTY: PageData = { weeks: [], current: null, plan: null };

export function corePage(year?: number, week?: number): PageData {
  const args = ['-m', 'training', 'page', '--json'];
  if (year && week) args.push('--year', String(year), '--week', String(week));
  try {
    const out = execFileSync(repoPath('db', '.venv', 'bin', 'python'), args, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      maxBuffer: 16 * 1024 * 1024,
    });
    return JSON.parse(out) as PageData;
  } catch (err) {
    console.error('[core] python -m training page failed:', (err as Error).message);
    return EMPTY;
  }
}

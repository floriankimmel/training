import fs from 'node:fs';
import path from 'node:path';

function findProjectRoot(): string {
  let dir = import.meta.dirname;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'trainings')) && fs.existsSync(path.join(dir, 'STATUS.md'))) return dir;
    dir = path.dirname(dir);
  }
  return path.resolve(process.cwd(), '..');
}
const ROOT = findProjectRoot();

function readFile(rel: string): string {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf-8'); } catch { return ''; }
}

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

export interface InjuryInfo {
  title: string;
  status: string;
}

export interface FitnessTrend {
  label: string;
  rows: { period: string; value: string }[];
  note: string;
}

// --- Race (from STATUS.md Current Target) ---
export function getRace(): RaceInfo | null {
  const s = readFile('STATUS.md');
  if (!s) return null;
  // - **Race**: Vienna Trail Run — 23.8 km / ~1000 hm — 2026-10-18
  const m = s.match(/\*\*Race\*\*:\s*(.+?)\s*[—-]\s*([\d.]+)\s*km\s*\/\s*~?([\d]+)\s*hm\s*[—-]\s*(\d{4}-\d{2}-\d{2})/);
  const goalM = s.match(/\*\*Goal time\*\*:\s*(.+?)\s*$/m);
  if (!m) return null;
  const date = m[4];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const raceD = new Date(date + 'T00:00:00');
  const daysToGo = Math.round((raceD.getTime() - today.getTime()) / 86400000);
  return {
    name: m[1].trim(),
    distanceKm: parseFloat(m[2]),
    vertHm: parseInt(m[3]),
    date,
    daysToGo,
    goal: goalM ? goalM[1].trim() : null,
  };
}

// --- Phase / weekly target (from build-plan macro table, matched by week) ---
export function getPhase(week: number): PhaseInfo | null {
  const s = readFile('plans/build-plan-vienna-2026.md');
  if (!s) return null;
  // | W36 | 08-31 | Build 2 | 85min | ~450 | 250–350 | more vert, sustained climbs |
  const re = new RegExp(`\\|\\s*W${week}\\s*\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|([^|]*)\\|`);
  const m = s.match(re);
  if (!m) return null;
  const vertM = m[4].match(/(\d+)/);
  return {
    week,
    phase: m[2].trim(),
    longRun: m[3].trim(),
    vertTarget: vertM ? parseInt(vertM[1]) : null,
    focus: m[6].trim(),
  };
}

// --- Active injuries/illness (from injuries.md) ---
export function getActiveInjuries(): InjuryInfo[] {
  const s = readFile('injuries.md');
  if (!s) return [];
  const out: InjuryInfo[] = [];
  // Split on section headers "## Title"
  const sections = s.split(/\n## /).slice(1);
  for (const sec of sections) {
    const title = sec.split('\n')[0].trim();
    const statusM = sec.match(/\*\*Status\*\*:\s*(.+?)\s*$/m);
    if (!statusM) continue;
    const status = statusM[1].trim();
    // active if starts with "active" and not resolved/healed
    if (/^active/i.test(status) && !/resolved|healed|abgeschlossen/i.test(status)) {
      out.push({ title, status });
    }
  }
  return out;
}

// --- Fitness trend (threshold pace table from benchmarks.md) ---
export function getFitnessTrend(): FitnessTrend | null {
  const s = readFile('benchmarks.md');
  if (!s) return null;
  // Threshold section: "**Schwelle/Tempo (HF 160–170)"
  const idx = s.indexOf('Schwelle/Tempo');
  if (idx < 0) return null;
  const block = s.slice(idx, idx + 600);
  const rows: { period: string; value: string }[] = [];
  const rowRe = /\|\s*([A-Za-zä]+ \d{4})\s*\|\s*\*{0,2}([\d:]+ \/km)\*{0,2}\s*\|/g;
  let m;
  while ((m = rowRe.exec(block)) !== null) rows.push({ period: m[1], value: m[2] });
  const noteM = s.match(/→ \*\*(.+?)\*\*/);
  if (rows.length === 0) return null;
  return {
    label: 'Schwellen-Pace @ HF 160–170',
    rows,
    note: noteM ? noteM[1].replace(/\*/g, '') : '',
  };
}

// --- Long-run progression (build-plan macro table, all weeks) ---
export interface LrPoint { week: number; phase: string; lrMin: number | null; vert: number | null; }
export function getBuildProgression(): LrPoint[] {
  const s = readFile('plans/build-plan-vienna-2026.md');
  if (!s) return [];
  const out: LrPoint[] = [];
  const re = /\|\s*W(\d+)\s*\|[^|]*\|([^|]*)\|([^|]*)\|([^|]*)\|/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const lrM = m[3].match(/(\d+)\s*min/);
    const vertM = m[4].match(/(\d+)/);
    out.push({
      week: parseInt(m[1]),
      phase: m[2].trim(),
      lrMin: lrM ? parseInt(lrM[1]) : null,
      vert: vertM ? parseInt(vertM[1]) : null,
    });
  }
  return out;
}

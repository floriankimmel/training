import React, { useEffect, useState } from 'react';
import type { Insights, MonthPoint, LoadPoint } from '../lib/db';

function monthLabel(m: string): string {
  const [, mm] = m.split('-');
  return ['', 'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'][parseInt(mm)] ?? m;
}

// Small bar chart for MonthPoints. invert=true -> lower value renders taller (good for pace/RHR).
function MonthBars({ data, unit, decimals = 1, higherBetter = true, invert = false, fmt }: { data: MonthPoint[]; unit?: string; decimals?: number; higherBetter?: boolean; invert?: boolean; fmt?: (v: number) => string }) {
  const vals = data.filter(d => d.value != null).map(d => d.value as number);
  if (vals.length === 0) return <p className="text-xs text-slate-600">keine Daten</p>;
  const max = Math.max(...vals), min = Math.min(...vals);
  const range = max - min || 1;
  const show = (v: number) => (fmt ? fmt(v) : v.toFixed(decimals));
  return (
    <div className="flex items-end gap-1.5 h-28 pt-5">
      {data.map((d, i) => {
        const v = d.value;
        const frac = v == null ? 0 : (invert ? (max - v) : (v - min)) / range;
        const h = v == null ? 0 : 45 + frac * 55;
        const isLast = i === data.length - 1;
        return (
          <div key={d.month} className="flex-1 flex flex-col items-center justify-end h-full relative">
            {v != null && (
              <span className={`text-[9px] mb-0.5 ${isLast ? 'text-emerald-300 font-semibold' : 'text-slate-500'}`}>{show(v)}</span>
            )}
            <div className={`w-full rounded-t ${isLast ? (higherBetter ? 'bg-emerald-400' : 'bg-sky-400') : 'bg-slate-600'} ${v == null ? 'opacity-20' : ''}`}
              style={{ height: `${h}%` }} title={`${d.month}: ${v != null ? show(v) : '–'}${unit ?? ''}`} />
            <span className="text-[9px] text-slate-500 mt-0.5">{monthLabel(d.month)}</span>
          </div>
        );
      })}
    </div>
  );
}

// km/h -> min/km pace string
function kmhToPace(kmh: number): string {
  const minPerKm = 60 / kmh;
  const m = Math.floor(minPerKm);
  const s = Math.round((minPerKm - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function firstLast(data: MonthPoint[]): { first: number; last: number } | null {
  const v = data.filter(d => d.value != null);
  if (v.length < 2) return null;
  return { first: v[0].value as number, last: v[v.length - 1].value as number };
}

function LoadBars({ data }: { data: LoadPoint[] }) {
  const maxKm = Math.max(...data.map(d => d.km), 1);
  const maxVert = Math.max(...data.map(d => d.vert), 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map(d => (
        <div key={`${d.year}-${d.week}`} className="flex-1 flex flex-col items-center justify-end h-full group relative">
          <div className="w-full flex flex-col justify-end h-full gap-0.5">
            <div className="w-full bg-orange-500/70 rounded-t" style={{ height: `${(d.vert / maxVert) * 45}%` }}
              title={`${d.vert} hm`} />
            <div className="w-full bg-emerald-600/70" style={{ height: `${(d.km / maxKm) * 45}%` }}
              title={`${d.km} km`} />
          </div>
          <span className="text-[9px] text-slate-500 mt-0.5">{d.week}</span>
        </div>
      ))}
    </div>
  );
}

const VERDICT: Record<string, { icon: string; cls: string; label: string }> = {
  up: { icon: '📈', cls: 'text-emerald-400 border-emerald-700/50 bg-emerald-900/20', label: 'Fitter' },
  flat: { icon: '➡️', cls: 'text-slate-300 border-slate-600 bg-slate-800/40', label: 'Stabil' },
  down: { icon: '📉', cls: 'text-yellow-300 border-yellow-700/50 bg-yellow-900/20', label: 'Unter Schnitt' },
};

export default function InsightsModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/insights').then(r => r.json()).then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const effFL = data && firstLast(data.efficiency);
  const v = data ? VERDICT[data.verdict.level] : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[90vw] max-w-[1100px] max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <h3 className="font-semibold text-lg">📊 Fitness-Insights <span className="text-xs text-slate-500 ml-2">letzte 8 Monate</span></h3>
          <div className="flex items-center gap-3">
            <kbd className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">ESC</kbd>
            <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6">
          {loading && <p className="text-sm text-slate-500">Berechne Insights…</p>}
          {!loading && !data && <p className="text-sm text-slate-500">Keine Daten.</p>}

          {data && (
            <>
              {/* Verdict */}
              {v && (
                <div className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${v.cls}`}>
                  <span className="text-2xl">{v.icon}</span>
                  <div>
                    <div className="font-bold">{v.label}
                      {data.verdict.effDeltaPct != null && (
                        <span className="ml-2 text-sm font-normal">
                          {data.verdict.effDeltaPct > 0 ? '+' : ''}{data.verdict.effDeltaPct.toFixed(1)}% aerobe Effizienz vs. Schnitt
                        </span>
                      )}
                    </div>
                    <div className="text-xs opacity-80">{data.verdict.text}</div>
                  </div>
                </div>
              )}

              {/* Aerobic efficiency */}
              <Section title="Aerobe Effizienz — Pace bei HF 140–150" hint="schneller (niedrigere min/km) bei gleicher HF = fitter. Gelände-neutral.">
                <MonthBars data={data.efficiency} decimals={2} higherBetter invert fmt={kmhToPace} />
                {effFL && (
                  <p className="text-xs text-slate-400 mt-2">
                    {kmhToPace(effFL.first)} → <span className="text-emerald-400 font-semibold">{kmhToPace(effFL.last)} /km</span>
                    {' '}({effFL.last >= effFL.first ? 'schneller' : 'langsamer'})
                  </p>
                )}
              </Section>

              {/* Efficiency Factor */}
              <Section title="Efficiency Factor (Speed/HF)" hint="aerobe Ökonomie auf lockeren Läufen. Steigt mit Fitness.">
                <MonthBars data={data.ef} decimals={2} higherBetter />
              </Section>

              {/* RHR + HRV side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Section title="Ruhepuls (RHF)" hint="niedriger = besser erholt / fitter.">
                  <MonthBars data={data.rhr} unit=" bpm" decimals={0} higherBetter={false} invert />
                </Section>
                <Section title="HRV (SDNN, Nacht)" hint="höher = bessere autonome Erholung.">
                  <MonthBars data={data.hrv} unit=" ms" decimals={0} higherBetter />
                </Section>
              </div>

              {/* Weekly load */}
              <Section title="Wochen-Load — km + Vertical (12 Wo)" hint="Aufbau-Rampe. Grün = km, Orange = hm.">
                <LoadBars data={data.load} />
                <div className="flex gap-4 mt-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-600/70 inline-block" /> Distanz km</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-orange-500/70 inline-block" /> Vertical hm</span>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
        {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

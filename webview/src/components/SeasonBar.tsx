import React from 'react';
import type { RaceInfo, PhaseInfo, InjuryInfo, FitnessTrend, LrPoint } from '../lib/parseContext';

interface Props {
  race: RaceInfo | null;
  phase: PhaseInfo | null;
  injuries: InjuryInfo[];
  trend: FitnessTrend | null;
  progression: LrPoint[];
  vertActual: number;      // hm this week from DB
  currentWeek: number;
}

export default function SeasonBar({ race, phase, injuries, trend, progression, vertActual, currentWeek }: Props) {
  const vertPct = phase?.vertTarget ? Math.min(100, Math.round((vertActual / phase.vertTarget) * 100)) : null;

  return (
    <div className="mb-5 space-y-3">
      {/* Injury banner */}
      {injuries.map(inj => (
        <div key={inj.title} className="flex items-start gap-2 bg-yellow-900/20 border border-yellow-700/50 rounded-lg px-3 py-2 text-sm">
          <span>⚠️</span>
          <div>
            <span className="text-yellow-300 font-semibold">{inj.title.replace(/^\d{4}\s*—\s*/, '')}</span>
            <span className="text-yellow-200/70 ml-2">{inj.status}</span>
          </div>
        </div>
      ))}

      {/* Race + Phase row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.6fr_1fr] gap-3">
        {/* Race countdown */}
        {race && (
          <div className="bg-gradient-to-br from-sky-950/60 to-slate-800/50 border border-sky-800/40 rounded-lg px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-sky-400/80">Ziel-Rennen</div>
            <div className="font-bold text-white text-lg leading-tight">{race.name}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {race.distanceKm} km · {race.vertHm} hm{race.goal && <> · Ziel {race.goal}</>}
            </div>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <span className="text-2xl font-bold text-sky-300">{race.daysToGo}</span>
              <span className="text-xs text-slate-400">Tage · {race.date}</span>
            </div>
          </div>
        )}

        {/* Phase + Vert Soll/Ist */}
        {phase ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wide text-emerald-400/80">Phase · W{phase.week}</div>
              <span className="text-xs text-slate-500">LR-Soll {phase.longRun}</span>
            </div>
            <div className="font-bold text-white text-lg leading-tight">{phase.phase}</div>
            <div className="text-xs text-slate-400 mb-2 line-clamp-1">{phase.focus}</div>
            {/* Vert progress */}
            {phase.vertTarget != null && (
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-0.5">
                  <span>Vertical</span>
                  <span><span className="text-emerald-400 font-semibold">{vertActual}</span> / {phase.vertTarget} hm</span>
                </div>
                <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full ${vertPct! >= 100 ? 'bg-emerald-500' : vertPct! >= 60 ? 'bg-emerald-500/80' : 'bg-sky-500/80'}`}
                    style={{ width: `${vertPct}%` }} />
                </div>
              </div>
            )}
          </div>
        ) : <div />}

        {/* Fitness trend */}
        {trend && trend.rows.length >= 2 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-500">{trend.label}</div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-slate-500 text-xs line-through">{trend.rows[0].value.replace(' /km', '')}</span>
              <span className="text-slate-500">→</span>
              <span className="text-emerald-400 font-bold text-lg">{trend.rows[trend.rows.length - 1].value.replace(' /km', '')}</span>
              <span className="text-xs text-slate-500">/km</span>
            </div>
            {trend.note && <div className="text-[11px] text-emerald-300/70 mt-0.5 line-clamp-2">{trend.note}</div>}
          </div>
        )}
      </div>

      {/* Long-run progression across build */}
      {progression.length > 0 && (
        <BuildProgression points={progression} currentWeek={currentWeek} />
      )}
    </div>
  );
}

function BuildProgression({ points, currentWeek }: { points: LrPoint[]; currentWeek: number }) {
  const maxLr = Math.max(...points.map(p => p.lrMin ?? 0), 1);
  return (
    <div className="bg-slate-800/40 border border-slate-700 rounded-lg px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Aufbau — Long Run bis Race</div>
      <div className="flex items-end gap-1.5 h-16">
        {points.map(p => {
          const isNow = p.week === currentWeek;
          const isRace = /race/i.test(p.phase);
          const h = ((p.lrMin ?? 0) / maxLr) * 100;
          return (
            <div key={p.week} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div className="absolute -top-0 opacity-0 group-hover:opacity-100 text-[10px] text-slate-300 bg-slate-900 px-1.5 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
                W{p.week} {p.phase} · {p.lrMin ? `${p.lrMin}min` : '–'} · {p.vert ?? '–'}hm
              </div>
              <div
                className={`w-full rounded-t ${isNow ? 'bg-sky-400' : isRace ? 'bg-amber-500' : 'bg-emerald-600/60'} transition-colors`}
                style={{ height: `${Math.max(6, h)}%` }}
              />
              <span className={`text-[9px] mt-0.5 ${isNow ? 'text-sky-400 font-bold' : 'text-slate-600'}`}>{p.week}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

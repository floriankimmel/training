import React, { useState, useEffect } from 'react';
import type { WeekData, FeedbackData, Session, FeedbackSession } from '../lib/parseTraining';
import type { DayActivity, DayMetric, WeekTotals, TrendPoint } from '../lib/db';
import FeedbackModal from './FeedbackPanel';

interface Props {
  weekData: WeekData;
  feedbackData: FeedbackData | null;
  activities: DayActivity[];
  metrics: DayMetric[];
  totals: WeekTotals;
  trend: TrendPoint[];
  weekDates: { start: string; end: string };
  currentWeek: { week: number; year: number };
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function fmtPace(p: number | null): string {
  if (p == null) return '';
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtSleep(min: number | null): string {
  if (min == null) return '–';
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

function sessionIcon(title: string, type: string): string {
  const t = title.toLowerCase();
  if (type === 'rest') return '🛌';
  if (type === 'strength') return '🏋️';
  if (t.includes('hill') || t.includes('berg')) return '⛰️';
  if (t.includes('intervall') || t.includes('interval')) return '⚡';
  if (t.includes('long') || t.includes('lang')) return '🏃‍♂️';
  if (t.includes('recovery') || t.includes('erholung')) return '🚶';
  if (t.includes('tempo')) return '💨';
  return '🏃';
}

// One arrow comparing latest full metric vs mean of the rest.
function trendArrow(values: number[], higherBetter = true): { arrow: string; cls: string } {
  // Keep zeros: the current (possibly empty) week must count as the last point.
  const vals = values;
  if (vals.length < 2) return { arrow: '–', cls: 'text-slate-500' };
  const last = vals[vals.length - 1];
  const prev = vals.slice(0, -1);
  const avg = prev.reduce((a, b) => a + b, 0) / prev.length;
  if (avg === 0) return { arrow: '–', cls: 'text-slate-500' };
  const diff = (last - avg) / avg;
  if (Math.abs(diff) < 0.05) return { arrow: '→', cls: 'text-slate-400' };
  const up = diff > 0;
  const good = up === higherBetter;
  return {
    arrow: up ? '▲' : '▼',
    cls: good ? 'text-emerald-400' : 'text-red-400',
  };
}

function Sparkline({ values, higherBetter = true }: { values: number[]; higherBetter?: boolean }) {
  const w = 80, h = 22;
  const vals = values.length ? values : [0];
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const step = vals.length > 1 ? w / (vals.length - 1) : w;
  const pts = vals.map((v, i) => `${i * step},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  const t = trendArrow(vals, higherBetter);
  return (
    <div className="flex items-center gap-2">
      <svg width={w} height={h} className="overflow-visible">
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5"
          className="text-slate-500" strokeLinejoin="round" strokeLinecap="round" />
        {vals.length > 0 && (
          <circle cx={(vals.length - 1) * step} cy={h - ((vals[vals.length - 1] - min) / range) * (h - 4) - 2}
            r="2" className={t.cls} fill="currentColor" />
        )}
      </svg>
      <span className={`text-sm font-bold ${t.cls}`}>{t.arrow}</span>
    </div>
  );
}

interface DayCell {
  date: string;
  weekday: string;
  session: Session | null;
  actual: DayActivity | null;
  metric: DayMetric | null;
  feedback: FeedbackSession | undefined;
}

export default function WeekGrid({ weekData, feedbackData, activities, metrics, totals, trend, weekDates, currentWeek }: Props) {
  const [modalSession, setModalSession] = useState<{ session: Session; feedback: FeedbackSession | undefined } | null>(null);
  const [selected, setSelected] = useState(0);
  const today = todayISO();

  const actByDate = new Map(activities.map(a => [a.date, a]));
  const metByDate = new Map(metrics.map(m => [m.date, m]));

  // Build 7 day cells Mon..Sun from the week's Monday.
  const cells: DayCell[] = WEEKDAYS.map((wd, i) => {
    const date = addDays(weekDates.start, i);
    const session = weekData.sessions.find(s => s.date === date) ?? null;
    const feedback = feedbackData?.sessions.find(f => f.date === date);
    return {
      date,
      weekday: wd,
      session,
      actual: actByDate.get(date) ?? null,
      metric: metByDate.get(date) ?? null,
      feedback,
    };
  });

  // Trend series (chronological). Ensure the displayed week is the last point so
  // the number, sparkline end and arrow all describe the SAME week.
  const trendSeries = (() => {
    const rest = trend.filter(t => !(t.week === currentWeek.week && t.year === currentWeek.year));
    return [...rest, { week: currentWeek.week, year: currentWeek.year, km: totals.km, vert: totals.vert, min: totals.min }];
  })();
  const kmSeries = trendSeries.map(t => t.km);
  const vertSeries = trendSeries.map(t => t.vert);
  const minSeries = trendSeries.map(t => t.min);

  function openCell(c: DayCell) {
    if (!c.session) return;
    if (c.session.type === 'rest' && !c.feedback && !c.actual) return;
    setModalSession({ session: c.session, feedback: c.feedback });
  }

  // Navigate to prev/next week landing on a specific day index (wrap nav).
  function gotoWeek(dir: 'prev' | 'next', landDay: number) {
    const link = document.querySelector<HTMLAnchorElement>(`[data-nav="${dir}"]`);
    if (!link) return; // no such week (edge of range)
    const url = new URL(link.href, window.location.origin);
    url.searchParams.set('day', String(landDay));
    window.location.href = url.pathname + url.search;
  }

  // Select cell on mount: ?day=N wins (week wrap-nav), else today, else first.
  useEffect(() => {
    const dayParam = new URLSearchParams(window.location.search).get('day');
    if (dayParam != null) {
      const di = parseInt(dayParam);
      if (di >= 0 && di < cells.length) { setSelected(di); return; }
    }
    const idx = cells.findIndex(c => c.date === today);
    setSelected(idx >= 0 ? idx : 0);
  }, []);

  // keyboard: h/l (or j/k) select day, o/enter open, esc closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') { setModalSession(null); return; }
      if (modalSession) return;
      if (e.key === 'h' || e.key === 'H' || e.key === 'k') {
        e.preventDefault();
        if (selected === 0) { gotoWeek('prev', 6); return; }
        setSelected(p => Math.max(0, p - 1));
      } else if (e.key === 'l' || e.key === 'L' || e.key === 'j') {
        e.preventDefault();
        if (selected === cells.length - 1) { gotoWeek('next', 0); return; }
        setSelected(p => Math.min(cells.length - 1, p + 1));
      } else if (e.key === 'o' || e.key === 'Enter') {
        e.preventDefault();
        openCell(cells[selected]);
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        const idx = cells.findIndex(c => c.date === today);
        if (idx >= 0) {
          setSelected(idx);
          document.querySelector('[data-today="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // heute liegt in anderer Woche -> ISO-Woche berechnen, navigieren
          const d = new Date();
          d.setHours(0, 0, 0, 0);
          const thu = new Date(d);
          thu.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
          const yearStart = new Date(thu.getFullYear(), 0, 1);
          const wk = Math.ceil(((thu.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
          window.location.href = `/?week=${wk}&year=${thu.getFullYear()}`;
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected, modalSession, cells.length]);

  return (
    <>
      {/* Weekly totals bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Distanz" value={`${totals.km} km`} spark={<Sparkline values={kmSeries} />} />
        <Stat label="Vertical" value={`${totals.vert} hm`} spark={<Sparkline values={vertSeries} />} />
        <Stat label="Zeit" value={`${Math.floor(totals.min / 60)}h ${totals.min % 60}m`} spark={<Sparkline values={minSeries} />} />
        <Stat label="Sessions · ø HF" value={`${totals.sessions} · ${totals.avgHr ?? '–'}`} />
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
        {cells.map((c, i) => {
          const isToday = c.date === today;
          const isPast = c.date < today;
          const hasActual = !!c.actual;
          const isRest = c.session?.type === 'rest';
          const missed = isPast && c.session && !isRest && !hasActual && !c.feedback;
          const isSelected = i === selected;

          let borderCls = 'border-slate-700';
          if (isToday) borderCls = 'border-sky-500';
          else if (hasActual) borderCls = 'border-emerald-600';
          else if (missed) borderCls = 'border-red-600/70';

          const clickable = !!c.session && (!isRest || c.feedback || hasActual);

          return (
            <div
              key={c.date}
              data-today={isToday ? 'true' : undefined}
              onClick={() => { setSelected(i); openCell(c); }}
              className={`border ${borderCls} rounded-lg p-2 min-h-[112px] flex flex-col
                ${isToday ? 'bg-sky-950/30' : hasActual ? 'bg-emerald-950/20' : 'bg-slate-800/40'}
                ${clickable ? 'cursor-pointer hover:bg-slate-700/40' : ''}
                ${isSelected ? 'ring-2 ring-emerald-400/70' : ''} transition-colors`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-mono ${isToday ? 'text-sky-400 font-bold' : 'text-slate-500'}`}>
                  {c.weekday} {c.date.slice(8)}
                </span>
                {c.feedback?.rating && (
                  <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1 rounded">{c.feedback.rating}</span>
                )}
              </div>

              {/* Plan title */}
              {c.session ? (
                <div className="flex items-start gap-1 mb-1">
                  <span className="text-sm leading-none">{sessionIcon(c.session.title, c.session.type)}</span>
                  <span className="text-xs text-slate-300 leading-tight line-clamp-2">{c.session.title}</span>
                </div>
              ) : (
                <div className="text-xs text-slate-600 mb-1">—</div>
              )}

              {/* Actual metrics from DB (past) */}
              {hasActual ? (
                <div className="mt-auto text-[11px] font-mono text-slate-300 space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-emerald-400">{c.actual!.km} km</span>
                    <span>{fmtPace(c.actual!.pace)}/km</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>❤ {c.actual!.avgHr ?? '–'}</span>
                    <span>{c.actual!.vert ? `↗${c.actual!.vert}m` : ''}</span>
                  </div>
                </div>
              ) : (
                <div className="mt-auto text-[11px] text-slate-500">
                  {c.session && c.session.duration && c.session.duration !== '-' && !isRest && (
                    <span>{isPast ? '—' : `Plan ${c.session.duration}`}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recovery strip */}
      <div className="border border-slate-700 rounded-lg overflow-hidden mb-4">
        <div className="grid grid-cols-[64px_repeat(7,1fr)] text-[11px]">
          <div className="bg-slate-800/60 px-2 py-1 text-slate-500 font-semibold">Recovery</div>
          {cells.map(c => (
            <div key={c.date} className="bg-slate-800/60 px-1 py-1 text-center text-slate-500">{c.weekday}</div>
          ))}
          <RecoveryRow label="Schlaf" cells={cells} render={m => fmtSleep(m?.sleepMin ?? null)} />
          <RecoveryRow label="HRV" cells={cells} render={m => m?.hrvNight != null ? String(Math.round(m.hrvNight)) : '–'} />
          <RecoveryRow label="RHF" cells={cells} render={m => m?.restingHr != null ? String(m.restingHr) : '–'} />
        </div>
      </div>

      {modalSession && (
        <FeedbackModal
          session={modalSession.session}
          feedback={modalSession.feedback}
          onClose={() => setModalSession(null)}
        />
      )}
    </>
  );
}

function Stat({ label, value, spark }: { label: string; value: string; spark?: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold text-white">{value}</span>
        {spark}
      </div>
    </div>
  );
}

function RecoveryRow({ label, cells, render }: { label: string; cells: DayCell[]; render: (m: DayMetric | null) => string }) {
  return (
    <>
      <div className="px-2 py-1 text-slate-400 border-t border-slate-800">{label}</div>
      {cells.map(c => (
        <div key={c.date} className="px-1 py-1 text-center font-mono text-slate-300 border-t border-slate-800">
          {render(c.metric)}
        </div>
      ))}
    </>
  );
}

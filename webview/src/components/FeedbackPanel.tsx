import { useEffect, useRef, useState } from 'react';
import type { Session, FeedbackSession } from '../lib/parseTraining';
import type { ActivityDetail, ZoneBucket, Lap } from '../lib/db';
import WorkoutPlanView from './WorkoutPlanView';

interface Props {
  session: Session;
  feedback?: FeedbackSession;
  onClose: () => void;
}

const ZONE_COLORS: Record<string, string> = {
  Z0: 'bg-slate-500',
  Z1: 'bg-sky-500',
  Z2: 'bg-emerald-500',
  Z3: 'bg-yellow-500',
  Z4: 'bg-orange-500',
  Z5: 'bg-red-500',
};
const ZONE_LABEL: Record<string, string> = {
  Z0: 'Erholung', Z1: 'Extensiv', Z2: 'Intensiv', Z3: 'Schwelle', Z4: 'VO₂max', Z5: 'HFMax',
};

function fmtPace(p: number | null): string {
  if (p == null || !isFinite(p)) return '–';
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
function fmtDur(min: number | null): string {
  if (min == null) return '–';
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}h` : `${m}min`;
}
function fmtSecs(s: number | null): string {
  if (s == null) return '–';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function FeedbackModal({ session, feedback, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    if (session.type === 'rest') return;
    setLoading(true);
    fetch(`/api/activity?date=${session.date}`)
      .then(r => r.json())
      .then((d: ActivityDetail | null) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
  }, [session.date]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'j') { e.preventDefault(); scrollRef.current?.scrollBy({ top: 120, behavior: 'smooth' }); }
      if (e.key === 'k') { e.preventDefault(); scrollRef.current?.scrollBy({ top: -120, behavior: 'smooth' }); }
      if (e.key === 'd' && e.ctrlKey) { e.preventDefault(); const h = scrollRef.current?.clientHeight ?? 600; scrollRef.current?.scrollBy({ top: h / 2, behavior: 'smooth' }); }
      if (e.key === 'u' && e.ctrlKey) { e.preventDefault(); const h = scrollRef.current?.clientHeight ?? 600; scrollRef.current?.scrollBy({ top: -(h / 2), behavior: 'smooth' }); }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-[90vw] max-w-[1200px] max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-lg">{session.title}</h3>
            {feedback?.rating && (
              <span className="text-sm bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded font-semibold">
                {feedback.rating}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">{session.date}</span>
            <kbd className="text-xs bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">ESC</kbd>
            <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="px-6 py-5 overflow-y-auto flex-1">
          {/* Geplant — immer oben */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">Geplant</h4>
            <WorkoutPlanView rawContent={session.rawContent} title={session.title} />
          </div>

          {/* IST — actual from DB (only if data) */}
          {loading && <p className="text-sm text-slate-500 mt-6 border-t border-slate-700 pt-5">Lade Aktivitätsdaten…</p>}
          {detail && (
            <div className="mt-6 border-t border-slate-700 pt-5">
              <ActualBlock detail={detail} />
            </div>
          )}

          {/* Fazit */}
          {(feedback?.summary || feedback?.rating) && (
            <div className="border-t border-slate-700 pt-5 mt-6">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-xs uppercase tracking-wider text-slate-500">Fazit</h4>
                {feedback.rating && (
                  <span className="text-xs bg-emerald-900/50 text-emerald-300 px-2 py-0.5 rounded font-semibold">{feedback.rating}</span>
                )}
              </div>
              {feedback.summary && <p className="text-sm text-slate-300 leading-relaxed">{feedback.summary}</p>}

              {/* Ganzes Feedback aufklappen */}
              {feedback.content && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowFull(v => !v)}
                    className="text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded px-3 py-1.5 transition-colors"
                  >
                    {showFull ? '– Ganzes Feedback ausblenden' : '+ Ganzes Feedback anzeigen'}
                  </button>
                  {showFull && (
                    <div className="prose prose-invert prose-sm max-w-none mt-4 pt-4 border-t border-slate-800">
                      <div className="markdown-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(feedback.content) }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActualBlock({ detail }: { detail: ActivityDetail }) {
  const totalZ = detail.zones.reduce((a, z) => a + z.secs, 0);
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h4 className="text-xs uppercase tracking-wider text-emerald-400">Tatsächlich</h4>
        <span className="text-xs text-slate-600">{detail.start}</span>
        <span className="text-xs text-slate-600 font-mono">#{detail.id}</span>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-4">
        <Tile label="Distanz" value={detail.km != null ? `${detail.km}` : '–'} unit="km" big />
        <Tile label="Zeit" value={fmtDur(detail.movingMin)} />
        <Tile label="Pace" value={fmtPace(detail.pace)} unit="/km" />
        <Tile label="ø HF" value={detail.avgHr != null ? `${detail.avgHr}` : '–'} unit="bpm" hr />
        <Tile label="max HF" value={detail.maxHr != null ? `${detail.maxHr}` : '–'} unit="bpm" hr />
        <Tile label="Vertical" value={detail.vert != null ? `${detail.vert}` : '–'} unit="hm" />
        <Tile label="ø Power" value={detail.avgPower != null ? `${detail.avgPower}` : '–'} unit="W" />
      </div>

      {/* Moving vs paused */}
      {detail.pausedSec != null && detail.pausedSec > 0 && (
        <div className="text-[11px] text-slate-400 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>⏱️ Gesamt (elapsed) <span className="font-mono text-slate-300">{fmtDur(detail.elapsedMin)}</span></span>
          <span>· Pause <span className="font-mono text-amber-400">{fmtSecs(detail.pausedSec)}</span></span>
          {detail.pauses.length > 0 && (
            <span className="text-slate-500">
              ({detail.pauses.map((p, i) => (
                <span key={i} title={`bei ${p.atKm ?? '?'} km, ${p.startLocal}`}>
                  {i > 0 && ', '}{fmtSecs(p.durSec)}{p.atKm != null && `@${p.atKm}km`}
                </span>
              ))})
            </span>
          )}
        </div>
      )}

      {/* Time in zone */}
      {totalZ > 0 && (
        <div className="mb-4">
          <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">Zeit in Zonen</div>
          <div className="flex h-6 rounded overflow-hidden">
            {detail.zones.map(z => {
              const pct = (z.secs / totalZ) * 100;
              if (pct < 0.5) return null;
              return (
                <div key={z.zone} className={`${ZONE_COLORS[z.zone] ?? 'bg-slate-600'} flex items-center justify-center`}
                  style={{ width: `${pct}%` }} title={`${z.zone} ${ZONE_LABEL[z.zone] ?? ''} · ${fmtSecs(z.secs)} · ${pct.toFixed(0)}%`}>
                  {pct > 7 && <span className="text-[10px] font-bold text-black/70">{z.zone}</span>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-[11px] text-slate-400">
            {detail.zones.map(z => (
              <span key={z.zone} className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-sm ${ZONE_COLORS[z.zone] ?? 'bg-slate-600'}`} />
                {z.zone} {((z.secs / totalZ) * 100).toFixed(0)}% · {fmtSecs(z.secs)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Laps / splits — nur wenn Laps die ganze Aktivität abdecken */}
      {detail.laps.length >= 1 && detail.lapsCoverFull && <LapTable laps={detail.laps} />}
      {detail.laps.length >= 1 && !detail.lapsCoverFull && (
        <p className="text-[11px] text-slate-600 mt-1">Splits ausgeblendet — Lap-Daten decken nur einen Teil der Aktivität ab (unvollständige .fit-Runden).</p>
      )}
    </div>
  );
}

function LapTable({ laps }: { laps: Lap[] }) {
  const maxPace = Math.max(...laps.filter(l => l.pace != null && isFinite(l.pace!)).map(l => l.pace!), 1);
  const minPace = Math.min(...laps.filter(l => l.pace != null && isFinite(l.pace!)).map(l => l.pace!), maxPace);
  const range = maxPace - minPace || 1;
  return (
    <details className="mt-1" open>
      <summary className="text-[11px] uppercase tracking-wide text-slate-500 cursor-pointer hover:text-slate-300 select-none">
        Splits ({laps.length}){laps.some(l => l.synthetic) && <span className="ml-2 text-amber-500/80 normal-case">* rekonstruiert aus Records</span>}
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-slate-500 text-left">
              <th className="px-2 py-1 font-normal">#</th>
              <th className="px-2 py-1 font-normal">km</th>
              <th className="px-2 py-1 font-normal">Zeit</th>
              <th className="px-2 py-1 font-normal">Pace</th>
              <th className="px-2 py-1 font-normal w-1/3">​</th>
              <th className="px-2 py-1 font-normal">HF</th>
              <th className="px-2 py-1 font-normal">W</th>
            </tr>
          </thead>
          <tbody>
            {laps.map(l => {
              const frac = l.pace != null && isFinite(l.pace) ? 1 - (l.pace - minPace) / range : 0;
              return (
                <tr key={l.index} className="border-t border-slate-800 text-slate-300">
                  <td className="px-2 py-1 text-slate-500">{l.index + 1}{l.synthetic && <span className="text-amber-500" title="aus Records rekonstruiert (fehlende .fit-Runde)">*</span>}</td>
                  <td className="px-2 py-1">{l.km ?? '–'}</td>
                  <td className="px-2 py-1">{fmtSecs(l.secs)}</td>
                  <td className="px-2 py-1 text-emerald-400">{fmtPace(l.pace)}</td>
                  <td className="px-2 py-1">
                    <div className="h-1.5 rounded bg-emerald-500/70" style={{ width: `${Math.max(4, frac * 100)}%` }} />
                  </td>
                  <td className="px-2 py-1 text-slate-400">{l.avgHr ?? '–'}</td>
                  <td className="px-2 py-1 text-slate-500">{l.power ?? '–'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Tile({ label, value, unit, big, hr }: { label: string; value: string; unit?: string; big?: boolean; hr?: boolean }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`font-bold ${hr ? 'text-rose-300' : big ? 'text-emerald-400' : 'text-white'} ${big ? 'text-xl' : 'text-base'} leading-tight`}>
        {value}{unit && <span className="text-[11px] font-normal text-slate-500 ml-0.5">{unit}</span>}
      </div>
    </div>
  );
}

function renderMarkdown(text: string): string {
  let html = text
    .replace(/^### (.+)$/gm, '<h3 class="text-emerald-400 font-bold mt-4 mb-2">$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4 class="text-slate-300 font-semibold mt-3 mb-1">$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-slate-800 px-1 rounded text-emerald-300 text-xs">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-slate-300">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 text-slate-300">$1. $2</li>')
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim());
      if (cells.every(c => c.trim().match(/^[-:]+$/))) return '';
      const row = cells.map(c => `<td class="px-2 py-1 border border-slate-700">${c.trim()}</td>`).join('');
      return `<tr>${row}</tr>`;
    })
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/\n/g, '<br/>');

  html = `<p class="mb-2">${html}</p>`;
  html = html.replace(/(<tr>.*?<\/tr>(?:\s*<br\/>)*)+/g, '<table class="w-full text-xs border-collapse my-2">$&</table>');
  return html;
}

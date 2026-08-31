import React, { useEffect, useRef, useState } from 'react';

const INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

type SyncResult = {
  ok: boolean;
  changed?: boolean;
  reload?: boolean;
  skipped?: boolean;
  imported?: string[];
  error?: string;
};

export default function AutoSync() {
  const [state, setState] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [note, setNote] = useState<string>('');
  const busy = useRef(false);

  async function sync() {
    if (busy.current || document.hidden) return;
    busy.current = true;
    setState('syncing');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data: SyncResult = await res.json();
      if (!data.ok) {
        setState('error');
        setNote(data.error ?? 'sync failed');
      } else if (data.changed) {
        setState('ok');
        setNote((data.imported ?? []).join(' · ') || 'updated');
        if (data.reload) {
          // Give DuckDB import a beat, then refresh UI so new data shows.
          setTimeout(() => window.location.reload(), 600);
        }
      } else {
        setState('ok');
        setNote(data.skipped ? 'no key' : 'up to date');
      }
    } catch (err: any) {
      setState('error');
      setNote(err?.message ?? 'network error');
    } finally {
      busy.current = false;
    }
  }

  useEffect(() => {
    sync(); // initial sync on load
    const id = setInterval(sync, INTERVAL_MS);
    // Sync when tab regains focus after being hidden
    const onVis = () => { if (!document.hidden) sync(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const color =
    state === 'syncing' ? 'text-sky-400'
    : state === 'error' ? 'text-red-400'
    : state === 'ok' ? 'text-slate-500'
    : 'text-slate-600';

  const dot =
    state === 'syncing' ? 'bg-sky-400 animate-pulse'
    : state === 'error' ? 'bg-red-400'
    : 'bg-emerald-500';

  return (
    <span className={`flex items-center gap-1.5 text-[11px] ${color}`} title={`Auto-Sync alle 3min${note ? ` — ${note}` : ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="hidden sm:inline">{state === 'syncing' ? 'sync…' : 'auto'}</span>
    </span>
  );
}

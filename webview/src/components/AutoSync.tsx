import React, { useEffect, useRef, useState } from 'react';

const INTERVAL_MS = 3 * 60 * 1000; // 3 minutes

type SyncResult = {
  ok: boolean;
  changed?: boolean;
  reload?: boolean;
  skipped?: boolean;
  imported?: string[];
  error?: string;
  pushed?: number;
};

const FOCUS_DEBOUNCE_MS = 30 * 1000;

export default function AutoSync() {
  const [state, setState] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle');
  const [note, setNote] = useState<string>('');
  const busy = useRef(false);
  const lastRun = useRef(0);

  async function sync() {
    if (busy.current || document.hidden) return;
    busy.current = true;
    lastRun.current = Date.now();
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
        setNote(data.skipped ? 'offline' : data.pushed ? `pushed ${data.pushed}` : 'up to date');
      }
    } catch (err) {
      setState('error');
      setNote(err instanceof Error ? err.message : 'network error');
    } finally {
      busy.current = false;
    }
  }

  useEffect(() => {
    // Mount kicks off a sync with the git remote (external system); the
    // 'syncing' state it sets is intended.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    sync(); // initial sync on load
    const id = setInterval(sync, INTERVAL_MS);
    // Pull + push when the app gets focus again (tab visible or window focus).
    const onFocus = () => {
      if (!document.hidden && Date.now() - lastRun.current > FOCUS_DEBOUNCE_MS) sync();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
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
    <span className={`flex items-center gap-1.5 text-[11px] ${color}`} title={`Auto pull/push alle 3min + bei Fokus${note ? ` — ${note}` : ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      <span className="hidden sm:inline">{state === 'syncing' ? 'sync…' : 'auto'}</span>
    </span>
  );
}

import React, { useState, useRef, useEffect } from 'react';

type PullState = 'idle' | 'pin-entry' | 'pulling' | 'success' | 'error';

export default function PullButton() {
  const [state, setState] = useState<PullState>('idle');
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === 'pin-entry' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state]);

  // Shift+P (lowercase 'p') global shortcut to start pull
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'p' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        setState('pin-entry');
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Auto-reset success/error after 4s
  useEffect(() => {
    if (state === 'success' || state === 'error') {
      const t = setTimeout(() => {
        setState('idle');
        setMessage('');
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [state]);

  async function handlePull() {
    if (!pin) return;
    setState('pulling');
    setMessage('Touch YubiKey...');

    try {
      const res = await fetch('/api/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (data.success) {
        setState('success');
        setMessage(data.message?.slice(0, 40) || 'Pulled ✓');
      } else {
        setState('error');
        setMessage(data.error || 'Pull failed');
      }
    } catch (err: any) {
      setState('error');
      setMessage(err.message || 'Network error');
    }
    setPin('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePull();
    }
    if (e.key === 'Escape') {
      setState('idle');
      setPin('');
    }
  }

  if (state === 'idle') {
    return (
      <button
        onClick={() => setState('pin-entry')}
        className="px-3 py-1.5 text-xs font-medium rounded bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 transition-colors"
        title="Git Pull (YubiKey)"
      >
        ⬇️ Pull
      </button>
    );
  }

  if (state === 'pin-entry') {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="YubiKey PIN"
          className="w-28 px-2 py-1 text-xs rounded bg-slate-800 border border-slate-600 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
        />
        <button
          onClick={handlePull}
          disabled={!pin}
          className="px-2 py-1 text-xs rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          ⬇️
        </button>
        <button
          onClick={() => { setState('idle'); setPin(''); }}
          className="px-2 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-400"
        >
          ✕
        </button>
      </div>
    );
  }

  if (state === 'pulling') {
    return (
      <span className="text-xs text-yellow-400 animate-pulse">{message}</span>
    );
  }

  if (state === 'success') {
    return (
      <span className="text-xs text-sky-400">{message}</span>
    );
  }

  // error
  return (
    <span className="text-xs text-red-400" title={message}>
      ❌ {message.slice(0, 40)}
    </span>
  );
}

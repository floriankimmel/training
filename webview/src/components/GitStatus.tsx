import { useState, useEffect } from 'react';

interface GitStatus {
  ahead: number;
  behind: number;
  dirty: boolean;
}

export default function GitStatus() {
  const [status, setStatus] = useState<GitStatus | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/git-status');
      if (res.ok) setStatus(await res.json());
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60_000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;
  if (!status.ahead && !status.behind && !status.dirty) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      {status.ahead > 0 && (
        <span className="px-2 py-0.5 rounded bg-yellow-900/50 border border-yellow-700 text-yellow-300" title={`${status.ahead} unpushed commit${status.ahead > 1 ? 's' : ''}`}>
          ↑{status.ahead}
        </span>
      )}
      {status.behind > 0 && (
        <span className="px-2 py-0.5 rounded bg-blue-900/50 border border-blue-700 text-blue-300" title={`${status.behind} commit${status.behind > 1 ? 's' : ''} behind remote`}>
          ↓{status.behind}
        </span>
      )}
      {status.dirty && (
        <span className="w-2 h-2 rounded-full bg-orange-400" title="Uncommitted changes" />
      )}
    </div>
  );
}

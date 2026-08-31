import type { APIRoute } from 'astro';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CWD = '/Users/fkimmel/Documents/workspace/training';
const PY = join(CWD, 'db/.venv/bin/python');
const HEALTHFIT = join(
  homedir(),
  'Library/Mobile Documents/iCloud~com~altifondo~HealthFit/Documents',
);

type Result = { code: number; stdout: string; stderr: string };

function run(cmd: string, args: string[], cwd = CWD): Promise<Result> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: {
        ...process.env,
        PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin`,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c: Buffer) => { stdout += c.toString(); });
    child.stderr.on('data', (c: Buffer) => { stderr += c.toString(); });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
    child.on('error', (err) => resolve({ code: 1, stdout, stderr: err.message }));
    child.stdin.end();
  });
}

const git = (args: string[]) => run('git', args);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// HealthFit .fit files for the last `days` calendar days (for feedback-triggered imports).
function recentFitFiles(days: number): string[] {
  if (!existsSync(HEALTHFIT)) return [];
  const wanted = new Set<string>();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    wanted.add(d.toISOString().slice(0, 10));
  }
  return readdirSync(HEALTHFIT)
    .filter((f) => f.endsWith('.fit') && wanted.has(f.slice(0, 10)))
    .map((f) => join(HEALTHFIT, f));
}

export const POST: APIRoute = async () => {
  const steps: string[] = [];

  // 0. Old HEAD
  const oldHead = (await git(['rev-parse', 'HEAD'])).stdout.trim();

  // 1. Uncommitted changes → stash (include untracked)
  const status = await git(['status', '--porcelain']);
  const dirty = status.stdout.trim().length > 0;
  let stashed = false;
  if (dirty) {
    const stash = await git(['stash', 'push', '--include-untracked', '-m', `autosync-${Date.now()}`]);
    if (stash.code !== 0) {
      return json({ ok: false, changed: false, error: `stash failed: ${stash.stderr.trim()}` }, 500);
    }
    stashed = true;
    steps.push('stashed local changes');
  }

  // 2. Fetch + pull (ff-only, fall back to rebase). SSH auth is ambient (YubiKey/agent).
  const fetch = await git(['fetch', 'origin']);
  if (fetch.code !== 0) {
    if (stashed) await git(['stash', 'pop']);
    // Not fatal: likely YubiKey absent. Report as skipped, not error.
    return json({ ok: true, changed: false, skipped: true, reason: 'fetch failed (auth?)', detail: fetch.stderr.trim() });
  }

  let pull = await git(['pull', '--ff-only']);
  if (pull.code !== 0) {
    // Diverged → try rebase
    const rebase = await git(['rebase', 'origin/main']);
    if (rebase.code !== 0) {
      await git(['rebase', '--abort']);
      if (stashed) await git(['stash', 'pop']);
      return json({ ok: false, changed: false, error: `pull/rebase failed: ${(pull.stderr || rebase.stderr).trim()}` }, 500);
    }
    pull = rebase;
    steps.push('rebased onto origin/main');
  }

  // 3. Restore stash
  if (stashed) {
    const pop = await git(['stash', 'pop']);
    if (pop.code !== 0) {
      return json({ ok: false, changed: false, error: `stash pop conflict — resolve manually (git stash list): ${pop.stderr.trim()}` }, 500);
    }
    steps.push('restored local changes');
  }

  // 4. What changed between old and new HEAD?
  const newHead = (await git(['rev-parse', 'HEAD'])).stdout.trim();
  if (newHead === oldHead) {
    return json({ ok: true, changed: false, steps });
  }

  const diff = await git(['diff', '--name-only', `${oldHead}..${newHead}`]);
  const files = diff.stdout.split('\n').map((f) => f.trim()).filter(Boolean);
  const metricsChanged = files.some((f) => f.startsWith('metrics/') && f.endsWith('.md'));
  const feedbackChanged = files.some((f) => f.startsWith('feedback/') && f.endsWith('.md'));

  const imported: string[] = [];

  // 5a. Metrics commit → import metrics into DuckDB
  if (metricsChanged) {
    const r = await run(PY, [join(CWD, 'db/import_metrics.py')]);
    imported.push(`metrics: ${r.code === 0 ? 'ok' : 'FAIL ' + r.stderr.trim()}`);
  }

  // 5b. Feedback commit → import recent HealthFit activities into DuckDB
  if (feedbackChanged) {
    const fits = recentFitFiles(14);
    if (fits.length > 0) {
      const r = await run(PY, [join(CWD, 'db/import_all.py'), ...fits, '--no-metrics']);
      imported.push(`activities: ${r.code === 0 ? 'ok' : 'FAIL ' + r.stderr.trim()}`);
    } else {
      imported.push('activities: no recent .fit files');
    }
  }

  return json({
    ok: true,
    changed: true,
    reload: metricsChanged || feedbackChanged || files.some((f) => f.startsWith('trainings/')),
    files,
    imported,
    steps,
  });
};

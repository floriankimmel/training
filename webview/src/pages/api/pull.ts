import type { APIRoute } from 'astro';
import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CWD = '/Users/fkimmel/Documents/workspace/training';

type GitResult = { code: number; stdout: string; stderr: string };

function runGit(args: string[], env: Record<string, string | undefined>): Promise<GitResult> {
  return new Promise((resolve) => {
    const child = spawn('git', args, {
      cwd: CWD,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c: Buffer) => { stdout += c.toString(); });
    child.stderr.on('data', (c: Buffer) => { stderr += c.toString(); });
    child.on('close', (code: number | null) => resolve({ code: code ?? 1, stdout, stderr }));
    child.on('error', (err: Error) => resolve({ code: 1, stdout, stderr: err.message }));
    child.stdin.end();
  });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const { pin } = await request.json();

  if (!pin) {
    return json({ success: false, error: 'PIN required' }, 400);
  }

  // Create temporary SSH_ASKPASS script that provides the PIN
  const askpassPath = join(tmpdir(), `askpass-${Date.now()}.sh`);
  writeFileSync(askpassPath, `#!/bin/sh\necho '${pin.replace(/'/g, "'\\''")}'`);
  chmodSync(askpassPath, 0o700);

  const env: Record<string, string | undefined> = {
    ...process.env,
    SSH_ASKPASS: askpassPath,
    SSH_ASKPASS_REQUIRE: 'force',
    DISPLAY: ':0',
    PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin`,
  };

  try {
    // 1. Detect uncommitted changes (tracked + untracked)
    const status = await runGit(['status', '--porcelain'], env);
    const dirty = status.stdout.trim().length > 0;

    // 2. Stash if dirty (include untracked)
    let stashed = false;
    if (dirty) {
      const stashLabel = `webview-pull-${Date.now()}`;
      const stash = await runGit(
        ['stash', 'push', '--include-untracked', '-m', stashLabel],
        env,
      );
      if (stash.code !== 0) {
        return json({
          success: false,
          error: `Stash failed: ${stash.stderr.trim() || stash.stdout.trim()}`,
        }, 500);
      }
      stashed = true;
    }

    // 3. Pull
    const pull = await runGit(['pull', '--ff-only'], env);

    if (pull.code !== 0) {
      // Restore stash before bailing out so nothing is lost
      if (stashed) {
        await runGit(['stash', 'pop'], env);
      }
      return json({
        success: false,
        error: pull.stderr.trim() || pull.stdout.trim() || `Pull exit ${pull.code}`,
      }, 500);
    }

    // 4. Restore stashed changes
    if (stashed) {
      const pop = await runGit(['stash', 'pop'], env);
      if (pop.code !== 0) {
        // Conflict on pop: changes remain safe in stash list
        return json({
          success: false,
          error: `Pulled, but restoring local changes conflicted. Resolve manually (git stash list). ${pop.stderr.trim()}`,
        }, 500);
      }
    }

    const parts = [pull.stdout.trim() || 'Pull successful'];
    if (stashed) parts.push('(local changes preserved)');
    return json({ success: true, message: parts.join(' ') });
  } finally {
    try { unlinkSync(askpassPath); } catch {}
  }
};

import type { APIRoute } from 'astro';
import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const POST: APIRoute = async ({ request }) => {
  const { pin } = await request.json();

  if (!pin) {
    return new Response(JSON.stringify({ success: false, error: 'PIN required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const CWD = '/Users/fkimmel/Documents/workspace/training';

  // Create temporary SSH_ASKPASS script that provides the PIN
  const askpassPath = join(tmpdir(), `askpass-${Date.now()}.sh`);
  writeFileSync(askpassPath, `#!/bin/sh\necho '${pin.replace(/'/g, "'\\''")}'`);
  chmodSync(askpassPath, 0o700);

  return new Promise<Response>((resolve) => {
    const child = spawn('git', ['pull', '--ff-only'], {
      cwd: CWD,
      env: {
        ...process.env,
        SSH_ASKPASS: askpassPath,
        SSH_ASKPASS_REQUIRE: 'force',
        DISPLAY: ':0',
        PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin`,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on('close', (code) => {
      try { unlinkSync(askpassPath); } catch {}

      if (code === 0) {
        resolve(new Response(JSON.stringify({
          success: true,
          message: stdout.trim() || stderr.trim() || 'Pull successful',
        }), {
          headers: { 'Content-Type': 'application/json' },
        }));
      } else {
        resolve(new Response(JSON.stringify({
          success: false,
          error: stderr.trim() || stdout.trim() || `Exit code ${code}`,
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }));
      }
    });

    child.on('error', (err) => {
      try { unlinkSync(askpassPath); } catch {}
      resolve(new Response(JSON.stringify({
        success: false,
        error: err.message,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }));
    });

    child.stdin.end();
  });
};

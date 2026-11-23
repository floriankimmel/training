import type { APIRoute } from 'astro';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { REPO_ROOT } from '../../lib/repo';

export const POST: APIRoute = async ({ request }) => {
  const { message, history } = await request.json();

  // Build conversation context from history
  let contextPrompt = '';
  if (history && history.length > 0) {
    contextPrompt = history.map((m: { role: string; content: string }) =>
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n\n') + '\n\nUser: ' + message;
  } else {
    contextPrompt = message;
  }

  // Use streaming response
  const stream = new ReadableStream({
    start(controller) {
      const args = ['--print', '--model', 'github-copilot/claude-opus-4.6', contextPrompt];
      const localBin = path.join(os.homedir(), '.local', 'bin');
      const piPath = path.join(localBin, 'pi');
      const child = spawn(piPath, args, {
        cwd: REPO_ROOT,
        env: { ...process.env, NO_COLOR: '1', CI: '1', PATH: `${process.env.PATH}:${localBin}:/usr/local/bin` },
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 180000,
      });
      child.stdin.end();

      child.stdout.on('data', (chunk: Buffer) => {
        controller.enqueue(new TextEncoder().encode(chunk.toString()));
      });

      child.stderr.on('data', (chunk: Buffer) => {
        controller.enqueue(new TextEncoder().encode(chunk.toString()));
      });

      child.on('close', () => {
        controller.close();
      });

      child.on('error', (err) => {
        controller.enqueue(new TextEncoder().encode(`\n\n❌ Error: ${err.message}`));
        controller.close();
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
};

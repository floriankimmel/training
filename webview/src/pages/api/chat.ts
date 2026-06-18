import type { APIRoute } from 'astro';
import { spawn } from 'node:child_process';

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
      const piPath = '/Users/fkimmel/.local/bin/pi';
      const child = spawn(piPath, args, {
        cwd: '/Users/fkimmel/Documents/workspace/training',
        env: { ...process.env, NO_COLOR: '1', CI: '1', PATH: `${process.env.PATH}:/Users/fkimmel/.local/bin:/usr/local/bin` },
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

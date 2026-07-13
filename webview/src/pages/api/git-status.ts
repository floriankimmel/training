import type { APIRoute } from 'astro';
import { execSync } from 'node:child_process';

const CWD = '/Users/fkimmel/Documents/workspace/training';

export const GET: APIRoute = async () => {
  try {
    const ahead = execSync('git rev-list --count @{u}..HEAD 2>/dev/null || echo 0', {
      cwd: CWD, encoding: 'utf-8',
    }).trim();

    const behind = execSync('git rev-list --count HEAD..@{u} 2>/dev/null || echo 0', {
      cwd: CWD, encoding: 'utf-8',
    }).trim();

    const dirty = execSync('git status --porcelain', {
      cwd: CWD, encoding: 'utf-8',
    }).trim();

    return new Response(JSON.stringify({
      ahead: parseInt(ahead) || 0,
      behind: parseInt(behind) || 0,
      dirty: dirty.length > 0,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      ahead: 0,
      behind: 0,
      dirty: false,
      error: err.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

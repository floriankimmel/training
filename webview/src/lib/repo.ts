import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Training repo root = nearest ancestor holding zones.md (the repo's single zone source).
// Works from src/, dist/ and any checkout or worktree; falls back to webview/.. via cwd.
function findRepoRoot(): string {
  let dir = import.meta.dirname;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'zones.md'))) return dir;
    dir = path.dirname(dir);
  }
  return path.resolve(process.cwd(), '..');
}

export const REPO_ROOT = findRepoRoot();

export function repoPath(...parts: string[]): string {
  return path.join(REPO_ROOT, ...parts);
}

// Commits ahead/behind upstream and whether the working tree has changes. Zeros when no upstream.
export function gitSyncState(): { ahead: number; behind: number; dirty: boolean } {
  const run = (cmd: string) => execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf-8' }).trim();
  return {
    ahead: parseInt(run('git rev-list --count @{u}..HEAD 2>/dev/null || echo 0')) || 0,
    behind: parseInt(run('git rev-list --count HEAD..@{u} 2>/dev/null || echo 0')) || 0,
    dirty: run('git status --porcelain').length > 0,
  };
}

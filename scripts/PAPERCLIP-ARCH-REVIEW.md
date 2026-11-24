# Weekly codebase review (Paperclip)

Paperclip routine **Weekly Codebase Review (Mon 10:00)**: cron `0 10 * * 1`, Europe/Vienna, agent Running Coach.
It runs two skills on its own, opens one PR per skill against `main`, grades each PR with
`grade-my-pr`, and auto-merges when the door is two-way and blast radius is below 8.
It writes an Obsidian inbox note only when a PR was opened or the run failed. A run with no changes stays silent.

Source of truth for the prompt is this file. After you edit it, update the routine:
`paperclipai routine update b77a6f67-cd67-436e-a392-79e6158e447f --payload-json '{"description": ...}'`.

## Prompt

```
Weekly codebase review of /Users/fkimmel/Documents/workspace/training. Fully autonomous: never ask the user anything. Every decision a skill would hand to the user is yours: take the conservative option and write down the choice for the report. DATE = today's date (YYYY-MM-DD). REPO = /Users/fkimmel/Documents/workspace/training.

Hard rules:
- Never edit, checkout, reset or stash in REPO itself. The user and other routines use it. Work only in throwaway worktrees.
- PR base is always `main`. Never push to main or master directly. Never force-push. Never merge anything except the PRs this run created.
- Scope is code and tooling (training/, scripts/, tests/, webview/, GLOSSARY.md, docs/adr/). Never change weekly plans, feedback, metrics, STATUS*, races, injuries, calendar, zones values, or Apple Reminders.
- No behavior change in architecture refactors. Keep the diff small: one focused change per PR.

0. Setup
   cd REPO && git fetch origin
   git worktree add -B arch/DATE "$TMPDIR/training-arch-DATE" origin/main
   git worktree add -B domain/DATE "$TMPDIR/training-domain-DATE" origin/main
   In each worktree: ln -s REPO/db/.venv db/.venv (db/ is git-ignored). If a test needs db/training.duckdb, copy it in; never write to REPO/db.

1. Architecture pass (worktree arch/DATE): run /mattpocock-skills:improve-codebase-architecture. From its candidates pick at most ONE: the best value-to-risk deepening. Implement it. No worthwhile candidate = no change, skip to step 3.

2. Domain-model pass (worktree domain/DATE): run /mattpocock-skills:domain-modeling. Reconcile GLOSSARY.md and docs/adr/ with the terms the code and docs really use: fix drift, add missing terms, sharpen ambiguous ones, record an ADR only for a decision already visible in the code. Do not rename athlete-facing training terms. Nothing to fix = no change.

3. Verify each worktree that has changes:
   bash scripts/lint.sh
   db/.venv/bin/python -m pytest -q tests
   If webview/ changed: install deps with its lockfile's package manager, then run the build.
   On failure: fix once. Still failing: drop that branch (no PR) and record the exact error for the report.

4. For each verified branch: conventional commit, push, `gh pr create --base main` (body: what, why, how verified, decisions you made in place of the user).

5. Grade each PR: run /grade-my-pr <PR URL>. Read `door` and `blast_radius` from its JSON.

6. Merge rule per PR: door == "two-way" AND blast_radius < 8 AND checks not failing → `gh pr merge <N> --squash --delete-branch`. Otherwise leave it open and comment the grade JSON plus the reason it was not merged.

7. Cleanup: git worktree remove both worktrees (--force only for these two paths). Delete local branches that got no PR.

8. Report:
   - No PR and no failure: write nothing. Finish with "No changes".
   - Otherwise write an Obsidian inbox note (obsidian-note skill format) at
     ~/Documents/workspace/notes/00 Inbox/Weekly Codebase Review DATE.md
     with tags training, automation. Per PR: title, link, door, blast radius, merged or open (and why), 2-3 line summary, decisions you made. Per failure: step and exact error.
   Finish with a 3-line summary.
```

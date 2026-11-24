# Weekly codebase review (Paperclip)

Paperclip routine **Weekly Codebase Review (Mon 10:00)**: cron `0 10 * * 1`, Europe/Vienna, agent Running Coach.
It runs two skills on its own, opens one PR per skill against `main`, grades each PR with
`grade-my-pr`, and auto-merges when the door is two-way and blast radius is below 8.
It writes an Obsidian inbox note only when a PR was opened or the run failed. A run with no changes stays silent.
Step 8 is a read-only **coaching review**: it answers "what in this repo should improve so the AI coaches better
and I train better?" and **always** writes `00 Inbox/Weekly Training Review DATE.md`.

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
- Do not post progress comments on the issue while working. Comment only once, at the end, with the final summary.
- WT = ~/.cache/training-review (stable, survives run restarts). Never use $TMPDIR: it is deleted when a run ends.

0. Setup (resumable: a restarted run continues where the last one stopped)
   cd REPO && git worktree prune && git fetch origin
   For NAME in arch domain: if WT/NAME-DATE exists and is a valid worktree, reuse it as is.
   Else: git worktree add -B NAME/DATE WT/NAME-DATE origin/main
   Before opening a PR, check `gh pr list --head NAME/DATE --state all`: reuse an existing PR, never open a second one.
   In each worktree: ln -s REPO/db/.venv db/.venv (db/ is git-ignored). If a test needs db/training.duckdb, copy it in; never write to REPO/db.

1. Architecture pass (worktree WT/arch-DATE): run /mattpocock-skills:improve-codebase-architecture. From its candidates pick at most ONE: the best value-to-risk deepening. Implement it. No worthwhile candidate = no change, skip to step 3.

2. Domain-model pass (worktree WT/domain-DATE): run /mattpocock-skills:domain-modeling. Reconcile GLOSSARY.md and docs/adr/ with the terms the code and docs really use: fix drift, add missing terms, sharpen ambiguous ones, record an ADR only for a decision already visible in the code. Do not rename athlete-facing training terms. Nothing to fix = no change.

3. Verify each worktree that has changes:
   bash scripts/lint.sh
   db/.venv/bin/python -m pytest -q tests
   If webview/ changed: install deps with its lockfile's package manager, then run the build.
   On failure: fix once. Still failing: drop that branch (no PR) and record the exact error for the report.

4. For each verified branch: conventional commit, push, `gh pr create --base main` (body: what, why, how verified, decisions you made in place of the user).

5. Grade each PR: run /grade-my-pr <PR URL>. Read `door` and `blast_radius` from its JSON.

6. Merge rule per PR: door == "two-way" AND blast_radius < 8 AND checks not failing → `gh pr merge <N> --squash --delete-branch`. Otherwise leave it open and comment the grade JSON plus the reason it was not merged.

7. Cleanup: git worktree remove WT/arch-DATE and WT/domain-DATE (--force only for these two paths). Delete local branches that got no PR.

8. Coaching review (read-only: never edit, commit or touch Reminders; REPO reads are fine). Answer as the athlete's coach:
   "Is there anything I can improve in this repo so that you (AI) can do a better job, or I can train more efficiently and better?"
   Read: AGENTS.md, athlete.md, STATUS.md, the newest 10 entries of STATUS-log.md, injuries.md, zones.md, calendar.md, GLOSSARY.md,
   races/, the last 4 trainings/week-*.md and feedback/feedback-*.md, ~/.claude/skills/coach/SKILL.md and ~/.claude/skills/feedback/SKILL.md.
   Run (read-only): bash scripts/lint.sh · db/.venv/bin/python -m training report · db/.venv/bin/python -m training verify --days 7 ·
   git -C REPO log --since='8 days ago' --oneline (plan churn: fix/revert/re-plan commits = planning on bad data).
   Read the newest previous "~/Documents/workspace/notes/00 Inbox/Weekly Training Review *.md" (if any): do not re-propose what is
   already done in the repo; mark items from last week that are still undone as "still open (week N)".
   Look for: missing goal/periodization, stale or contradicting docs, untested zones, recurring watch-items that no rule fixes,
   data gaps (verify GAPs, stale metrics, import errors), plans revised after the fact, docs that cost agent context without value.
   Output at most 10 items, ranked by impact, grouped "Training", "Data & process", "Agent efficiency". Each item: finding with
   evidence (file:line or numbers from report/verify/git), the concrete change you propose, effort S/M/L. No generic advice.
   Write ~/Documents/workspace/notes/00 Inbox/Weekly Training Review DATE.md (obsidian-note inbox format, tags training, coaching-review).
   Always write this note, also when steps 1–7 changed nothing. Top of the note: 3-line TL;DR with the one change to do this week.

9. Codebase report:
   - No PR and no failure: write no codebase note.
   - Otherwise write an Obsidian inbox note (obsidian-note skill format) at
     ~/Documents/workspace/notes/00 Inbox/Weekly Codebase Review DATE.md
     with tags training, automation. Per PR: title, link, door, blast radius, merged or open (and why), 2-3 line summary, decisions you made. Per failure: step and exact error.
   Finish with a 3-line summary (PRs, codebase note yes/no, coaching review note path + its top item).
```

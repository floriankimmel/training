# Weekly training plan (Paperclip)

Paperclip routine **Weekly Training Plan (Mon 10:30)** (id `6c5cad21-66eb-4737-87df-9eec311acd99`): cron `30 10 * * 1`, Europe/Vienna.
Runs Monday after the 10:00 daily metrics + DB sync, so last week (incl. late Sunday runs) and today's
readiness are complete. Replaced the Sunday 21:00 run (2026-11-24): it planned on missing `.fit` data twice.

Source of truth for the prompt is this file. After editing:
`paperclipai routine update 6c5cad21-66eb-4737-87df-9eec311acd99 --payload-json '{"description": ...}'`.

## Prompt

```
On each fire (Monday 10:30): build THIS week's training plan (week starting today) via the coach skill in /Users/fkimmel/Documents/workspace/training.

0. Data first: run `bash scripts/auto-import.sh` (pulls metrics/*.md, imports .fit incl. Sunday-evening runs, runs verify). Last week is complete only after this. A missing .fit after the import = not trained; never assume a session happened.
1. Read STATUS.md, calendar.md (binding: no-run weeks, no-bike days, no-strength days), injuries.md, zones.md ("Nächster Feldtest": schedule it when its week and preconditions are met). Run `db/.venv/bin/python -m training report` (readiness: RED = no quality, AMBER = no new hard stimulus; Aerobe Effizienz = Pace in Zone Z1; weight warning) and `db/.venv/bin/python -m training verify --days 7` (every GAP = not trained).
2. Injury/pause note = running paused, NOT training paused. Plan what is allowed (bike + strength, per calendar.md). Only write a 0-min pause doc if ALL training is blocked. Do NOT invent running load while running is paused; running comes back only via a pain-free flat Z1 test (go/no-go date in the doc).
3. Races: if races/current-race-*.md exists, periodize toward it (build plan, vertical gap). If none exists, no race is active: base mode, volume before intensity, no build-plan targets.
4. HR targets in absolute bpm: running from zones.md "Laufen", bike from zones.md "Rad" (aerobic bike cap 144). Recovery-run @workout alert hr:125-138.
5. Strength from the digitized Mark Lauren program (strength-plan.md pointer), respecting calendar constraints.
6. Run scripts/lint.sh, then commit the week doc + STATUS.md (snapshot) + STATUS-log.md (new dated entry on top, max ~3 lines / 400 chars) together.
7. Sync Apple Reminders (list 🏅 Trainingsplan, tag training, @workout line on run/bike tasks), refresh the webview. Today's session first: it may start around noon.
8. Mark the existing Apple Reminders task 👟 Training Planen completed.
9. Report the week plan + the one thing to fix, no sugarcoating.
```

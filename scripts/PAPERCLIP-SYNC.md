# Daily DB sync (Paperclip)

`scripts/auto-import.sh` runs once per day via Paperclip (launchd was dropped: TCC blocks
`~/Documents` + iCloud for launchd jobs). It does `git pull --rebase --autostash` (new `metrics/*.md`),
imports HealthFit `.fit` + metrics into `db/training.duckdb`, and makes the daily backup. Log: `db/auto-import.log`.

## Prompt

```
Daily DB sync in /Users/fkimmel/Documents/workspace/training:

1. Run `bash scripts/auto-import.sh` (git pull --rebase for new metrics/*.md, imports new HealthFit .fit files + metrics into db/training.duckdb, makes the daily backup). Takes ~1 min.
2. Show the new lines in db/auto-import.log. If git pull, import_fit or backup failed, report the exact error and stop. Do not retry in a loop, do not delete db files, do not resolve merge conflicts yourself.
3. Verify with DuckDB (read-only): newest activity per sport (running, cycling, other) and the newest day in daily_metrics. Report how many activities were new since the last run.
4. Warn if the newest activity is older than 3 days or the newest metrics day is older than 2 days.
5. Do not commit or push anything (db/ is git-ignored).

Report in 3–5 lines: new activities (date, sport, duration), newest metrics day, any problem.
```

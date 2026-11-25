# Daily DB sync (Paperclip)

`scripts/auto-import.sh` runs once per day via Paperclip (launchd was dropped: TCC blocks
`~/Documents` + iCloud for launchd jobs). It does `git pull --rebase --autostash` (new `metrics/*.md`),
imports HealthFit `.fit` + metrics into `db/training.duckdb`, checks ticked-off reminders against recorded
activities (`python -m training verify`), and makes the daily backup. Log: `db/auto-import.log`.

## Setup

- Routine **Daily Metrics** (`0 10 * * *` Europe/Vienna), project/folder Running.
- Agent **Running Data Runner** uses the `process` adapter (no LLM, no tokens):
  `command: /bin/bash`, `args: [scripts/paperclip-daily-metrics.sh]`, `cwd: <repo>`, `timeoutSec: 900`.
- `scripts/paperclip-daily-metrics.sh` runs `auto-import.sh`, then reports new activities, newest
  activity, newest metrics day and `verify GAP:` lines as a comment on the run issue.
  - OK: issue -> `done`, exit 0.
  - Problem (`FAILED`, import errors, activity older than 3 days, metrics older than 2 days):
    issue -> `blocked`, exit 1, so it shows up in the Paperclip inbox.
- The `process` adapter sets no `PAPERCLIP_TASK_ID`; the script resolves the issue from
  `PAPERCLIP_RUN_ID` and falls back to the agent's oldest open issue.

## Local test

```
AUTO_IMPORT_DEBOUNCE=0 bash scripts/paperclip-daily-metrics.sh
```

Without Paperclip env vars it only prints the report.

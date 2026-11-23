# Python domain core, webview reads it through a CLI call

Weekly plan parsing, zones, Pace in Zone and Readiness live in one Python package (`training/`). The TypeScript webview gets them as JSON from one `python -m training page … --json` call per page. Before, four parsers and three pace queries in bash, Python and TS drifted apart. Python already owns the DB, the importers and lint, so it is the only side that can hold the rules once.

## Considered Options

- **TS core, lint calls it via bun/tsx**: rejected, because the importers, `load_report` and the DuckDB tooling are Python. Two runtimes would end up in the lint path.
- **Both, kept in sync by shared fixtures**: rejected, because every rule would still be written twice. That double bookkeeping is the drift we are removing.
- **JSON snapshots written by the import pipeline**: rejected, because editing a plan without running an import would show stale data.
- **Long-running Python HTTP server**: rejected, because it adds a second process to keep alive for no gain at one user.

## Consequences

Each webview page load spawns Python, which takes about 150–300 ms. `db.ts` keeps only plain data queries; domain rules must not be added back to TS.

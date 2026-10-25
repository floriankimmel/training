# Auto-import (launchd)

Watches the HealthFit iCloud folder → `scripts/auto-import.sh` (import_fit + import_metrics, daily backup).
Log: `db/auto-import.log`.

Install (once, needs the user — not done by the agent):

```bash
cp scripts/launchd/com.fkimmel.training-import.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.fkimmel.training-import.plist
launchctl kickstart gui/$(id -u)/com.fkimmel.training-import   # test run
```

Uninstall: `launchctl bootout gui/$(id -u)/com.fkimmel.training-import && rm ~/Library/LaunchAgents/com.fkimmel.training-import.plist`.

If the log stays empty: grant `/bin/bash` Full Disk Access (iCloud folder is TCC-protected).

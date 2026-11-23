"""Locate the training repo root: nearest ancestor holding zones.md."""
from pathlib import Path


def find_root(start: Path | None = None) -> Path:
    here = (start or Path(__file__)).resolve()
    for d in [here, *here.parents]:
        if (d / "zones.md").is_file():
            return d
    raise FileNotFoundError(f"no zones.md above {here}")


ROOT = find_root()

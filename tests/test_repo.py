from pathlib import Path

import pytest

from training.repo import ROOT, find_root


def test_root_holds_zones_md():
    assert (ROOT / "zones.md").is_file()


def test_find_root_from_nested_dir(tmp_path: Path):
    (tmp_path / "zones.md").write_text("x")
    nested = tmp_path / "a" / "b"
    nested.mkdir(parents=True)
    assert find_root(nested) == tmp_path


def test_find_root_fails_without_zones(tmp_path: Path):
    with pytest.raises(FileNotFoundError):
        find_root(tmp_path)

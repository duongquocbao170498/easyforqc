#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
ASSETS_ROOT = SKILL_ROOT / "assets"
SUITES_ROOT = ASSETS_ROOT / "suites"
GENERATED_SUITES_ROOT = SUITES_ROOT / "generated"
GOALS_ROOT = ASSETS_ROOT / "goals"
OUTPUT_ROOT = ASSETS_ROOT / "output"
REFERENCES_ROOT = SKILL_ROOT / "references"


def display_path(path: Path) -> str:
    return str(path.expanduser().resolve())

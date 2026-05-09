#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import yaml

from path_config import (
    GENERATED_SUITES_ROOT,
    GOALS_ROOT,
    REFERENCES_ROOT,
    display_path,
)


DEFAULT_GOAL_FILE = GOALS_ROOT / "lien-hung-booking-regression.md"
DEFAULT_GUIDANCE_FILE = REFERENCES_ROOT / "planner-guidance.md"
DEFAULT_SUITE_FORMAT_FILE = REFERENCES_ROOT / "suite-format.md"
DEFAULT_PLANNER_MODEL = "gpt-5.4-mini"
DEFAULT_PLANNER_TIMEOUT_SECONDS = 180.0
DEFAULT_PLANNER_REASONING_EFFORT = "medium"
DEFAULT_SUITE_DEFAULTS = {
    "webhook_url": "http://localhost:3000/webhook/chatwoot",
    "chat_ui_mode": "realistic",
    "ui_inbox_id": None,
    "labels": ["ai"],
    "assignee_name": "Bot",
    "reply_timeout_seconds": 300,
    "reply_settle_seconds": 3,
    "poll_interval_seconds": 2,
}
PLANNER_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["suite_name", "goal_summary", "defaults", "cases"],
    "properties": {
        "suite_name": {"type": "string"},
        "goal_summary": {"type": "string"},
        "defaults": {
            "type": "object",
            "additionalProperties": False,
            "required": [
                "webhook_url",
                "chat_ui_mode",
                "ui_inbox_id",
                "labels",
                "assignee_name",
                "reply_timeout_seconds",
                "reply_settle_seconds",
                "poll_interval_seconds",
                "inbox_id",
                "captain_assistant_id",
            ],
            "properties": {
                "webhook_url": {"type": "string"},
                "chat_ui_mode": {
                    "type": "string",
                    "enum": ["realistic", "webhook-only"],
                },
                "ui_inbox_id": {
                    "anyOf": [
                        {"type": "integer"},
                        {"type": "null"},
                    ]
                },
                "labels": {"type": "array", "items": {"type": "string"}},
                "assignee_name": {"type": "string"},
                "reply_timeout_seconds": {"type": "number"},
                "reply_settle_seconds": {"type": "number"},
                "poll_interval_seconds": {"type": "number"},
                "inbox_id": {
                    "anyOf": [
                        {"type": "integer"},
                        {"type": "null"},
                    ]
                },
                "captain_assistant_id": {
                    "anyOf": [
                        {"type": "integer"},
                        {"type": "null"},
                    ]
                },
            },
        },
        "cases": {
            "type": "array",
            "minItems": 1,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "case_id",
                    "title",
                    "objective",
                    "conversation_id",
                    "contact_id",
                    "inbox_id",
                    "captain_assistant_id",
                    "labels",
                    "assignee_name",
                    "stop_regex_any",
                    "contact",
                    "steps",
                ],
                "properties": {
                    "case_id": {"type": "string"},
                    "title": {"type": "string"},
                    "objective": {"type": "string"},
                    "opening_prompt": {
                        "anyOf": [
                            {"type": "string"},
                            {"type": "null"},
                        ]
                    },
                    "metadata": {
                        "type": "object",
                    },
                    "conversation_id": {
                        "anyOf": [
                            {"type": "string"},
                            {"type": "null"},
                        ]
                    },
                    "contact_id": {
                        "anyOf": [
                            {"type": "string"},
                            {"type": "null"},
                        ]
                    },
                    "inbox_id": {
                        "anyOf": [
                            {"type": "integer"},
                            {"type": "null"},
                        ]
                    },
                    "captain_assistant_id": {
                        "anyOf": [
                            {"type": "integer"},
                            {"type": "null"},
                        ]
                    },
                    "ui_inbox_id": {
                        "anyOf": [
                            {"type": "integer"},
                            {"type": "null"},
                        ]
                    },
                    "labels": {"type": "array", "items": {"type": "string"}},
                    "assignee_name": {
                        "anyOf": [
                            {"type": "string"},
                            {"type": "null"},
                        ]
                    },
                    "stop_regex_any": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "contact": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["name", "phone", "email"],
                        "properties": {
                            "name": {"type": "string"},
                            "phone": {"type": "string"},
                            "email": {
                                "anyOf": [
                                    {"type": "string"},
                                    {"type": "null"},
                                ]
                            },
                        },
                    },
                    "steps": {
                        "type": "array",
                        "minItems": 1,
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": [
                                "prompt",
                                "timeout_seconds",
                                "expectation",
                            ],
                            "properties": {
                                "prompt": {"type": "string"},
                                "timeout_seconds": {
                                    "anyOf": [
                                        {"type": "number"},
                                        {"type": "null"},
                                    ]
                                },
                                "expectation": {
                                    "type": "object",
                                    "additionalProperties": False,
                                    "required": [
                                        "contains_any",
                                        "regex_any",
                                    ],
                                    "properties": {
                                        "contains_any": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                        },
                                        "regex_any": {
                                            "type": "array",
                                            "items": {"type": "string"},
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    },
}
DEFAULT_STOP_REGEX = (
    r"(?i)(mã vé|ticket code|booking code|mã đặt chỗ|mã booking).*[A-Z0-9]{5,12}"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Plan a Chatwoot local test suite and write it as YAML."
    )
    parser.add_argument(
        "--goal-file",
        default=str(DEFAULT_GOAL_FILE),
        help="Markdown goal file used by the planner.",
    )
    parser.add_argument(
        "--output-file",
        help=(
            "Optional output YAML path. Defaults to "
            "assets/suites/generated/YYYY-MM-DD-<goal-stem>/<timestamp>-<goal-stem>.yml."
        ),
    )
    parser.add_argument(
        "--suite-name",
        help="Optional suite_name override.",
    )
    parser.add_argument(
        "--default-inbox-id",
        type=int,
        help="Optional inbox_id to inject into suite defaults when the planner omits it.",
    )
    parser.add_argument(
        "--default-captain-assistant-id",
        type=int,
        help="Optional captain_assistant_id to inject into suite defaults when the planner omits it.",
    )
    parser.add_argument(
        "--planner-model",
        default=DEFAULT_PLANNER_MODEL,
        help="Codex model used for suite planning.",
    )
    parser.add_argument(
        "--planner-reasoning-effort",
        choices=("low", "medium", "high"),
        default=DEFAULT_PLANNER_REASONING_EFFORT,
        help="Reasoning effort override passed to Codex CLI.",
    )
    parser.add_argument(
        "--planner-timeout-seconds",
        type=float,
        default=DEFAULT_PLANNER_TIMEOUT_SECONDS,
        help="Timeout for the Codex planner call.",
    )
    parser.add_argument(
        "--planner-guidance-file",
        default=str(DEFAULT_GUIDANCE_FILE),
        help="Markdown planner guidance file.",
    )
    parser.add_argument(
        "--suite-format-file",
        default=str(DEFAULT_SUITE_FORMAT_FILE),
        help="Reference markdown that describes the suite YAML shape.",
    )
    return parser.parse_args()


def read_text(path_str: str) -> str:
    return Path(path_str).expanduser().resolve().read_text(encoding="utf-8").strip()


def default_output_path(goal_path: Path) -> Path:
    suite_name = slugify(goal_path.stem)
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    dated_dir = f"{time.strftime('%Y-%m-%d')}-{suite_name}"
    output_dir = GENERATED_SUITES_ROOT / dated_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"{timestamp}-{suite_name}.yml"


def build_prompt(
    *,
    goal_text: str,
    guidance_text: str,
    suite_format_text: str,
    suite_name: str | None,
    default_inbox_id: int | None,
    default_captain_assistant_id: int | None,
) -> str:
    defaults_hint = []
    if default_inbox_id is not None:
        defaults_hint.append(f"- inject inbox_id={default_inbox_id} into defaults or cases")
    if default_captain_assistant_id is not None:
        defaults_hint.append(
            "- inject captain_assistant_id="
            f"{default_captain_assistant_id} into defaults or cases"
        )
    defaults_text = "\n".join(defaults_hint) if defaults_hint else "- no caller-provided ids"
    suite_name_hint = suite_name or "(planner chooses suite_name)"
    return (
        "You are planning a reusable Chatwoot local test suite.\n"
        "Return JSON only, matching the provided schema.\n"
        "Do not explain. Do not wrap in markdown.\n\n"
        f"Requested suite_name override: {suite_name_hint}\n"
        "Caller-provided default id hints:\n"
        f"{defaults_text}\n\n"
        "Planner guidance markdown:\n"
        f"{guidance_text}\n\n"
        "Suite format markdown:\n"
        f"{suite_format_text}\n\n"
        "Goal markdown:\n"
        f"{goal_text}\n\n"
        "Additional rules:\n"
        "- Keep cases runnable on fresh Chatwoot conversations.\n"
        "- Prefer 3 to 8 focused cases unless the goal clearly needs fewer.\n"
        "- Use realistic Vietnamese user prompts.\n"
        "- Always include a contact with name and phone for every case.\n"
        "- Always include at least one final stop_regex_any pattern per case.\n"
        "- Each step expectation should be minimal but concrete.\n"
        "- If a final step captures contact info, make the prompt match the case contact.\n"
        "- If ids are unknown, leave them out rather than inventing environment-specific values.\n"
    )


def run_codex_planner(
    *,
    prompt: str,
    planner_model: str,
    planner_reasoning_effort: str,
    planner_timeout_seconds: float,
) -> dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix="chatwoot-suite-plan-") as temp_dir:
        temp_path = Path(temp_dir)
        schema_path = temp_path / "planner-schema.json"
        output_path = temp_path / "planner-output.json"
        schema_path.write_text(
            json.dumps(PLANNER_SCHEMA, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        command = [
            "codex",
            "exec",
            "--skip-git-repo-check",
            "--sandbox",
            "read-only",
            "--ephemeral",
            "-m",
            planner_model,
            "-c",
            f'model_reasoning_effort="{planner_reasoning_effort}"',
            "--output-schema",
            str(schema_path),
            "-o",
            str(output_path),
            "-",
        ]
        result = subprocess.run(
            command,
            input=prompt,
            text=True,
            capture_output=True,
            timeout=planner_timeout_seconds,
            check=False,
        )
        if result.returncode != 0:
            raise RuntimeError(
                "codex planner failed: "
                + (
                    result.stderr.strip()
                    or result.stdout.strip()
                    or f"exit={result.returncode}"
                )
            )
        if not output_path.exists():
            raise RuntimeError("codex planner did not produce an output file.")
        payload = json.loads(output_path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError("Planner output must be a JSON object.")
    return payload


def normalize_text(value: Any, *, fallback: str | None = None) -> str:
    normalized = re.sub(r"\s+", " ", str(value or "")).strip()
    if normalized:
        return normalized
    if fallback is None:
        raise RuntimeError("Expected non-empty text value during suite normalization.")
    return fallback


def normalize_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    items = []
    for item in value:
        normalized = re.sub(r"\s+", " ", str(item or "")).strip()
        if normalized:
            items.append(normalized)
    return items


def slugify(value: str) -> str:
    lowered = value.lower()
    lowered = re.sub(r"[^a-z0-9]+", "-", lowered)
    lowered = re.sub(r"-{2,}", "-", lowered).strip("-")
    return lowered or "chatwoot-suite"


def case_number_prefix(index: int) -> str:
    return f"{index:02d}"


def derive_goal_summary(goal_text: str) -> str:
    lines = [line.strip() for line in goal_text.splitlines() if line.strip()]
    for line in lines:
        if not line.startswith("#"):
            return line
    return "Plan and run a local Chatwoot regression suite."


def normalize_suite(
    planner_output: dict[str, Any],
    *,
    goal_text: str,
    goal_path: Path,
    suite_name_override: str | None,
    default_inbox_id: int | None,
    default_captain_assistant_id: int | None,
) -> dict[str, Any]:
    planner_defaults = planner_output.get("defaults")
    if planner_defaults is not None and not isinstance(planner_defaults, dict):
        raise RuntimeError("Planner field defaults must be an object when present.")

    suite_name = slugify(
        suite_name_override
        or planner_output.get("suite_name")
        or goal_path.stem
    )
    defaults = dict(DEFAULT_SUITE_DEFAULTS)
    defaults.update(planner_defaults or {})
    if default_inbox_id is not None and defaults.get("inbox_id") in (None, ""):
        defaults["inbox_id"] = int(default_inbox_id)
    if (
        default_captain_assistant_id is not None
        and defaults.get("captain_assistant_id") in (None, "")
    ):
        defaults["captain_assistant_id"] = int(default_captain_assistant_id)
    defaults["labels"] = normalize_string_list(defaults.get("labels")) or ["ai"]
    defaults["chat_ui_mode"] = normalize_text(
        defaults.get("chat_ui_mode"),
        fallback=DEFAULT_SUITE_DEFAULTS["chat_ui_mode"],
    )
    if defaults["chat_ui_mode"] not in ("realistic", "webhook-only"):
        defaults["chat_ui_mode"] = DEFAULT_SUITE_DEFAULTS["chat_ui_mode"]
    if defaults.get("ui_inbox_id") not in (None, ""):
        defaults["ui_inbox_id"] = int(defaults["ui_inbox_id"])
    else:
        defaults["ui_inbox_id"] = None
    defaults["assignee_name"] = normalize_text(
        defaults.get("assignee_name"),
        fallback=DEFAULT_SUITE_DEFAULTS["assignee_name"],
    )

    raw_cases = planner_output.get("cases")
    if not isinstance(raw_cases, list) or not raw_cases:
        raise RuntimeError("Planner must return a non-empty cases list.")

    normalized_cases = []
    for index, raw_case in enumerate(raw_cases, start=1):
        if not isinstance(raw_case, dict):
            raise RuntimeError(f"Planner case #{index} must be an object.")
        contact = raw_case.get("contact")
        if not isinstance(contact, dict):
            raise RuntimeError(f"Planner case #{index} contact must be an object.")
        raw_steps = raw_case.get("steps")
        if not isinstance(raw_steps, list) or not raw_steps:
            raise RuntimeError(f"Planner case #{index} must contain steps.")

        steps = []
        for step_index, raw_step in enumerate(raw_steps, start=1):
            if not isinstance(raw_step, dict):
                raise RuntimeError(
                    f"Planner case #{index} step #{step_index} must be an object."
                )
            expectation = raw_step.get("expectation")
            expectation_payload = {}
            if isinstance(expectation, dict):
                contains_any = normalize_string_list(expectation.get("contains_any"))
                regex_any = normalize_string_list(expectation.get("regex_any"))
                if contains_any:
                    expectation_payload["contains_any"] = contains_any
                if regex_any:
                    expectation_payload["regex_any"] = regex_any
            step_payload: dict[str, Any] = {
                "prompt": normalize_text(raw_step.get("prompt")),
            }
            if raw_step.get("timeout_seconds") not in (None, ""):
                step_payload["timeout_seconds"] = float(raw_step["timeout_seconds"])
            if expectation_payload:
                step_payload["expectation"] = expectation_payload
            steps.append(step_payload)

        stop_regex_any = normalize_string_list(raw_case.get("stop_regex_any"))
        if not stop_regex_any:
            stop_regex_any = [DEFAULT_STOP_REGEX]

        case_payload: dict[str, Any] = {
            "case_id": (
                f"{case_number_prefix(index)}-"
                + slugify(
                    normalize_text(
                        raw_case.get("case_id"),
                        fallback=f"{suite_name}-case-{index:02d}",
                    )
                )
            ),
            "title": (
                f"{case_number_prefix(index)}. "
                + normalize_text(
                    raw_case.get("title"),
                    fallback=f"{suite_name} case {index}",
                )
            ),
            "objective": normalize_text(
                raw_case.get("objective"),
                fallback="Validate the expected Chatwoot booking flow.",
            ),
            "contact": {
                "name": normalize_text(contact.get("name"), fallback="Test Runner"),
                "phone": normalize_text(contact.get("phone"), fallback="0900000000"),
            },
            "stop_regex_any": stop_regex_any,
            "steps": steps,
        }
        if contact.get("email") not in (None, ""):
            case_payload["contact"]["email"] = normalize_text(contact.get("email"))

        for optional_key in (
            "conversation_id",
            "contact_id",
            "assignee_name",
        ):
            if raw_case.get(optional_key) not in (None, ""):
                case_payload[optional_key] = normalize_text(raw_case.get(optional_key))

        if raw_case.get("labels") not in (None, []):
            labels = normalize_string_list(raw_case.get("labels"))
            if labels:
                case_payload["labels"] = labels

        for optional_int_key in ("inbox_id", "captain_assistant_id", "ui_inbox_id"):
            if raw_case.get(optional_int_key) not in (None, ""):
                case_payload[optional_int_key] = int(raw_case[optional_int_key])

        normalized_cases.append(case_payload)

    return {
        "suite_name": suite_name,
        "generated_at": datetime.now(UTC).isoformat(),
        "goal_summary": normalize_text(
            planner_output.get("goal_summary"),
            fallback=derive_goal_summary(goal_text),
        ),
        "defaults": defaults,
        "cases": normalized_cases,
    }


def write_yaml(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.safe_dump(payload, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )


def main() -> int:
    args = parse_args()
    goal_path = Path(args.goal_file).expanduser().resolve()
    output_path = (
        Path(args.output_file).expanduser().resolve()
        if args.output_file
        else default_output_path(goal_path)
    )
    goal_text = read_text(str(goal_path))
    guidance_text = read_text(args.planner_guidance_file)
    suite_format_text = read_text(args.suite_format_file)
    prompt = build_prompt(
        goal_text=goal_text,
        guidance_text=guidance_text,
        suite_format_text=suite_format_text,
        suite_name=args.suite_name,
        default_inbox_id=args.default_inbox_id,
        default_captain_assistant_id=args.default_captain_assistant_id,
    )
    planner_output = run_codex_planner(
        prompt=prompt,
        planner_model=args.planner_model,
        planner_reasoning_effort=args.planner_reasoning_effort,
        planner_timeout_seconds=args.planner_timeout_seconds,
    )
    suite_payload = normalize_suite(
        planner_output,
        goal_text=goal_text,
        goal_path=goal_path,
        suite_name_override=args.suite_name,
        default_inbox_id=args.default_inbox_id,
        default_captain_assistant_id=args.default_captain_assistant_id,
    )
    write_yaml(output_path, suite_payload)
    print(display_path(output_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

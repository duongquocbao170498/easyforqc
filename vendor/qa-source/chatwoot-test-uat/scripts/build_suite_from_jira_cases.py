#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import requests
import yaml

CURRENT_FILE = Path(__file__).resolve()
sys.path.insert(0, str(CURRENT_FILE.parent))

from path_config import GENERATED_SUITES_ROOT, display_path


SKILL_DIR = CURRENT_FILE.parent.parent
DEFAULT_JIRA_BASE_URL = "https://jira.vexere.net"
DEFAULT_WEBHOOK_URL = "http://localhost:3000/webhook/chatwoot"
DEFAULT_STOP_REGEX = r"(?i)https?://\S+"
TEST_CONTACT_NAMES = [
    "Khánh Thị Thiện",
    "Thiện Thị Khánh",
    "Nguyễn Minh Khánh",
    "Trần Gia Thiện",
    "Lê Khánh An",
    "Phạm Thiện Tâm",
    "Đỗ Minh Thiện",
    "Võ Khánh Linh",
]
HTML_BREAK_PATTERN = re.compile(r"(?i)<br\s*/?>")
HTML_BLOCK_TAG_PATTERN = re.compile(r"(?i)</?(?:div|p|ul|ol)[^>]*>")
HTML_LIST_ITEM_OPEN_PATTERN = re.compile(r"(?i)<li[^>]*>")
HTML_LIST_ITEM_CLOSE_PATTERN = re.compile(r"(?i)</li\s*>")
HTML_TAG_PATTERN = re.compile(r"(?i)<[^>]+>")
NUMBERED_LINE_PATTERN = re.compile(r"^\s*(\d+)\.\s*(.+?)\s*$")


def requests_json(method: str, url: str, **kwargs: Any) -> Any:
    response = requests.request(method, url, timeout=kwargs.pop("timeout", 60), **kwargs)
    if response.status_code >= 400:
        raise RuntimeError(f"{method} {url} failed with HTTP {response.status_code}: {response.text[:1500]}")
    if not response.text.strip():
        return {}
    return response.json()


def load_local_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit(f"Expected JSON object in {path}")
    return payload


def resolve_jira_auth(
    base_url: Optional[str],
    user: Optional[str],
    password: Optional[str],
    token: Optional[str],
) -> Tuple[str, Dict[str, str], Optional[Tuple[str, str]]]:
    local = load_local_json(SKILL_DIR / ".jira.local.json")
    shared_local = load_local_json(SKILL_DIR.parent / "sync-jira-test-cases-to-nocodb" / ".jira.local.json")
    resolved_base = (
        base_url
        or os.getenv("JIRA_BASE_URL")
        or local.get("base_url")
        or shared_local.get("base_url")
        or DEFAULT_JIRA_BASE_URL
    )
    resolved_token = token or os.getenv("JIRA_TOKEN") or local.get("token") or shared_local.get("token")
    resolved_user = user or os.getenv("JIRA_USER") or local.get("user") or shared_local.get("user")
    resolved_password = (
        password
        or os.getenv("JIRA_PASSWORD")
        or local.get("password")
        or shared_local.get("password")
    )

    headers = {"Accept": "application/json"}
    auth = None
    if resolved_token:
        headers["Authorization"] = f"Bearer {resolved_token}"
    elif resolved_user and resolved_password:
        auth = (resolved_user, resolved_password)
    else:
        raise SystemExit(
            "Missing Jira credentials. Provide --jira-token or --jira-user/--jira-password, "
            "set JIRA_TOKEN / JIRA_USER / JIRA_PASSWORD, or add .jira.local.json."
        )
    return str(resolved_base).rstrip("/"), headers, auth


def jira_json(
    method: str,
    base_url: str,
    path: str,
    *,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
) -> Any:
    return requests_json(method, f"{base_url}{path}", headers=headers, auth=auth)


def fetch_testrun(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    test_run_key: str,
) -> Dict[str, Any]:
    return jira_json("GET", base_url, f"/rest/atm/1.0/testrun/{test_run_key}", headers=headers, auth=auth)


def fetch_testcase(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    testcase_key: str,
) -> Dict[str, Any]:
    return jira_json("GET", base_url, f"/rest/atm/1.0/testcase/{testcase_key}", headers=headers, auth=auth)


def normalize_multiline_text(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = HTML_BREAK_PATTERN.sub("\n", text)
    text = HTML_LIST_ITEM_OPEN_PATTERN.sub("- ", text)
    text = HTML_LIST_ITEM_CLOSE_PATTERN.sub("\n", text)
    text = HTML_BLOCK_TAG_PATTERN.sub("\n", text)
    text = HTML_TAG_PATTERN.sub("", text)
    text = html.unescape(text)
    lines = [line.strip() for line in text.split("\n")]
    cleaned: List[str] = []
    for line in lines:
        if line:
            cleaned.append(line)
            continue
        if cleaned and cleaned[-1] != "":
            cleaned.append("")
    return "\n".join(cleaned).strip()


def normalize_single_user_turn(raw: str) -> str:
    text = normalize_multiline_text(raw)
    if not text:
        return ""
    quoted = re.findall(r'"([^"]+)"', text)
    if len(quoted) == 1:
        return quoted[0].strip()
    return text.strip()


def split_numbered_user_turns(raw: str) -> List[str]:
    text = normalize_multiline_text(raw)
    if not text:
        return []

    turns: List[str] = []
    current_lines: List[str] = []
    seen_numbered = False
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        match = NUMBERED_LINE_PATTERN.match(stripped)
        if match:
            if current_lines and seen_numbered:
                turns.append(normalize_single_user_turn("\n".join(current_lines)))
            current_lines = [match.group(2).strip()]
            seen_numbered = True
            continue
        if current_lines:
            current_lines.append(stripped)
        else:
            current_lines = [stripped]

    if current_lines:
        turns.append(normalize_single_user_turn("\n".join(current_lines)))

    cleaned = [turn.strip() for turn in turns if turn.strip()]
    if cleaned:
        return cleaned
    fallback = normalize_single_user_turn(text)
    return [fallback] if fallback else []


def normalize_test_script_steps(testcase: Dict[str, Any]) -> List[Dict[str, str]]:
    script = testcase.get("testScript") or {}
    steps = script.get("steps") or []
    if not isinstance(steps, list):
        return []

    normalized: List[Dict[str, str]] = []
    for step in steps:
        if not isinstance(step, dict):
            continue
        normalized.append(
            {
                "description": normalize_multiline_text(step.get("description")),
                "test_data": normalize_multiline_text(step.get("testData")),
                "expected_result": normalize_multiline_text(step.get("expectedResult")),
            }
        )
    return normalized


def extract_case_turns(testcase: Dict[str, Any]) -> Tuple[List[str], str]:
    steps = normalize_test_script_steps(testcase)
    first_test_data = next((step["test_data"] for step in steps if step["test_data"]), "")
    last_expected_result = next((step["expected_result"] for step in reversed(steps) if step["expected_result"]), "")
    turns = split_numbered_user_turns(first_test_data)
    return turns, last_expected_result


def slugify(value: str) -> str:
    text = re.sub(r"[^A-Za-z0-9]+", "-", str(value or "")).strip("-").lower()
    return text or "jira-chatwoot-suite"


def default_output_path(source_key: str) -> Path:
    stem = slugify(f"jira-{source_key}")
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return GENERATED_SUITES_ROOT / f"{datetime.now().date()}-{stem}" / f"{timestamp}-{stem}.yml"


def build_step(prompt: str, *, timeout_seconds: Optional[float] = None) -> Dict[str, Any]:
    return {
        "prompt": prompt,
        "timeout_seconds": timeout_seconds,
        "expectation": {
            "contains_any": [],
            "regex_any": [],
        },
    }


def build_case(
    *,
    testcase: Dict[str, Any],
    turns: Sequence[str],
    expected_result: str,
    mode: str,
    index: int,
    inbox_id: Optional[int],
    ui_inbox_id: Optional[int],
    captain_assistant_id: Optional[int],
    labels: Sequence[str],
    assignee_name: str,
    max_fixed_turns: Optional[int],
) -> Dict[str, Any]:
    testcase_key = str(testcase.get("key") or f"case-{index}").strip()
    testcase_name = str(testcase.get("name") or testcase_key).strip()
    objective = normalize_multiline_text(testcase.get("objective")) or testcase_name
    usable_turns = list(turns)
    if max_fixed_turns is not None and max_fixed_turns > 0:
        usable_turns = usable_turns[:max_fixed_turns]
    if not usable_turns:
        raise SystemExit(f"Testcase {testcase_key} has no usable numbered user messages in Test Data.")

    metadata = {
        "source": "jira_zephyr_testcase",
        "source_testcase_key": testcase_key,
        "source_testcase_name": testcase_name,
        "execution_mode": mode,
        "planned_user_turns": list(turns),
        "jira_expected_result": expected_result,
        "adaptive_instruction": (
            "Treat planned_user_turns as ordered user intents. Adapt each next user message "
            "to the real bot reply and choose only options that the bot actually offers."
        ),
    }
    steps = [build_step(prompt) for prompt in usable_turns]
    return {
        "case_id": slugify(f"{testcase_key}-{testcase_name}")[:90],
        "title": testcase_name,
        "objective": objective,
        "opening_prompt": usable_turns[0] if mode == "adaptive" else None,
        "metadata": metadata,
        "conversation_id": None,
        "contact_id": None,
        "inbox_id": inbox_id,
        "captain_assistant_id": captain_assistant_id,
        "ui_inbox_id": ui_inbox_id,
        "labels": list(labels),
        "assignee_name": assignee_name,
        "stop_regex_any": [DEFAULT_STOP_REGEX],
        "contact": {
            "name": f"{TEST_CONTACT_NAMES[(index - 1) % len(TEST_CONTACT_NAMES)]} {index:03d}",
            "phone": f"090000{index:04d}",
            "email": None,
        },
        "steps": steps,
    }


def build_suite(
    *,
    source_key: str,
    testcases: Sequence[Dict[str, Any]],
    mode: str,
    suite_name: Optional[str],
    inbox_id: Optional[int],
    ui_inbox_id: Optional[int],
    captain_assistant_id: Optional[int],
    labels: Sequence[str],
    assignee_name: str,
    max_fixed_turns: Optional[int],
) -> Dict[str, Any]:
    cases: List[Dict[str, Any]] = []
    skipped: List[Dict[str, str]] = []
    for index, testcase in enumerate(testcases, start=1):
        turns, expected_result = extract_case_turns(testcase)
        if not turns:
            skipped.append(
                {
                    "testcase_key": str(testcase.get("key") or ""),
                    "reason": "missing_numbered_test_data",
                }
            )
            continue
        cases.append(
            build_case(
                testcase=testcase,
                turns=turns,
                expected_result=expected_result,
                mode=mode,
                index=index,
                inbox_id=inbox_id,
                ui_inbox_id=ui_inbox_id,
                captain_assistant_id=captain_assistant_id,
                labels=labels,
                assignee_name=assignee_name,
                max_fixed_turns=max_fixed_turns if mode == "fixed" else None,
            )
        )

    if not cases:
        raise SystemExit(f"No runnable cases found for {source_key}. Skipped: {skipped}")

    return {
        "suite_name": suite_name or f"Jira {source_key} Chatwoot UAT",
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "goal_summary": (
            f"Chatwoot UAT suite generated from Jira {source_key}. "
            f"Mode={mode}. Cases={len(cases)}."
        ),
        "defaults": {
            "webhook_url": DEFAULT_WEBHOOK_URL,
            "chat_ui_mode": "realistic",
            "ui_inbox_id": ui_inbox_id,
            "labels": list(labels),
            "assignee_name": assignee_name,
            "reply_timeout_seconds": 300,
            "reply_settle_seconds": 3,
            "poll_interval_seconds": 2,
            "inbox_id": inbox_id,
            "captain_assistant_id": captain_assistant_id,
        },
        "source": {
            "type": "jira_zephyr",
            "key": source_key,
            "mode": mode,
            "skipped": skipped,
        },
        "cases": cases,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build a Chatwoot UAT suite YAML from Jira Zephyr testcase Test Data."
    )
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--test-run-key", help="Zephyr test run/cycle key, for example AI-C298.")
    source.add_argument(
        "--testcase-key",
        action="append",
        help="Zephyr testcase key. Repeat for multiple cases, for example --testcase-key AI-T1853.",
    )
    parser.add_argument("--mode", choices=("fixed", "adaptive"), default="adaptive")
    parser.add_argument("--suite-name")
    parser.add_argument("--output-file")
    parser.add_argument("--inbox-id", type=int)
    parser.add_argument("--ui-inbox-id", type=int)
    parser.add_argument("--captain-assistant-id", type=int)
    parser.add_argument("--label", action="append", dest="labels", default=None)
    parser.add_argument("--assignee-name", default="Bot")
    parser.add_argument(
        "--max-fixed-turns",
        type=int,
        help="Only for --mode fixed: cap the number of scripted user turns per case.",
    )
    parser.add_argument("--jira-base-url")
    parser.add_argument("--jira-user")
    parser.add_argument("--jira-password")
    parser.add_argument("--jira-token")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base_url, headers, auth = resolve_jira_auth(
        args.jira_base_url,
        args.jira_user,
        args.jira_password,
        args.jira_token,
    )

    source_key = args.test_run_key or ",".join(args.testcase_key or [])
    testcase_keys: List[str] = []
    if args.test_run_key:
        test_run = fetch_testrun(base_url, headers, auth, args.test_run_key)
        for item in test_run.get("items") or []:
            key = str(item.get("testCaseKey") or "").strip()
            if key:
                testcase_keys.append(key)
    else:
        testcase_keys = [str(key).strip() for key in args.testcase_key or [] if str(key).strip()]

    if not testcase_keys:
        raise SystemExit("No testcase keys found.")

    testcases = [fetch_testcase(base_url, headers, auth, key) for key in testcase_keys]
    labels = args.labels if args.labels is not None else ["ai"]
    suite = build_suite(
        source_key=source_key,
        testcases=testcases,
        mode=args.mode,
        suite_name=args.suite_name,
        inbox_id=args.inbox_id,
        ui_inbox_id=args.ui_inbox_id,
        captain_assistant_id=args.captain_assistant_id,
        labels=labels,
        assignee_name=args.assignee_name,
        max_fixed_turns=args.max_fixed_turns,
    )

    output_path = Path(args.output_file).expanduser() if args.output_file else default_output_path(source_key)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(yaml.safe_dump(suite, allow_unicode=True, sort_keys=False), encoding="utf-8")
    print(
        json.dumps(
            {
                "source_key": source_key,
                "mode": args.mode,
                "testcase_keys": testcase_keys,
                "case_count": len(suite["cases"]),
                "output_file": display_path(output_path),
                "skipped": suite.get("source", {}).get("skipped", []),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

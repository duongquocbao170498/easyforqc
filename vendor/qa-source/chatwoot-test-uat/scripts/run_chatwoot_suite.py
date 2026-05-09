#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from chatwoot_runner_core import (
    DEFAULT_CHAT_UI_MODE,
    DEFAULT_WEBHOOK_URL,
    RunnerError,
    count_failure_results,
    count_handoff_results,
    count_success_results,
    default_output_path,
    dump_yaml,
    load_yaml,
    raw_output_path,
    resolve_runtime_config,
    run_suite,
)
from path_config import OUTPUT_ROOT, SUITES_ROOT, display_path
from render_chatwoot_report_html import write_html_report


DEFAULT_SUITE_FILE = SUITES_ROOT / "default_suite.yml"
DEFAULT_HEALTHCHECK_URL = "http://localhost:3000/health"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a planned Chatwoot local suite and emit YAML, raw JSON, and HTML."
    )
    parser.add_argument(
        "--suite-file",
        default=str(DEFAULT_SUITE_FILE),
        help="Path to the suite YAML file.",
    )
    parser.add_argument(
        "--output-file",
        help="Optional YAML report output path.",
    )
    parser.add_argument(
        "--healthcheck-url",
        default=DEFAULT_HEALTHCHECK_URL,
        help="Local server health endpoint checked before execution.",
    )
    parser.add_argument(
        "--skip-healthcheck",
        action="store_true",
        help="Skip the pre-run health check.",
    )
    parser.add_argument(
        "--webhook-url",
        default=DEFAULT_WEBHOOK_URL,
        help="Webhook URL under test.",
    )
    parser.add_argument(
        "--chat-ui-mode",
        choices=("realistic", "webhook-only"),
        default=DEFAULT_CHAT_UI_MODE,
        help="Persist user-side Chatwoot messages in an Api inbox only, or stay webhook-only.",
    )
    parser.add_argument(
        "--ui-inbox-id",
        type=int,
        help="Explicit Api inbox id required for realistic Chatwoot UI mode when pinning a specific inbox.",
    )
    parser.add_argument(
        "--pinned-conversation-id",
        help="Reuse this exact Chatwoot conversation instead of creating a new one.",
    )
    parser.add_argument(
        "--chatwoot-api-base",
        help="Optional Chatwoot API base override.",
    )
    parser.add_argument(
        "--chatwoot-api-key",
        help="Optional Chatwoot API key override.",
    )
    parser.add_argument(
        "--user-chatwoot-api-key",
        help="Optional user Chatwoot API key override.",
    )
    parser.add_argument(
        "--account-id",
        type=int,
        help="Optional Chatwoot account_id override.",
    )
    parser.add_argument(
        "--docker-compose-command",
        default="docker compose",
        help="Compose command used to probe settings from the server container.",
    )
    parser.add_argument(
        "--inbox-id",
        type=int,
        help="Inject or override defaults.inbox_id for all cases missing it.",
    )
    parser.add_argument(
        "--captain-assistant-id",
        type=int,
        help="Inject or override defaults.captain_assistant_id for all cases missing it.",
    )
    parser.add_argument(
        "--labels",
        help="Comma-separated labels override for suite defaults.",
    )
    parser.add_argument(
        "--assignee-name",
        help="Assignee name override for suite defaults.",
    )
    parser.add_argument(
        "--reply-timeout-seconds",
        type=float,
        help="Override defaults.reply_timeout_seconds.",
    )
    parser.add_argument(
        "--reply-settle-seconds",
        type=float,
        help="Override defaults.reply_settle_seconds.",
    )
    parser.add_argument(
        "--poll-interval-seconds",
        type=float,
        help="Override defaults.poll_interval_seconds.",
    )
    parser.add_argument(
        "--case-id",
        help="Run only the case with this case_id.",
    )
    parser.add_argument(
        "--case-index",
        type=int,
        help="Run only the Nth case from the suite.",
    )
    parser.add_argument(
        "--limit-cases",
        type=int,
        help="Run only the first N cases after filtering.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse the suite and print the selected cases without executing them.",
    )
    return parser.parse_args()


def ensure_server_healthy(url: str) -> None:
    request = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if response.status >= 400:
                raise RuntimeError(f"Health check returned HTTP {response.status}.")
            body = response.read().decode("utf-8", errors="replace").strip()
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Health check failed with HTTP {error.code}: {detail}"
        ) from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Health check failed: {error.reason}") from error
    if body and "ok" not in body.lower() and "healthy" not in body.lower():
        try:
            payload = json.loads(body)
        except json.JSONDecodeError:
            payload = None
        if not isinstance(payload, dict):
            raise RuntimeError(f"Unexpected health check response: {body}")


def normalize_labels(value: str | None) -> list[str] | None:
    if value is None:
        return None
    labels = [item.strip() for item in value.split(",") if item.strip()]
    return labels or None


def select_cases(cases: list[dict[str, Any]], args: argparse.Namespace) -> list[dict[str, Any]]:
    selected = list(cases)
    if args.case_id:
        selected = [
            case for case in selected if str(case.get("case_id") or "").strip() == args.case_id
        ]
    if args.case_index is not None:
        if args.case_index < 1 or args.case_index > len(selected):
            raise RuntimeError(
                f"case-index {args.case_index} is out of range for {len(selected)} case(s)."
            )
        selected = [selected[args.case_index - 1]]
    if args.limit_cases is not None:
        selected = selected[: args.limit_cases]
    if not selected:
        raise RuntimeError("No cases left to run after applying filters.")
    return selected


def apply_suite_overrides(suite: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    payload = dict(suite)
    defaults = dict(payload.get("defaults") or {})
    defaults["webhook_url"] = args.webhook_url
    defaults["chat_ui_mode"] = args.chat_ui_mode
    case_overrides: dict[str, Any] = {
        "webhook_url": args.webhook_url,
        "chat_ui_mode": args.chat_ui_mode,
    }
    if args.pinned_conversation_id:
        defaults["pinned_conversation_id"] = str(args.pinned_conversation_id).strip()
        case_overrides["pinned_conversation_id"] = str(args.pinned_conversation_id).strip()
    if args.ui_inbox_id is not None:
        defaults["ui_inbox_id"] = int(args.ui_inbox_id)
        case_overrides["ui_inbox_id"] = int(args.ui_inbox_id)
    labels = normalize_labels(args.labels)
    if labels is not None:
        defaults["labels"] = labels
        case_overrides["labels"] = labels
    if args.assignee_name:
        defaults["assignee_name"] = args.assignee_name
        case_overrides["assignee_name"] = args.assignee_name
    if args.inbox_id is not None:
        defaults["inbox_id"] = int(args.inbox_id)
        case_overrides["inbox_id"] = int(args.inbox_id)
    if args.captain_assistant_id is not None:
        defaults["captain_assistant_id"] = int(args.captain_assistant_id)
        case_overrides["captain_assistant_id"] = int(args.captain_assistant_id)
    if args.reply_timeout_seconds is not None:
        defaults["reply_timeout_seconds"] = float(args.reply_timeout_seconds)
        case_overrides["reply_timeout_seconds"] = float(args.reply_timeout_seconds)
    if args.reply_settle_seconds is not None:
        defaults["reply_settle_seconds"] = float(args.reply_settle_seconds)
        case_overrides["reply_settle_seconds"] = float(args.reply_settle_seconds)
    if args.poll_interval_seconds is not None:
        defaults["poll_interval_seconds"] = float(args.poll_interval_seconds)
        case_overrides["poll_interval_seconds"] = float(args.poll_interval_seconds)
    payload["defaults"] = defaults
    raw_cases = payload.get("cases")
    if not isinstance(raw_cases, list) or not raw_cases:
        raise RuntimeError("Suite must define a non-empty cases list.")
    selected_cases = select_cases(raw_cases, args)
    payload["cases"] = [
        {**case, **case_overrides} if isinstance(case, dict) else case
        for case in selected_cases
    ]
    return payload


def build_report_payload(
    suite: dict[str, Any],
    result: dict[str, Any],
    *,
    suite_file: Path,
    runtime_summary: dict[str, Any],
) -> dict[str, Any]:
    payload = dict(result)
    defaults = suite.get("defaults") if isinstance(suite.get("defaults"), dict) else {}
    payload["suite_file"] = str(suite_file)
    payload["runtime"] = {
        **runtime_summary,
        "chat_ui_mode": defaults.get("chat_ui_mode"),
        "ui_inbox_id": defaults.get("ui_inbox_id"),
        "pinned_conversation_id": defaults.get("pinned_conversation_id"),
    }
    payload["selected_case_count"] = len(suite.get("cases") or [])
    if isinstance(suite.get("source_trace"), dict):
        payload["source_trace"] = suite.get("source_trace")
    return payload


def write_report_files(output_file: Path, report: dict[str, Any]) -> tuple[Path, Path]:
    dump_yaml(output_file, report)
    raw_file = raw_output_path(output_file)
    raw_file.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    html_file = write_html_report(raw_file)
    return raw_file, html_file


def print_dry_run(suite: dict[str, Any], output_file: Path) -> None:
    print(f"Suite: {suite.get('suite_name')}")
    print(f"Cases: {len(suite.get('cases') or [])}")
    print(f"Would write: {display_path(output_file)}")
    for index, case in enumerate(suite.get("cases") or [], start=1):
        steps = case.get("steps") or []
        print(
            f"- #{index} {case.get('case_id')} | {case.get('title')} | "
            f"{len(steps)} step(s)"
        )


def main() -> int:
    args = parse_args()
    suite_file = Path(args.suite_file).expanduser().resolve()
    suite = apply_suite_overrides(load_yaml(suite_file), args)
    output_file = (
        Path(args.output_file).expanduser().resolve()
        if args.output_file
        else default_output_path(
            OUTPUT_ROOT,
            str(suite.get("suite_name") or suite_file.stem),
        )
    )

    if args.dry_run:
        print_dry_run(suite, output_file)
        return 0

    if not args.skip_healthcheck:
        ensure_server_healthy(args.healthcheck_url)

    runtime = resolve_runtime_config(
        chatwoot_api_base=args.chatwoot_api_base,
        chatwoot_api_key=args.chatwoot_api_key,
        user_chatwoot_api_key=args.user_chatwoot_api_key,
        account_id=args.account_id,
        webhook_url=args.webhook_url,
        docker_compose_command=args.docker_compose_command,
    )
    def flush_progress(results_snapshot: list[dict[str, Any]]) -> None:
        partial_result = {
            "suite_name": suite.get("suite_name") or "chatwoot-suite",
            "generated_at": suite.get("generated_at"),
            "run_generated_at": None,
            "goal_summary": suite.get("goal_summary"),
            "defaults": suite.get("defaults") or {},
            "total_case_count": len(results_snapshot),
            "success_count": count_success_results(results_snapshot),
            "handoff_count": count_handoff_results(results_snapshot),
            "failure_count": count_failure_results(results_snapshot),
            "run_started_at": None,
            "run_completed_at": None,
            "results": results_snapshot,
        }
        partial_report = build_report_payload(
            suite,
            partial_result,
            suite_file=suite_file,
            runtime_summary={
                "webhook_url": runtime.webhook_url,
                "chatwoot_api_base": runtime.chatwoot_api_base,
                "account_id": runtime.account_id,
            },
        )
        write_report_files(output_file, partial_report)

    result = run_suite(runtime, suite, progress_callback=flush_progress)
    report = build_report_payload(
        suite,
        result,
        suite_file=suite_file,
        runtime_summary={
            "webhook_url": runtime.webhook_url,
            "chatwoot_api_base": runtime.chatwoot_api_base,
            "account_id": runtime.account_id,
        },
    )
    raw_file, html_file = write_report_files(output_file, report)

    print(display_path(output_file))
    print(display_path(raw_file))
    print(display_path(html_file))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RunnerError as error:
        raise SystemExit(str(error))

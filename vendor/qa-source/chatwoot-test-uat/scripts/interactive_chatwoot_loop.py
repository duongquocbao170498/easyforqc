#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import tempfile
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from chatwoot_runner_core import (
    DEFAULT_CHAT_UI_MODE,
    DEFAULT_POLL_INTERVAL_SECONDS,
    DEFAULT_REPLY_SETTLE_SECONDS,
    DEFAULT_REPLY_TIMEOUT_SECONDS,
    DEFAULT_WEBHOOK_URL,
    HandoffDetected,
    MIN_REPLY_TIMEOUT_SECONDS,
    RunnerError,
    build_case_context,
    count_failure_results,
    count_handoff_results,
    count_success_results,
    default_output_path,
    dump_yaml,
    enrich_turn_with_trace_data,
    initial_seen_outgoing_ids,
    is_error_reply_text,
    load_yaml,
    merge_case_config,
    normalize_space,
    post_prompt_and_wait,
    raw_output_path,
    resolve_runtime_config,
)
from path_config import OUTPUT_ROOT, REFERENCES_ROOT, SUITES_ROOT, display_path
from render_chatwoot_report_html import write_html_report
from run_chatwoot_suite import apply_suite_overrides, ensure_server_healthy


DEFAULT_SUITE_FILE = SUITES_ROOT / "default_suite.yml"
DEFAULT_MODE = "autonomous"
DEFAULT_MAX_USER_TURNS = 15
DEFAULT_PLANNER_BACKEND = "codex-cli"
DEFAULT_PLANNER_MODEL = "gpt-5.4-mini"
DEFAULT_PLANNER_TIMEOUT_SECONDS = 45.0
DEFAULT_PLANNER_GUIDANCE_FILE = REFERENCES_ROOT / "codex-planner-v2-guidance.md"
PAYMENT_LINK_PATTERN = re.compile(r"https?://[^\s\])]+")
BOOKING_CODE_PATTERN = re.compile(
    r"(?:mã đặt chỗ|mã booking|booking code|booking_code)[^A-Z0-9]*([A-Z0-9]{5,12})",
    re.IGNORECASE,
)
TICKET_CODE_PATTERN = re.compile(
    r"(?:mã vé|ticket code|ticket_code)[^A-Z0-9]*([A-Z0-9]{5,12})",
    re.IGNORECASE,
)
TIME_PATTERN = re.compile(r"\b(?:[01]\d|2[0-3]):[0-5]\d\b")
SEAT_PATTERN = re.compile(r"\b([A-Z]?\d{1,3})\b")
CONTACT_PATTERNS = (
    "họ và tên",
    "tên hành khách",
    "số điện thoại",
    "thông tin liên hệ",
)
PAYMENT_REQUEST_PATTERNS = (
    "link thanh toán",
    "thanh toán",
    "payment link",
)
HEURISTIC_FAILURE_PATTERNS = (
    "không hỗ trợ",
    "không thể hỗ trợ",
    "liên hệ tổng đài",
    "liên hệ cskh",
    "gặp sự cố kỹ thuật",
    "vấn đề kỹ thuật",
    "lỗi kỹ thuật",
)
CODEX_PLANNER_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["action", "planner_reason", "stop_reason", "user_message"],
    "properties": {
        "action": {"type": "string", "enum": ["respond", "stop"]},
        "planner_reason": {"type": "string"},
        "stop_reason": {"anyOf": [{"type": "string"}, {"type": "null"}]},
        "user_message": {"anyOf": [{"type": "string"}, {"type": "null"}]},
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Run an adaptive multi-turn Chatwoot webhook loop. Autonomous mode uses "
            "an AI planner to read each real assistant reply and generate the next user turn."
        )
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
        "--mode",
        choices=("autonomous", "manual"),
        default=DEFAULT_MODE,
        help="Autonomous QA loop or manual operator-driven loop.",
    )
    parser.add_argument(
        "--max-user-turns",
        type=int,
        default=DEFAULT_MAX_USER_TURNS,
        help="Maximum user turns per case, including the opener.",
    )
    parser.add_argument(
        "--planner-backend",
        choices=("heuristic", "codex-cli", "openai-compatible"),
        default=DEFAULT_PLANNER_BACKEND,
        help="How to generate the next user turn in autonomous mode.",
    )
    parser.add_argument(
        "--planner-model",
        default=DEFAULT_PLANNER_MODEL,
        help="Codex model used when --planner-backend=codex-cli.",
    )
    parser.add_argument(
        "--planner-timeout-seconds",
        type=float,
        default=DEFAULT_PLANNER_TIMEOUT_SECONDS,
        help="Timeout for each Codex planner call.",
    )
    parser.add_argument(
        "--planner-guidance-file",
        default=str(DEFAULT_PLANNER_GUIDANCE_FILE),
        help="Markdown file loaded into the Codex planner prompt on every turn.",
    )
    parser.add_argument(
        "--healthcheck-url",
        default="http://localhost:3000/health",
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


def unique_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        if value in seen:
            continue
        output.append(value)
        seen.add(value)
    return output


def extract_payment_link(text: str) -> str:
    markdown_match = re.search(r"\((https?://[^\s)]+)\)", text)
    if markdown_match:
        return markdown_match.group(1)
    for candidate in PAYMENT_LINK_PATTERN.findall(text):
        cleaned = candidate.rstrip(").,")
        if "payment" in cleaned.lower() or "/pm?" in cleaned.lower():
            return cleaned
    return ""


def extract_booking_code(text: str) -> str:
    match = BOOKING_CODE_PATTERN.search(text)
    return match.group(1).upper() if match else ""


def extract_ticket_code(text: str) -> str:
    match = TICKET_CODE_PATTERN.search(text)
    return match.group(1).upper() if match else ""


def extract_times(text: str) -> list[str]:
    return unique_preserve_order(TIME_PATTERN.findall(text))


def extract_seats(text: str) -> list[str]:
    seats = [seat.upper() for seat in SEAT_PATTERN.findall(text)]
    return unique_preserve_order(
        [seat for seat in seats if seat not in {"3049", "79"} and not seat.startswith("20")]
    )


def contains_any(text: str, patterns: tuple[str, ...]) -> bool:
    lowered = normalize_space(text).lower()
    return any(pattern in lowered for pattern in patterns)


def load_guidance_text(guidance_file: str) -> str:
    return Path(guidance_file).expanduser().resolve().read_text(encoding="utf-8")


def build_autonomous_state(
    *,
    suite: dict[str, Any],
    case: dict[str, Any],
    merged: dict[str, Any],
    opener: str,
) -> dict[str, Any]:
    metadata = case.get("metadata") if isinstance(case.get("metadata"), dict) else {}
    source_trace = (
        suite.get("source_trace") if isinstance(suite.get("source_trace"), dict) else {}
    )
    contact = merged.get("contact") if isinstance(merged.get("contact"), dict) else {}
    preferred_times = metadata.get("preferred_times")
    if not isinstance(preferred_times, list):
        preferred_times = []
    return {
        "operator_name": str(metadata.get("operator_name") or source_trace.get("operator_name") or ""),
        "company_id": str(metadata.get("company_id") or source_trace.get("company_id") or ""),
        "departure_date": str(metadata.get("departure_date") or ""),
        "origin": str(metadata.get("origin") or ""),
        "destination": str(metadata.get("destination") or ""),
        "route_name": str(metadata.get("route_name") or ""),
        "preferred_times": [str(value) for value in preferred_times if str(value).strip()],
        "available_times": [],
        "available_seats": [],
        "selected_time": "",
        "customer_name": str(contact.get("name") or "Khánh Thị Thiện"),
        "customer_phone": str(contact.get("phone") or "0967142713"),
        "customer_email": str(contact.get("email") or ""),
        "contact_sent": False,
        "payment_link_requested": False,
        "booking_code": "",
        "ticket_code": "",
        "payment_link": "",
        "seed_text": opener,
        "objective": str(case.get("objective") or ""),
        "case_metadata": metadata,
        "assistant_signals": [],
    }


def track_assistant_state(text: str, state: dict[str, Any]) -> None:
    payment_link = extract_payment_link(text)
    booking_code = extract_booking_code(text)
    ticket_code = extract_ticket_code(text)
    available_times = extract_times(text)
    available_seats = extract_seats(text)

    if payment_link:
        state["payment_link"] = payment_link
    if booking_code:
        state["booking_code"] = booking_code
    if ticket_code:
        state["ticket_code"] = ticket_code
    if available_times:
        state["available_times"] = available_times
        if not state.get("selected_time"):
            state["selected_time"] = available_times[0]
    if available_seats:
        state["available_seats"] = available_seats


def build_codex_planner_prompt(
    *,
    assistant_text: str,
    state: dict[str, Any],
    history: list[dict[str, str]],
    guidance_text: str,
    case: dict[str, Any],
) -> str:
    planner_state = {
        "operator_name": state.get("operator_name"),
        "company_id": state.get("company_id"),
        "departure_date": state.get("departure_date"),
        "origin": state.get("origin"),
        "destination": state.get("destination"),
        "route_name": state.get("route_name"),
        "objective": state.get("objective"),
        "preferred_times": state.get("preferred_times"),
        "selected_time": state.get("selected_time"),
        "available_times": state.get("available_times"),
        "available_seats": state.get("available_seats"),
        "customer_name": state.get("customer_name"),
        "customer_phone": state.get("customer_phone"),
        "customer_email": state.get("customer_email"),
        "contact_sent": state.get("contact_sent"),
        "payment_link_requested": state.get("payment_link_requested"),
        "booking_code": state.get("booking_code"),
        "ticket_code": state.get("ticket_code"),
        "payment_link": state.get("payment_link"),
        "seed_text": state.get("seed_text"),
        "case_metadata": state.get("case_metadata"),
    }
    transcript = [
        {"role": message.get("role"), "content": message.get("content", "")}
        for message in history[-12:]
    ]
    return (
        "You are the autonomous QA planner for a multi-turn Chatwoot webhook bus-booking test runner.\n"
        "Your job is to decide the NEXT synthetic user message only.\n"
        "Do not run commands. Do not inspect files. Do not explain.\n"
        "Return JSON only matching the schema.\n\n"
        "External guidance markdown loaded for this run:\n"
        f"{guidance_text}\n\n"
        "Rules:\n"
        "- Respond in Vietnamese when action=respond.\n"
        "- Read the real assistant reply and adapt; do not replay fixed scripted steps blindly.\n"
        "- If payment_link already exists, stop with stop_reason=payment_link_returned.\n"
        "- If booking_code or ticket_code exists but no payment link yet, ask: Gửi mình link thanh toán booking này luôn nhé.\n"
        "- If the assistant asks for contact info, send the saved customer name/phone.\n"
        "- Never ask for a payment link before the assistant has confirmed a booking, booking code, ticket code, or payment step.\n"
        "- If the assistant says there is no trip/no availability for the requested route or date, recover by asking for a nearby date, a different time, or another option that still matches the case goal.\n"
        "- Avoid repeating the exact same user message after the assistant already rejected it.\n"
        "- Do not copy a planned user turn when the latest assistant reply contradicts it; rewrite the next user message from the live reply.\n"
        "- Prefer short, concrete user turns that move the booking forward.\n"
        "- Use stop_reason starting with success: only when the booking goal is already achieved.\n"
        "- Use stop_reason starting with failure: only when the assistant has hard-failed and there is no sensible recovery.\n\n"
        f"Case JSON:\n{json.dumps(case, ensure_ascii=False, indent=2)}\n\n"
        f"Recent transcript JSON:\n{json.dumps(transcript, ensure_ascii=False, indent=2)}\n\n"
        f"Planner state JSON:\n{json.dumps(planner_state, ensure_ascii=False, indent=2)}\n\n"
        f"Latest assistant message:\n{assistant_text}\n"
    )


def recent_user_messages(history: list[dict[str, str]]) -> list[str]:
    messages: list[str] = []
    for item in history:
        if item.get("role") == "user":
            content = normalize_space(str(item.get("content") or ""))
            if content:
                messages.append(content)
    return messages


def validate_planner_decision(
    *,
    action: str,
    user_message: str | None,
    stop_reason: str | None,
    assistant_text: str,
    state: dict[str, Any],
    history: list[dict[str, str]],
) -> str | None:
    if action == "stop":
        if stop_reason:
            return None
        return "action=stop must include stop_reason."
    if action != "respond":
        return f"Unsupported action={action!r}."
    if not user_message:
        return "action=respond must include user_message."

    normalized_message = normalize_space(user_message).lower()
    latest_user_messages = recent_user_messages(history)
    if latest_user_messages and normalized_message == latest_user_messages[-1].lower():
        return "Do not repeat the exact previous user message."

    asks_payment = contains_any(normalized_message, PAYMENT_REQUEST_PATTERNS)
    has_booking_context = bool(state.get("booking_code") or state.get("ticket_code") or state.get("payment_link"))
    assistant_lowered = normalize_space(assistant_text).lower()
    assistant_has_payment_step = contains_any(assistant_lowered, PAYMENT_REQUEST_PATTERNS) and has_booking_context
    if asks_payment and not (has_booking_context or assistant_has_payment_step):
        return (
            "Do not ask for payment/payment link before the bot has confirmed booking context. "
            "Read the latest assistant reply and continue the availability/selection/contact flow instead."
        )
    return None


def terminal_stop_from_state_or_reply(
    *,
    assistant_text: str,
    state: dict[str, Any],
) -> tuple[str | None, str, str | None]:
    if state.get("payment_link"):
        return None, "payment_link_detected", "payment_link_returned"
    lowered = normalize_space(assistant_text).lower()
    if contains_any(lowered, HEURISTIC_FAILURE_PATTERNS):
        return None, "assistant_hard_failure", "failure:assistant_hard_failure"
    return None, "continue", None


def choose_next_autonomous_input_codex_cli(
    *,
    assistant_text: str,
    state: dict[str, Any],
    history: list[dict[str, str]],
    planner_model: str,
    planner_timeout_seconds: float,
    planner_guidance_file: str,
    case: dict[str, Any],
) -> tuple[str | None, str, str | None]:
    guidance_text = load_guidance_text(planner_guidance_file)
    prompt = build_codex_planner_prompt(
        assistant_text=assistant_text,
        state=state,
        history=history,
        guidance_text=guidance_text,
        case=case,
    )
    with tempfile.TemporaryDirectory(prefix="chatwoot-planner-") as temp_dir:
        temp_path = Path(temp_dir)
        schema_path = temp_path / "planner-schema.json"
        output_path = temp_path / "planner-output.json"
        schema_path.write_text(
            json.dumps(CODEX_PLANNER_SCHEMA, ensure_ascii=False, indent=2),
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
                + (result.stderr.strip() or result.stdout.strip() or f"exit={result.returncode}")
            )
        if not output_path.exists():
            raise RuntimeError("codex planner did not produce an output file")
        planner_output = json.loads(output_path.read_text(encoding="utf-8"))
    action = str(planner_output.get("action") or "").strip()
    planner_reason = str(planner_output.get("planner_reason") or "").strip() or "codex_cli_planner"
    stop_reason = planner_output.get("stop_reason")
    user_message = planner_output.get("user_message")
    stop_reason = str(stop_reason).strip() if isinstance(stop_reason, str) and str(stop_reason).strip() else None
    user_message = (
        normalize_space(str(user_message))
        if isinstance(user_message, str) and normalize_space(str(user_message))
        else None
    )
    if action == "stop":
        return None, planner_reason, stop_reason or "codex_cli_stop"
    if action == "respond" and user_message:
        validation_error = validate_planner_decision(
            action=action,
            user_message=user_message,
            stop_reason=stop_reason,
            assistant_text=assistant_text,
            state=state,
            history=history,
        )
        if validation_error:
            raise RuntimeError(f"codex planner output rejected: {validation_error}")
        return user_message, planner_reason, None
    raise RuntimeError(f"codex planner returned invalid payload: {planner_output}")


def extract_json_object(text: str) -> dict[str, Any]:
    candidate = text.strip()
    try:
        payload = json.loads(candidate)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        pass
    start = candidate.find("{")
    end = candidate.rfind("}")
    if start >= 0 and end > start:
        payload = json.loads(candidate[start : end + 1])
        if isinstance(payload, dict):
            return payload
    raise RuntimeError("AI planner did not return a JSON object.")


def openai_chat_completions_url(base_url: str) -> str:
    base = (base_url or "https://api.openai.com/v1").rstrip("/")
    if base.endswith("/chat/completions"):
        return base
    return f"{base}/chat/completions"


def choose_next_autonomous_input_openai_compatible(
    *,
    assistant_text: str,
    state: dict[str, Any],
    history: list[dict[str, str]],
    planner_model: str,
    planner_timeout_seconds: float,
    planner_guidance_file: str,
    case: dict[str, Any],
) -> tuple[str | None, str, str | None]:
    api_key = os.getenv("CHATWOOT_PLANNER_OPENAI_API_KEY", "").strip()
    model = (os.getenv("CHATWOOT_PLANNER_OPENAI_MODEL", "").strip() or planner_model).strip()
    base_url = os.getenv("CHATWOOT_PLANNER_OPENAI_BASE_URL", "").strip() or "https://api.openai.com/v1"
    if not api_key:
        raise RuntimeError("missing CHATWOOT_PLANNER_OPENAI_API_KEY")
    if not model:
        raise RuntimeError("missing planner model")

    guidance_text = load_guidance_text(planner_guidance_file)
    base_prompt = build_codex_planner_prompt(
        assistant_text=assistant_text,
        state=state,
        history=history,
        guidance_text=guidance_text,
        case=case,
    )
    system_prompt = (
        "You are the AI planner inside a Chatwoot UAT test runner. "
        "Read the latest real bot reply and transcript, then decide only the next synthetic user message. "
        "Never ask for a payment link unless the bot has already confirmed a booking, booking code, ticket code, or payment step. "
        "If the bot says the requested date/route has no trip, adapt by asking for an available nearby date or choosing a sensible next date from the case goal. "
        "Do not copy a canned planned step if the latest bot reply contradicts it. "
        "Avoid repeating the same user message twice. Return JSON only."
    )
    validation_error: str | None = None
    for attempt in range(2):
        prompt = base_prompt
        if validation_error:
            prompt = (
                f"{base_prompt}\n\n"
                "Runtime validation rejected your previous planner output:\n"
                f"{validation_error}\n\n"
                "Return a corrected JSON object. Ground the user_message in the latest assistant reply."
            )
        body = {
            "model": model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
        }
        request = urllib.request.Request(
            openai_chat_completions_url(base_url),
            data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=max(10.0, planner_timeout_seconds)) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:1200]
            raise RuntimeError(f"AI planner HTTP {error.code}: {detail}") from error
        except urllib.error.URLError as error:
            raise RuntimeError(f"AI planner request failed: {error.reason}") from error

        content = (
            ((payload.get("choices") or [{}])[0].get("message") or {}).get("content")
            or (payload.get("choices") or [{}])[0].get("text")
            or payload.get("output_text")
            or ""
        )
        planner_output = extract_json_object(str(content))
        action = str(planner_output.get("action") or "").strip()
        planner_reason = str(planner_output.get("planner_reason") or "").strip() or "openai_compatible_planner"
        stop_reason = planner_output.get("stop_reason")
        user_message = planner_output.get("user_message")
        stop_reason = str(stop_reason).strip() if isinstance(stop_reason, str) and str(stop_reason).strip() else None
        user_message = (
            normalize_space(str(user_message))
            if isinstance(user_message, str) and normalize_space(str(user_message))
            else None
        )
        if action == "stop":
            return None, planner_reason, stop_reason or "openai_compatible_stop"
        validation_error = validate_planner_decision(
            action=action,
            user_message=user_message,
            stop_reason=stop_reason,
            assistant_text=assistant_text,
            state=state,
            history=history,
        )
        if not validation_error and action == "respond" and user_message:
            return user_message, planner_reason, None
        if attempt == 0:
            continue
    raise RuntimeError(f"AI planner output rejected: {validation_error or 'invalid payload'}")


def choose_next_autonomous_input_heuristic(
    *,
    assistant_text: str,
    state: dict[str, Any],
) -> tuple[str | None, str, str | None]:
    lowered = normalize_space(assistant_text).lower()
    if state.get("payment_link"):
        return None, "payment_link_detected", "payment_link_returned"
    if contains_any(lowered, HEURISTIC_FAILURE_PATTERNS):
        return None, "assistant_hard_failure", "failure:assistant_hard_failure"
    if state.get("booking_code") or state.get("ticket_code"):
        state["payment_link_requested"] = True
        return "Gửi mình link thanh toán booking này luôn nhé.", "payment_link_follow_up", None
    if contains_any(lowered, CONTACT_PATTERNS):
        state["contact_sent"] = True
        name = state.get("customer_name") or "Khánh Thị Thiện"
        phone = state.get("customer_phone") or "0967142713"
        if state.get("customer_email"):
            return (
                f"Em tên {name}, số điện thoại {phone}, email {state['customer_email']} ạ.",
                "contact_follow_up",
                None,
            )
        return f"Em tên {name}, số điện thoại {phone} ạ.", "contact_follow_up", None
    if contains_any(lowered, PAYMENT_REQUEST_PATTERNS):
        state["payment_link_requested"] = True
        return "Anh/chị gửi em link thanh toán để em chốt booking nhé.", "payment_link_nudge", None
    return (
        "Anh/chị chọn giúp em phương án phù hợp nhất để đi tiếp và nếu tạo booking xong thì gửi em link thanh toán nhé.",
        "generic_booking_nudge",
        None,
    )


def choose_next_autonomous_input(
    *,
    assistant_text: str,
    state: dict[str, Any],
    history: list[dict[str, str]],
    planner_backend: str,
    planner_model: str,
    planner_timeout_seconds: float,
    planner_guidance_file: str,
    case: dict[str, Any],
) -> tuple[str | None, str, str | None]:
    terminal_message, terminal_reason, terminal_stop = terminal_stop_from_state_or_reply(
        assistant_text=assistant_text,
        state=state,
    )
    if terminal_stop:
        return terminal_message, terminal_reason, terminal_stop
    if planner_backend == "openai-compatible":
        try:
            return choose_next_autonomous_input_openai_compatible(
                assistant_text=assistant_text,
                state=state,
                history=history,
                planner_model=planner_model,
                planner_timeout_seconds=planner_timeout_seconds,
                planner_guidance_file=planner_guidance_file,
                case=case,
            )
        except Exception as error:
            print(f"[planner openai-compatible] failed without heuristic spam fallback: {error}")
            return None, f"openai_compatible_planner_failed:{error}", "failure:planner_ai_failed"
    if planner_backend == "codex-cli":
        try:
            return choose_next_autonomous_input_codex_cli(
                assistant_text=assistant_text,
                state=state,
                history=history,
                planner_model=planner_model,
                planner_timeout_seconds=planner_timeout_seconds,
                planner_guidance_file=planner_guidance_file,
                case=case,
            )
        except Exception as error:
            print(f"[planner codex-cli] failed without heuristic spam fallback: {error}")
            return None, f"codex_cli_planner_failed:{error}", "failure:planner_ai_failed"
    heuristic_message, heuristic_reason, heuristic_stop = choose_next_autonomous_input_heuristic(
        assistant_text=assistant_text,
        state=state,
    )
    return heuristic_message, heuristic_reason, heuristic_stop


def prompt_next_input(case_id: str, turn_index: int) -> str:
    print(
        f"[{case_id} turn {turn_index}] next user input "
        "(`/done` booking succeeded, `/stop` stop case, blank line to stop):"
    )
    try:
        return input("> ").strip()
    except EOFError:
        return "/stop"


def case_opening_prompt(merged: dict[str, Any], case_id: str) -> str:
    opening_prompt = normalize_space(str(merged.get("opening_prompt") or ""))
    if opening_prompt:
        return opening_prompt
    steps = merged.get("steps")
    if isinstance(steps, list):
        for step in steps:
            if isinstance(step, dict):
                prompt = normalize_space(str(step.get("prompt") or ""))
                if prompt:
                    return prompt
    raise RunnerError(f"Case {case_id} must define opening_prompt or at least one step prompt.")


def build_report(
    *,
    suite: dict[str, Any],
    args: argparse.Namespace,
    suite_file: Path,
    runtime: Any,
    results: list[dict[str, Any]],
) -> dict[str, Any]:
    defaults = suite.get("defaults") if isinstance(suite.get("defaults"), dict) else {}
    return {
        "run_mode": f"{args.mode}-adaptive-multi-turn",
        "suite_name": str(suite.get("suite_name") or suite_file.stem),
        "generated_at": suite.get("generated_at"),
        "run_generated_at": datetime.now(timezone.utc).isoformat(),
        "goal_summary": suite.get("goal_summary"),
        "suite_file": str(suite_file),
        "planner_backend": args.planner_backend if args.mode == "autonomous" else None,
        "planner_model": args.planner_model if args.mode == "autonomous" else None,
        "planner_guidance_file": (
            str(Path(args.planner_guidance_file).expanduser().resolve())
            if args.mode == "autonomous"
            else None
        ),
        "runtime": {
            "webhook_url": runtime.webhook_url,
            "chatwoot_api_base": runtime.chatwoot_api_base,
            "account_id": runtime.account_id,
            "chat_ui_mode": defaults.get("chat_ui_mode") or args.chat_ui_mode,
            "ui_inbox_id": defaults.get("ui_inbox_id", args.ui_inbox_id),
            "pinned_conversation_id": defaults.get(
                "pinned_conversation_id",
                args.pinned_conversation_id,
            ),
            "reply_timeout_seconds": args.reply_timeout_seconds or DEFAULT_REPLY_TIMEOUT_SECONDS,
            "reply_settle_seconds": args.reply_settle_seconds or DEFAULT_REPLY_SETTLE_SECONDS,
            "poll_interval_seconds": args.poll_interval_seconds or DEFAULT_POLL_INTERVAL_SECONDS,
            "max_user_turns": args.max_user_turns,
        },
        "source_trace": suite.get("source_trace") if isinstance(suite.get("source_trace"), dict) else None,
        "total_case_count": len(results),
        "success_count": count_success_results(results),
        "handoff_count": count_handoff_results(results),
        "failure_count": count_failure_results(results),
        "results": results,
    }


def write_report_files(output_file: Path, report: dict[str, Any]) -> tuple[Path, Path]:
    dump_yaml(output_file, report)
    raw_file = raw_output_path(output_file)
    raw_file.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    html_file = write_html_report(raw_file)
    return raw_file, html_file


def print_dry_run(suite: dict[str, Any], output_file: Path, mode: str) -> None:
    print(f"Suite: {suite.get('suite_name')}")
    print(f"Mode: {mode}")
    print(f"Cases: {len(suite.get('cases') or [])}")
    print(f"Would write: {display_path(output_file)}")
    for index, case in enumerate(suite.get("cases") or [], start=1):
        opener = case_opening_prompt(case, str(case.get("case_id") or index))
        print(f"- #{index} {case.get('case_id')} | {case.get('title')} | opener: {opener}")


def run_case(
    *,
    runtime: Any,
    suite: dict[str, Any],
    defaults: dict[str, Any],
    case: dict[str, Any],
    case_index: int,
    total_cases: int,
    args: argparse.Namespace,
    progress_callback: Callable[[dict[str, Any]], None] | None = None,
) -> dict[str, Any]:
    case_id = str(case.get("case_id") or f"case-{case_index:02d}")
    merged = merge_case_config(defaults, case)
    context = build_case_context(runtime, merged, case_id=case_id)
    seen_ids = initial_seen_outgoing_ids(runtime, context)
    reply_timeout_seconds = float(merged.get("reply_timeout_seconds") or DEFAULT_REPLY_TIMEOUT_SECONDS)
    reply_timeout_seconds = max(reply_timeout_seconds, MIN_REPLY_TIMEOUT_SECONDS)
    reply_settle_seconds = float(merged.get("reply_settle_seconds") or DEFAULT_REPLY_SETTLE_SECONDS)
    poll_interval_seconds = float(merged.get("poll_interval_seconds") or DEFAULT_POLL_INTERVAL_SECONDS)
    stop_patterns = [str(item) for item in merged.get("stop_regex_any", []) or [] if str(item).strip()]
    fail_patterns = [str(item) for item in merged.get("fail_regex_any", []) or [] if str(item).strip()]
    opener = case_opening_prompt(merged, case_id)
    state = build_autonomous_state(suite=suite, case=case, merged=merged, opener=opener)
    history: list[dict[str, str]] = []
    turns: list[dict[str, Any]] = []
    current_input = opener
    completed_reason = "max_user_turns_reached"
    failure_reason = "max_user_turns_reached"
    succeeded = False
    case_result = {
        "case_index": case_index,
        "case_id": case_id,
        "title": case.get("title") or case_id,
        "objective": case.get("objective"),
        "conversation_id": context.conversation_id,
        "contact_id": context.contact_id,
        "inbox_id": context.inbox_id,
        "original_inbox_id": context.original_inbox_id,
        "inbox_channel_type": context.inbox_channel_type,
        "persist_user_messages": context.persist_user_messages,
        "user_turn_count": 0,
        "succeeded": succeeded,
        "completed_reason": completed_reason,
        "failure_reason": failure_reason or None,
        "planner_backend": args.planner_backend if args.mode == "autonomous" else "manual",
        "planner_model": args.planner_model if args.mode == "autonomous" else None,
        "assistant_signals": list(state.get("assistant_signals") or []),
        "booking_code": None,
        "ticket_code": None,
        "payment_link": None,
        "handoff_detected": False,
        "handoff_labels": None,
        "handoff_detail": None,
        "wait_status": None,
        "turns": turns,
    }

    def emit_progress() -> None:
        case_result["user_turn_count"] = len(turns)
        case_result["succeeded"] = succeeded
        case_result["completed_reason"] = completed_reason
        case_result["failure_reason"] = failure_reason or None
        case_result["assistant_signals"] = list(state.get("assistant_signals") or [])
        case_result["booking_code"] = str(state.get("booking_code") or "") or None
        case_result["ticket_code"] = str(state.get("ticket_code") or "") or None
        case_result["payment_link"] = str(state.get("payment_link") or "") or None
        if progress_callback is not None:
            progress_callback(case_result)

    def first_regex_match(patterns: list[str], text: str) -> str | None:
        for pattern in patterns:
            try:
                if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
                    return pattern
            except re.error as error:
                print(f"[{case_id}] ignored invalid stop regex: {pattern} ({error})")
        return None

    def on_wait_status(status: dict[str, Any]) -> None:
        case_result["wait_status"] = status
        print(
            f"[{case_id}] waiting: elapsed={status['elapsed_seconds']}s "
            f"remaining={status['remaining_seconds']}s phase={status['phase']} "
            f"labels={status.get('labels') or []} "
            f"last={status.get('latest_message_preview') or '-'}"
        )
        emit_progress()

    print(f"[case {case_index}/{total_cases}] {case_id}: {case.get('title') or case_id}")
    print(f"[case {case_index}] conversation_id: {context.conversation_id}")
    print(f"[case {case_index}] mode: {args.mode}")
    print()

    for turn_index in range(1, args.max_user_turns + 1):
        if not current_input:
            completed_reason = "empty_user_message"
            failure_reason = "empty_user_message"
            break
        history.append({"role": "user", "content": current_input})
        print(f"[{case_id} turn {turn_index}] user: {current_input}")
        try:
            replies, assistant_text, latency_ms = post_prompt_and_wait(
                runtime,
                context,
                seen_ids,
                current_input,
                timeout_seconds=reply_timeout_seconds,
                poll_interval_seconds=poll_interval_seconds,
                settle_seconds=reply_settle_seconds,
                status_callback=on_wait_status,
            )
        except HandoffDetected as handoff:
            assistant_text = normalize_space(
                "\n\n".join(reply.content for reply in handoff.replies if reply.content.strip())
            )
            turn_result = {
                "turn_index": turn_index,
                "user_message": current_input,
                "assistant_text": assistant_text,
                "latency_ms": 0,
                "messages": [message.raw for message in handoff.replies],
                "reason": "handoff_detected",
                "handoff_labels": handoff.labels,
                "handoff_detail": handoff.detail,
            }
            turn_result = enrich_turn_with_trace_data(turn_result)
            turns.append(turn_result)
            completed_reason = "handoff_detected"
            failure_reason = ""
            case_result["handoff_detected"] = True
            case_result["handoff_labels"] = list(handoff.labels)
            case_result["handoff_detail"] = handoff.detail
            emit_progress()
            print(f"[{case_id} turn {turn_index}] handoff_detected: {handoff}")
            print()
            break
        except RunnerError as error:
            turn_result = {
                "turn_index": turn_index,
                "user_message": current_input,
                "assistant_text": "",
                "latency_ms": 0,
                "messages": [],
                "reason": str(error),
            }
            turn_result = enrich_turn_with_trace_data(turn_result)
            turns.append(turn_result)
            completed_reason = "runner_error"
            failure_reason = str(error)
            emit_progress()
            print(f"[{case_id} turn {turn_index}] runner_error: {error}")
            print()
            break
        history.append({"role": "assistant", "content": assistant_text})
        track_assistant_state(assistant_text, state)
        case_result["wait_status"] = None
        turn_result = {
            "turn_index": turn_index,
            "user_message": current_input,
            "assistant_text": assistant_text,
            "latency_ms": latency_ms,
            "messages": [message.raw for message in replies],
            "reason": "matched",
        }
        turn_result = enrich_turn_with_trace_data(turn_result)
        turns.append(turn_result)
        emit_progress()
        print(f"[{case_id} turn {turn_index}] latency_ms: {latency_ms}")
        print(f"[{case_id} turn {turn_index}] assistant: {assistant_text or '<empty>'}")

        if is_error_reply_text(assistant_text):
            turn_result["reason"] = "assistant_error_response"
            completed_reason = "assistant_error_response"
            failure_reason = "assistant_error_response"
            emit_progress()
            break
        fail_match = first_regex_match(fail_patterns, assistant_text)
        if fail_match:
            turn_result["reason"] = "failure_stop_signal"
            completed_reason = "failure_stop_signal"
            failure_reason = f"failure_stop_signal: {fail_match}"
            emit_progress()
            break
        if state.get("payment_link"):
            succeeded = True
            completed_reason = "payment_link_returned"
            failure_reason = ""
            emit_progress()
            break
        if first_regex_match(stop_patterns, assistant_text):
            succeeded = True
            completed_reason = "success_stop_signal"
            failure_reason = ""
            emit_progress()
            break

        if args.mode == "manual":
            manual_input = prompt_next_input(case_id, turn_index + 1)
            turn_result["reason"] = "manual_operator"
            emit_progress()
            if manual_input == "/done":
                succeeded = True
                completed_reason = "manual_done"
                failure_reason = ""
                emit_progress()
                break
            if not manual_input or manual_input == "/stop":
                completed_reason = "manual_stop"
                failure_reason = "manual_stop"
                emit_progress()
                break
            current_input = manual_input
            print()
            continue

        next_input, planner_reason, stop_reason = choose_next_autonomous_input(
            assistant_text=assistant_text,
            state=state,
            history=history,
            planner_backend=args.planner_backend,
            planner_model=args.planner_model,
            planner_timeout_seconds=args.planner_timeout_seconds,
            planner_guidance_file=args.planner_guidance_file,
            case=case,
        )
        state["assistant_signals"].append(planner_reason)
        turn_result["reason"] = planner_reason
        emit_progress()
        print(f"[{case_id} turn {turn_index}] planner: {planner_reason}")
        print()

        if stop_reason == "payment_link_returned":
            succeeded = True
            completed_reason = stop_reason
            failure_reason = ""
            break
        if stop_reason and stop_reason.startswith("success:"):
            succeeded = True
            completed_reason = stop_reason
            failure_reason = ""
            emit_progress()
            break
        if stop_reason:
            completed_reason = stop_reason
            failure_reason = stop_reason
            emit_progress()
            break
        current_input = next_input or ""

    booking_code = str(state.get("booking_code") or "")
    ticket_code = str(state.get("ticket_code") or "")
    payment_link = str(state.get("payment_link") or "")
    if payment_link and not succeeded:
        succeeded = True
        completed_reason = "payment_link_returned"
        failure_reason = ""
    emit_progress()

    print(
        f"[case {case_index}] completed_reason: {completed_reason}, "
        f"succeeded={succeeded}, user_turns={len(turns)}"
    )
    if payment_link:
        print(f"[case {case_index}] payment_link: {payment_link}")
    elif failure_reason:
        print(f"[case {case_index}] failure_reason: {failure_reason}")
    print()

    case_result["user_turn_count"] = len(turns)
    case_result["succeeded"] = succeeded
    case_result["completed_reason"] = completed_reason
    case_result["failure_reason"] = failure_reason or None
    case_result["assistant_signals"] = list(state.get("assistant_signals") or [])
    case_result["booking_code"] = booking_code or None
    case_result["ticket_code"] = ticket_code or None
    case_result["payment_link"] = payment_link or None
    if not completed_reason.startswith("handoff"):
        case_result["wait_status"] = None
    return case_result


def main() -> int:
    args = parse_args()
    suite_file = Path(args.suite_file).expanduser().resolve()
    suite = apply_suite_overrides(load_yaml(suite_file), args)
    output_file = (
        Path(args.output_file).expanduser().resolve()
        if args.output_file
        else default_output_path(OUTPUT_ROOT, str(suite.get("suite_name") or suite_file.stem))
    )

    if args.dry_run:
        print_dry_run(suite, output_file, args.mode)
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

    cases = suite.get("cases")
    if not isinstance(cases, list) or not cases:
        raise RunnerError("Suite must define a non-empty cases list.")

    results = []
    for index, case in enumerate(cases, start=1):
        def flush_progress(case_result: dict[str, Any]) -> None:
            partial_results = [*results, case_result]
            partial_report = build_report(
                suite=suite,
                args=args,
                suite_file=suite_file,
                runtime=runtime,
                results=partial_results,
            )
            write_report_files(output_file, partial_report)

        try:
            result = run_case(
                runtime=runtime,
                suite=suite,
                defaults=suite.get("defaults") or {},
                case=case,
                case_index=index,
                total_cases=len(cases),
                args=args,
                progress_callback=flush_progress,
            )
        except RunnerError as error:
            case_id = str(case.get("case_id") or f"case-{index:02d}")
            result = {
                "case_index": index,
                "case_id": case_id,
                "title": case.get("title") or case_id,
                "objective": case.get("objective"),
                "conversation_id": None,
                "contact_id": None,
                "inbox_id": None,
                "original_inbox_id": None,
                "inbox_channel_type": None,
                "persist_user_messages": None,
                "user_turn_count": 0,
                "succeeded": False,
                "completed_reason": "runner_error",
                "failure_reason": str(error),
                "planner_backend": args.planner_backend if args.mode == "autonomous" else "manual",
                "planner_model": args.planner_model if args.mode == "autonomous" else None,
                "assistant_signals": [],
                "booking_code": None,
                "ticket_code": None,
                "payment_link": None,
                "turns": [],
            }
            flush_progress(result)
            print(f"[case {index}/{len(cases)}] {case_id}: runner_error: {error}")
            print()
        results.append(result)
    report = build_report(
        suite=suite,
        args=args,
        suite_file=suite_file,
        runtime=runtime,
        results=results,
    )
    raw_file, _ = write_report_files(output_file, report)

    print(display_path(output_file))
    print(display_path(raw_file))
    print(display_path(raw_file.with_name(raw_file.stem.removesuffix("-raw") + ".html")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

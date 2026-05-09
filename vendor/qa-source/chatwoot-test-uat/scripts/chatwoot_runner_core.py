#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import ssl
import subprocess
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable

import yaml


DEFAULT_WEBHOOK_URL = "http://localhost:3000/webhook/chatwoot"
SKILL_NAME = "chatwoot-test-uat"
DEFAULT_SKILLS_CONFIG_PATH = Path.home() / ".skills" / "config.yml"
DEFAULT_POLL_INTERVAL_SECONDS = 2.0
DEFAULT_REPLY_TIMEOUT_SECONDS = 300.0
MIN_REPLY_TIMEOUT_SECONDS = 300.0
DEFAULT_REPLY_SETTLE_SECONDS = 3.0
DEFAULT_CHAT_UI_MODE = "realistic"
DEFAULT_BOT_ASSIGNEE_ID = 20
DEFAULT_LANGFUSE_BASE_URL = "https://langfuse.vexere.com"
DEFAULT_LANGFUSE_PROJECT_ID = "ai"
DEFAULT_STATUS_LOG_INTERVAL_SECONDS = 15.0
ERROR_REPLY_PATTERNS = (
    "i encountered an unexpected issue while processing your request",
    "i'm sorry, i encountered an error. please try again.",
    "i encountered an error while processing your request. please try again.",
    "i'm having trouble accessing the assistant configuration.",
    "i'm having trouble connecting to the service.",
)
MATCH_ALIAS_REPLACEMENTS = (
    (r"\bbd\b", "buu dien"),
    (r"\bbx\b", "ben xe"),
    (r"\bvp\b", "van phong"),
    (r"\bcn\b", "chi nhanh"),
    (r"\bsg\b", "sai gon"),
    (r"\bhn\b", "ha noi"),
)
LANGFUSE_TRACE_PEEK_RE = re.compile(
    r"https?://[^\s\"'<>]+/project/[^/]+/traces\?peek=([A-Za-z0-9-]+)"
)
LANGFUSE_TRACE_PATH_RE = re.compile(
    r"https?://[^\s\"'<>]+/project/[^/]+/traces/([A-Za-z0-9-]+)"
)
DOCKER_SETTINGS_SNIPPET = """\
import json
from config.settings import settings
print(json.dumps({
    "chatwoot_api_base": settings.CHATWOOT_API_BASE,
    "chatwoot_api_key": settings.CHATWOOT_API_KEY,
    "user_chatwoot_api_key": settings.USER_CHATWOOT_API_KEY,
    "default_account_id": settings.CHATWOOT_DEFAULT_ACCOUNT_ID,
}))
"""


class RunnerError(RuntimeError):
    pass


def skill_config_template() -> str:
    return f"""Create {DEFAULT_SKILLS_CONFIG_PATH} with:

{SKILL_NAME}:
  CHATWOOT_API_KEY: "<chatwoot-api-key>"
  USER_CHATWOOT_API_KEY: "<user-chatwoot-api-key>"

Optional values:

{SKILL_NAME}:
  CHATWOOT_API_BASE: "http://localhost:3000"
  CHATWOOT_ACCOUNT_ID: 1
  WEBHOOK_URL: "http://localhost:3000/webhook/chatwoot"
"""


class HandoffDetected(RunnerError):
    def __init__(
        self,
        conversation_id: str,
        *,
        labels: list[str] | None = None,
        detail: str | None = None,
        replies: list["ObservedMessage"] | None = None,
    ) -> None:
        self.conversation_id = conversation_id
        self.labels = list(labels or [])
        self.detail = detail
        self.replies = list(replies or [])
        label_suffix = f" labels={self.labels}" if self.labels else ""
        detail_suffix = f" detail={detail}" if detail else ""
        super().__init__(
            f"Conversation {conversation_id} entered handoff.{label_suffix}{detail_suffix}"
        )


def is_handoff_completed_reason(value: Any) -> bool:
    return str(value or "").strip().startswith("handoff")


def is_handoff_result(result: dict[str, Any] | None) -> bool:
    if not isinstance(result, dict):
        return False
    return is_handoff_completed_reason(result.get("completed_reason"))


def count_success_results(results: list[dict[str, Any]]) -> int:
    return sum(1 for result in results if result.get("succeeded"))


def count_handoff_results(results: list[dict[str, Any]]) -> int:
    return sum(1 for result in results if is_handoff_result(result))


def count_failure_results(results: list[dict[str, Any]]) -> int:
    return sum(
        1
        for result in results
        if not result.get("succeeded") and not is_handoff_result(result)
    )


@dataclass
class RuntimeConfig:
    chatwoot_api_base: str
    chatwoot_api_key: str
    account_id: int
    webhook_url: str = DEFAULT_WEBHOOK_URL
    user_chatwoot_api_key: str | None = None


def _labels_api_key(runtime: RuntimeConfig) -> str:
    return runtime.user_chatwoot_api_key or runtime.chatwoot_api_key


def update_conversation_labels(
    runtime: RuntimeConfig,
    *,
    conversation_id: str,
    labels: list[str],
) -> None:
    normalized_labels = [str(label).strip() for label in labels if str(label).strip()]
    if not conversation_id or not normalized_labels:
        return
    chatwoot_request(
        runtime,
        f"/api/v1/accounts/{runtime.account_id}/conversations/{conversation_id}/labels",
        method="POST",
        payload={"labels": normalized_labels},
        api_key_override=_labels_api_key(runtime),
    )


def assign_conversation_to_assignee(
    runtime: RuntimeConfig,
    *,
    conversation_id: str,
    assignee_id: int,
) -> None:
    if not conversation_id:
        return
    chatwoot_request(
        runtime,
        f"/api/v1/accounts/{runtime.account_id}/conversations/{conversation_id}/assignments",
        method="POST",
        payload={"assignee_id": int(assignee_id)},
    )


def ensure_conversation_routing(
    runtime: RuntimeConfig,
    *,
    conversation_id: str,
    labels: list[str] | None,
    assignee_name: str,
) -> None:
    normalized_labels = [str(label).strip() for label in (labels or []) if str(label).strip()]
    if normalized_labels:
        update_conversation_labels(
            runtime,
            conversation_id=conversation_id,
            labels=normalized_labels,
        )
    if assignee_name.strip().lower() == "bot":
        assign_conversation_to_assignee(
            runtime,
            conversation_id=conversation_id,
            assignee_id=DEFAULT_BOT_ASSIGNEE_ID,
        )


@dataclass
class ConversationContext:
    account_id: int
    conversation_id: str
    contact_id: str
    contact_name: str
    inbox_id: int
    original_inbox_id: int | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    additional_attributes: dict[str, Any] | None = None
    labels: list[str] | None = None
    assignee_name: str = "Bot"
    captain_assistant_id: int | None = None
    inbox_name: str | None = None
    source_id: str | None = None
    inbox_channel_type: str | None = None
    persist_user_messages: bool = False


@dataclass
class ObservedMessage:
    id: str
    content: str
    message_type: str | int | None
    private: bool
    created_at: Any
    raw: dict[str, Any]


@dataclass
class ConversationPollState:
    messages: list[ObservedMessage]
    labels: list[str]
    assignee_name: str | None
    latest_message_id: str | None
    latest_message_preview: str | None


def unique_preserve_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    output: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        output.append(value)
    return output


def normalize_space(text: str) -> str:
    return re.sub(r"\s+", " ", str(text or "")).strip()


def normalize_match_text(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(text or ""))
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = normalized.replace("đ", "d").replace("Đ", "D")
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9]+", " ", normalized)
    normalized = normalize_space(normalized)
    for pattern, replacement in MATCH_ALIAS_REPLACEMENTS:
        normalized = re.sub(pattern, replacement, normalized)
    return normalize_space(normalized)


def langfuse_base_url() -> str:
    return _clean(os.getenv("LANGFUSE_BASE_URL") or os.getenv("LANGFUSE_HOST")) or DEFAULT_LANGFUSE_BASE_URL


def langfuse_project_id() -> str:
    return _clean(os.getenv("LANGFUSE_PROJECT_ID")) or DEFAULT_LANGFUSE_PROJECT_ID


def build_langfuse_trace_url(langfuse_trace_id: str | None) -> str | None:
    trace_id = _clean(langfuse_trace_id)
    if not trace_id:
        return None
    return (
        f"{langfuse_base_url().rstrip('/')}/project/"
        f"{langfuse_project_id().strip('/')}/traces?peek={trace_id}"
    )


def extract_langfuse_trace_id_from_url(url: str) -> str | None:
    for pattern in (LANGFUSE_TRACE_PEEK_RE, LANGFUSE_TRACE_PATH_RE):
        match = pattern.search(url)
        if match:
            return match.group(1)
    return None


def _collect_urls(value: Any, output: list[str]) -> None:
    if isinstance(value, str):
        for url in re.findall(r"https?://[^\s\"'<>]+", value):
            output.append(url.rstrip("),."))
        return
    if isinstance(value, dict):
        for nested in value.values():
            _collect_urls(nested, output)
        return
    if isinstance(value, list):
        for nested in value:
            _collect_urls(nested, output)


def extract_message_trace_metadata(message: dict[str, Any]) -> dict[str, Any]:
    trace_ids: list[str] = []
    langfuse_trace_ids: list[str] = []
    for source in (
        message,
        message.get("additional_attributes"),
        message.get("content_attributes"),
    ):
        if not isinstance(source, dict):
            continue
        trace_id = _clean(source.get("trace_id"))
        langfuse_trace_id = _clean(source.get("langfuse_trace_id"))
        if trace_id:
            trace_ids.append(trace_id)
        if langfuse_trace_id:
            langfuse_trace_ids.append(langfuse_trace_id)

    urls: list[str] = []
    _collect_urls(message, urls)
    for url in unique_preserve_order(urls):
        trace_id = extract_langfuse_trace_id_from_url(url)
        if not trace_id:
            continue
        langfuse_trace_ids.append(trace_id)

    trace_ids = unique_preserve_order([value for value in trace_ids if value])
    langfuse_trace_ids = unique_preserve_order(
        [value for value in langfuse_trace_ids if value]
    )

    langfuse_trace_urls: list[str] = []
    for trace_id in langfuse_trace_ids:
        built_url = build_langfuse_trace_url(trace_id)
        if built_url:
            langfuse_trace_urls.append(built_url)
    langfuse_trace_urls = unique_preserve_order([value for value in langfuse_trace_urls if value])

    return {
        "message_id": _clean(message.get("id")),
        "trace_id": trace_ids[0] if trace_ids else None,
        "trace_ids": trace_ids,
        "langfuse_trace_id": (
            langfuse_trace_ids[0] if langfuse_trace_ids else None
        ),
        "langfuse_trace_ids": langfuse_trace_ids,
        "langfuse_trace_url": (
            langfuse_trace_urls[0] if langfuse_trace_urls else None
        ),
        "langfuse_trace_urls": langfuse_trace_urls,
        "view_log_url": langfuse_trace_urls[0] if langfuse_trace_urls else None,
        "view_log_urls": langfuse_trace_urls,
    }


def enrich_message_with_trace_data(message: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(message)
    metadata = extract_message_trace_metadata(enriched)
    for key, value in metadata.items():
        if value in (None, [], ""):
            continue
        enriched[key] = value
    return enriched


def enrich_turn_with_trace_data(turn: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(turn)
    raw_messages = enriched.get("messages")
    if not isinstance(raw_messages, list) or not raw_messages:
        return enriched

    enriched_messages = [
        enrich_message_with_trace_data(raw_message)
        if isinstance(raw_message, dict)
        else raw_message
        for raw_message in raw_messages
    ]
    enriched["messages"] = enriched_messages

    trace_ids: list[str] = []
    langfuse_trace_ids: list[str] = []
    langfuse_trace_urls: list[str] = []
    message_trace_details: list[dict[str, Any]] = []

    for enriched_message in enriched_messages:
        if not isinstance(enriched_message, dict):
            continue
        detail = extract_message_trace_metadata(enriched_message)
        detail_has_trace = any(
            detail.get(key)
            for key in (
                "trace_id",
                "langfuse_trace_id",
                "langfuse_trace_url",
                "view_log_url",
            )
        )
        if not detail_has_trace:
            continue
        message_trace_details.append(detail)
        trace_ids.extend(detail.get("trace_ids") or [])
        langfuse_trace_ids.extend(detail.get("langfuse_trace_ids") or [])
        langfuse_trace_urls.extend(detail.get("langfuse_trace_urls") or [])

    trace_ids = unique_preserve_order([value for value in trace_ids if value])
    langfuse_trace_ids = unique_preserve_order(
        [value for value in langfuse_trace_ids if value]
    )
    langfuse_trace_urls = unique_preserve_order(
        [value for value in langfuse_trace_urls if value]
    )

    if trace_ids:
        enriched["trace_id"] = trace_ids[0]
        enriched["trace_ids"] = trace_ids
    if langfuse_trace_ids:
        enriched["langfuse_trace_id"] = langfuse_trace_ids[0]
        enriched["langfuse_trace_ids"] = langfuse_trace_ids
    if langfuse_trace_urls:
        enriched["langfuse_trace_url"] = langfuse_trace_urls[0]
        enriched["langfuse_trace_urls"] = langfuse_trace_urls
        enriched["view_log_url"] = langfuse_trace_urls[0]
        enriched["view_log_urls"] = langfuse_trace_urls
    if message_trace_details:
        enriched["message_trace_details"] = message_trace_details
    return enriched


def _chatwoot_ssl_context() -> ssl.SSLContext | None:
    if os.getenv("CHATWOOT_TEST_INSECURE_SSL", "").strip().lower() not in {"1", "true", "yes", "on"}:
        return None
    return ssl._create_unverified_context()


def load_yaml(path: Path) -> dict[str, Any]:
    payload = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RunnerError(f"Expected YAML object in {path}")
    return payload


def dump_yaml(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(
        yaml.safe_dump(payload, allow_unicode=True, sort_keys=False),
        encoding="utf-8",
    )


def load_skill_config(path: Path | None = None) -> dict[str, Any]:
    path = path or DEFAULT_SKILLS_CONFIG_PATH
    if not path.exists():
        return {}
    payload = load_yaml(path)
    section = payload.get(SKILL_NAME)
    if section is None:
        return {}
    if not isinstance(section, dict):
        raise RunnerError(
            f"Expected YAML object at section {SKILL_NAME!r} in {path}.\n\n"
            f"{skill_config_template()}"
        )
    return section


def _skill_config_value(config: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = _clean(config.get(key))
        if value:
            return value
    return None


def _skill_config_int(config: dict[str, Any], *keys: str) -> int | None:
    value = _skill_config_value(config, *keys)
    if value is None:
        return None
    try:
        return int(value)
    except ValueError as error:
        raise RunnerError(
            f"Expected integer for one of {', '.join(keys)} in {DEFAULT_SKILLS_CONFIG_PATH}, "
            f"got {value!r}."
        ) from error


def resolve_runtime_config(
    *,
    chatwoot_api_base: str | None,
    chatwoot_api_key: str | None,
    user_chatwoot_api_key: str | None,
    account_id: int | None,
    webhook_url: str | None,
    docker_compose_command: str,
) -> RuntimeConfig:
    skill_config = load_skill_config()
    resolved_base = _clean(chatwoot_api_base) or _skill_config_value(
        skill_config,
        "CHATWOOT_API_BASE",
        "chatwoot_api_base",
        "api_base",
    )
    resolved_key = _clean(chatwoot_api_key) or _skill_config_value(
        skill_config,
        "CHATWOOT_API_KEY",
        "chatwoot_api_key",
    )
    resolved_user_key = _clean(user_chatwoot_api_key) or _skill_config_value(
        skill_config,
        "USER_CHATWOOT_API_KEY",
        "user_chatwoot_api_key",
    )
    resolved_account = account_id
    if resolved_account is None:
        resolved_account = _skill_config_int(
            skill_config,
            "CHATWOOT_ACCOUNT_ID",
            "CHATWOOT_DEFAULT_ACCOUNT_ID",
            "account_id",
            "default_account_id",
        )
    resolved_webhook_url = _clean(webhook_url) or _skill_config_value(
        skill_config,
        "WEBHOOK_URL",
        "webhook_url",
    )

    docker_probe_error: RunnerError | None = None
    if not (resolved_base and resolved_key and resolved_account is not None):
        try:
            docker_payload = _probe_server_settings(docker_compose_command)
        except RunnerError as error:
            docker_probe_error = error
        else:
            resolved_base = resolved_base or _clean(docker_payload.get("chatwoot_api_base"))
            resolved_key = resolved_key or _clean(docker_payload.get("chatwoot_api_key"))
            resolved_user_key = resolved_user_key or _clean(
                docker_payload.get("user_chatwoot_api_key")
            )
            if resolved_account is None and docker_payload.get("default_account_id") not in (None, ""):
                resolved_account = int(docker_payload["default_account_id"])

    fallback_detail = (
        f"\n\nDocker fallback also failed: {docker_probe_error}"
        if docker_probe_error is not None
        else ""
    )

    if not resolved_base:
        raise RunnerError(
            "Could not resolve CHATWOOT_API_BASE.\n\n"
            f"{skill_config_template()}{fallback_detail}"
        )
    if not resolved_key:
        raise RunnerError(
            "Could not resolve CHATWOOT_API_KEY.\n\n"
            f"{skill_config_template()}{fallback_detail}"
        )
    if resolved_account is None:
        raise RunnerError(
            "Could not resolve Chatwoot account_id.\n\n"
            f"{skill_config_template()}{fallback_detail}"
        )

    return RuntimeConfig(
        chatwoot_api_base=resolved_base.rstrip("/"),
        chatwoot_api_key=resolved_key,
        user_chatwoot_api_key=resolved_user_key,
        account_id=int(resolved_account),
        webhook_url=resolved_webhook_url or DEFAULT_WEBHOOK_URL,
    )


def _probe_server_settings(docker_compose_command: str) -> dict[str, Any]:
    command = docker_compose_command.split()
    result = subprocess.run(
        [
            *command,
            "exec",
            "-T",
            "server",
            "/app/.venv/bin/python",
            "-c",
            DOCKER_SETTINGS_SNIPPET,
        ],
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RunnerError(
            "Failed to probe Chatwoot settings from docker server: "
            + (result.stderr.strip() or result.stdout.strip() or str(result.returncode))
        )
    try:
        payload = json.loads(result.stdout.strip())
    except json.JSONDecodeError as exc:
        raise RunnerError("Docker settings probe returned invalid JSON.") from exc
    if not isinstance(payload, dict):
        raise RunnerError("Docker settings probe returned a non-object payload.")
    return payload


def create_conversation(
    runtime: RuntimeConfig,
    *,
    inbox_id: int,
    contact_name: str,
    contact_phone: str | None,
    contact_email: str | None,
    additional_attributes: dict[str, Any] | None = None,
    labels: list[str] | None = None,
    assignee_name: str = "Bot",
    captain_assistant_id: int | None = None,
) -> ConversationContext:
    identifier = f"chatwoot-test-{uuid.uuid4().hex[:12]}"
    contact_payload = {
        "inbox_id": inbox_id,
        "name": contact_name,
        "identifier": identifier,
        "additional_attributes": additional_attributes or {},
    }
    if contact_phone:
        contact_payload["phone_number"] = contact_phone
    if contact_email:
        contact_payload["email"] = contact_email
    contact_response = chatwoot_request(
        runtime,
        f"/api/v1/accounts/{runtime.account_id}/contacts",
        method="POST",
        payload=contact_payload,
    )
    contact_payload = _unwrap_payload(contact_response)
    contact_id = _extract_contact_id(contact_payload)
    source_id = _extract_source_id(contact_payload, inbox_id)
    if not contact_id or not source_id:
        raise RunnerError("Failed to create Chatwoot contact with usable source_id.")

    conversation_response = chatwoot_request(
        runtime,
        f"/api/v1/accounts/{runtime.account_id}/conversations",
        method="POST",
        payload={
            "source_id": source_id,
            "inbox_id": inbox_id,
            "contact_id": contact_id,
            "status": "open",
            "additional_attributes": {"chat_id": int(source_id)} if str(source_id).isdigit() else {},
        },
    )
    conversation_payload = _unwrap_payload(conversation_response)
    conversation_id = _clean(conversation_payload.get("id")) or _clean(
        conversation_payload.get("conversation_id")
    )
    if not conversation_id:
        raise RunnerError("Failed to create Chatwoot conversation.")
    ensure_conversation_routing(
        runtime,
        conversation_id=conversation_id,
        labels=labels if labels is not None else ["ai"],
        assignee_name=assignee_name,
    )
    inbox_payload = conversation_payload.get("inbox") if isinstance(conversation_payload, dict) else None
    inbox_name = None
    inbox_channel_type = None
    if isinstance(inbox_payload, dict):
        inbox_name = _clean(inbox_payload.get("name"))
        inbox_channel_type = _clean(inbox_payload.get("channel_type"))

    return ConversationContext(
        account_id=runtime.account_id,
        conversation_id=conversation_id,
        contact_id=contact_id,
        contact_name=contact_name,
        original_inbox_id=inbox_id,
        contact_phone=contact_phone,
        contact_email=contact_email,
        additional_attributes=additional_attributes or {},
        inbox_id=inbox_id,
        labels=labels if labels is not None else ["ai"],
        assignee_name=assignee_name,
        captain_assistant_id=captain_assistant_id,
        inbox_name=inbox_name,
        source_id=source_id,
        inbox_channel_type=inbox_channel_type,
    )


def create_conversation_from_existing_contact(
    runtime: RuntimeConfig,
    *,
    inbox_id: int,
    contact_id: str,
    source_id: str,
    contact_name: str,
    contact_phone: str | None,
    contact_email: str | None,
    additional_attributes: dict[str, Any] | None = None,
    labels: list[str] | None = None,
    assignee_name: str = "Bot",
    captain_assistant_id: int | None = None,
) -> ConversationContext:
    conversation_response = chatwoot_request(
        runtime,
        f"/api/v1/accounts/{runtime.account_id}/conversations",
        method="POST",
        payload={
            "source_id": source_id,
            "inbox_id": inbox_id,
            "contact_id": contact_id,
            "status": "open",
        },
    )
    conversation_payload = _unwrap_payload(conversation_response)
    conversation_id = _clean(conversation_payload.get("id")) or _clean(
        conversation_payload.get("conversation_id")
    )
    if not conversation_id:
        raise RunnerError("Failed to create Chatwoot conversation from existing contact.")
    ensure_conversation_routing(
        runtime,
        conversation_id=conversation_id,
        labels=labels if labels is not None else ["ai"],
        assignee_name=assignee_name,
    )

    inbox_payload = conversation_payload.get("inbox") if isinstance(conversation_payload, dict) else None
    inbox_name = None
    if isinstance(inbox_payload, dict):
        inbox_name = _clean(inbox_payload.get("name"))

    return ConversationContext(
        account_id=runtime.account_id,
        conversation_id=conversation_id,
        contact_id=contact_id,
        contact_name=contact_name,
        original_inbox_id=inbox_id,
        contact_phone=contact_phone,
        contact_email=contact_email,
        additional_attributes=additional_attributes or {},
        inbox_id=inbox_id,
        labels=labels if labels is not None else ["ai"],
        assignee_name=assignee_name,
        captain_assistant_id=captain_assistant_id,
        inbox_name=inbox_name,
        source_id=source_id,
        inbox_channel_type=_clean((inbox_payload or {}).get("channel_type")) if isinstance(inbox_payload, dict) else None,
    )


def chatwoot_request(
    runtime: RuntimeConfig,
    path: str,
    *,
    method: str = "GET",
    payload: dict[str, Any] | None = None,
    api_key_override: str | None = None,
) -> dict[str, Any]:
    url = f"{runtime.chatwoot_api_base}{path}"
    body = None
    ssl_context = _chatwoot_ssl_context()
    headers = {
        "Content-Type": "application/json",
        "api_access_token": api_key_override or runtime.chatwoot_api_key,
    }
    if payload is not None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(url, data=body, headers=headers, method=method.upper())
    try:
        with urllib.request.urlopen(request, timeout=20, context=ssl_context) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RunnerError(f"Chatwoot {method} {path} failed: HTTP {error.code} - {detail}") from error
    except urllib.error.URLError as error:
        raise RunnerError(f"Chatwoot {method} {path} failed: {error.reason}") from error


def post_webhook(runtime: RuntimeConfig, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        runtime.webhook_url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RunnerError(f"Webhook post failed: HTTP {error.code} - {detail}") from error
    except urllib.error.URLError as error:
        raise RunnerError(f"Webhook post failed: {error.reason}") from error


def list_inboxes(runtime: RuntimeConfig) -> list[dict[str, Any]]:
    payload = chatwoot_request(
        runtime,
        f"/api/v1/accounts/{runtime.account_id}/inboxes",
    )
    inboxes = payload.get("payload") if isinstance(payload, dict) else None
    if not isinstance(inboxes, list):
        return []
    return [item for item in inboxes if isinstance(item, dict)]


def get_conversation(runtime: RuntimeConfig, conversation_id: str) -> dict[str, Any]:
    payload = chatwoot_request(
        runtime,
        f"/api/v1/accounts/{runtime.account_id}/conversations/{conversation_id}",
    )
    normalized = _unwrap_payload(payload)
    if not isinstance(normalized, dict):
        raise RunnerError(f"Conversation {conversation_id} returned an invalid payload.")
    return normalized


def resolve_realistic_ui_inbox(
    runtime: RuntimeConfig,
    *,
    requested_inbox_id: int,
    explicit_ui_inbox_id: int | None = None,
) -> tuple[int, str | None, str | None]:
    inboxes = list_inboxes(runtime)
    requested_inbox: dict[str, Any] | None = None
    fallback_api_inbox: dict[str, Any] | None = None
    explicit_ui_inbox: dict[str, Any] | None = None

    for inbox in inboxes:
        inbox_id = inbox.get("id")
        channel_type = _clean(inbox.get("channel_type"))
        if explicit_ui_inbox_id is not None and inbox_id is not None and int(inbox_id) == int(explicit_ui_inbox_id):
            explicit_ui_inbox = inbox
        if inbox_id is not None and int(inbox_id) == int(requested_inbox_id):
            requested_inbox = inbox
        if fallback_api_inbox is None and channel_type == "Channel::Api":
            fallback_api_inbox = inbox

    if explicit_ui_inbox is not None:
        explicit_channel_type = _clean(explicit_ui_inbox.get("channel_type"))
        if explicit_channel_type != "Channel::Api":
            raise RunnerError(
                f"Explicit ui_inbox_id {explicit_ui_inbox_id} is "
                f"{explicit_channel_type or 'unknown'}, expected Channel::Api."
            )
        return (
            int(explicit_ui_inbox["id"]),
            _clean(explicit_ui_inbox.get("name")),
            explicit_channel_type,
        )
    if requested_inbox is not None and _clean(requested_inbox.get("channel_type")) == "Channel::Api":
        return (
            int(requested_inbox["id"]),
            _clean(requested_inbox.get("name")),
            _clean(requested_inbox.get("channel_type")),
        )
    if fallback_api_inbox is not None:
        return (
            int(fallback_api_inbox["id"]),
            _clean(fallback_api_inbox.get("name")),
            _clean(fallback_api_inbox.get("channel_type")),
        )
    requested_channel_type = _clean((requested_inbox or {}).get("channel_type"))
    raise RunnerError(
        "Realistic Chatwoot mode requires an Api inbox for visible conversation "
        f"creation, but requested inbox_id {requested_inbox_id} resolved to "
        f"{requested_channel_type or 'unknown'} and no Api inbox is available."
    )


def create_incoming_message(
    runtime: RuntimeConfig,
    context: ConversationContext,
    content: str,
) -> dict[str, Any]:
    content_attributes: dict[str, Any] = {}
    additional_attributes: dict[str, Any] = {}
    if context.captain_assistant_id is not None:
        content_attributes["captain_assistant_id"] = context.captain_assistant_id
        additional_attributes["captain_assistant_id"] = context.captain_assistant_id
    payload = chatwoot_request(
        runtime,
        f"/api/v1/accounts/{runtime.account_id}/conversations/{context.conversation_id}/messages",
        method="POST",
        payload={
            "content": content,
            "message_type": "incoming",
            "private": False,
            "content_attributes": content_attributes,
            "additional_attributes": additional_attributes,
        },
    )
    normalized = _unwrap_payload(payload)
    if not isinstance(normalized, dict):
        raise RunnerError("Failed to create Chatwoot incoming message.")
    return normalized


def build_pinned_conversation_context(
    runtime: RuntimeConfig,
    *,
    conversation_id: str,
    labels: list[str],
    assignee_name: str,
    captain_assistant_id: int | None,
) -> ConversationContext:
    payload = get_conversation(runtime, conversation_id)
    contact_inbox = payload.get("contact_inbox") if isinstance(payload.get("contact_inbox"), dict) else {}
    contact_payload = None
    if isinstance(contact_inbox, dict):
        nested_contact = contact_inbox.get("contact")
        if isinstance(nested_contact, dict):
            contact_payload = nested_contact
    if contact_payload is None:
        meta_sender = payload.get("meta", {}).get("sender") if isinstance(payload.get("meta"), dict) else None
        if isinstance(meta_sender, dict):
            contact_payload = meta_sender
    if contact_payload is None:
        contact_payload = {}

    resolved_contact_id = (
        _clean(contact_inbox.get("contact_id"))
        or _clean(contact_payload.get("id"))
    )
    resolved_inbox_id = payload.get("inbox_id")
    if resolved_inbox_id in (None, ""):
        resolved_inbox = payload.get("inbox")
        if isinstance(resolved_inbox, dict):
            resolved_inbox_id = resolved_inbox.get("id")
    if not resolved_contact_id or resolved_inbox_id in (None, ""):
        raise RunnerError(
            f"Conversation {conversation_id} is missing contact_id or inbox_id and cannot be reused."
        )

    resolved_labels = labels or list(payload.get("labels") or ["ai"])
    resolved_assignee_name = assignee_name or _clean(
        _deep_get(payload, "meta", "assignee", "name")
    ) or "Bot"
    source_id = (
        _clean(contact_inbox.get("source_id"))
        or _clean(
            _deep_get(
                payload,
                "last_non_activity_message",
                "conversation",
                "contact_inbox",
                "source_id",
            )
        )
    )
    inbox_payload = payload.get("inbox") if isinstance(payload.get("inbox"), dict) else {}
    inbox_channel_type = _clean(inbox_payload.get("channel_type"))

    return ConversationContext(
        account_id=runtime.account_id,
        conversation_id=str(conversation_id),
        contact_id=resolved_contact_id,
        contact_name=_clean(contact_payload.get("name")) or "Chatwoot User",
        original_inbox_id=int(resolved_inbox_id),
        contact_phone=_clean(contact_payload.get("phone_number") or contact_payload.get("phone")),
        contact_email=_clean(contact_payload.get("email")),
        additional_attributes=contact_payload.get("additional_attributes") or {},
        inbox_id=int(resolved_inbox_id),
        labels=list(resolved_labels),
        assignee_name=resolved_assignee_name,
        captain_assistant_id=captain_assistant_id,
        inbox_name=_clean(inbox_payload.get("name")),
        source_id=source_id,
        inbox_channel_type=inbox_channel_type,
        persist_user_messages=inbox_channel_type == "Channel::Api",
    )


def build_incoming_payload(context: ConversationContext, prompt: str, *, message_id: int | None = None) -> dict[str, Any]:
    resolved_message_id = message_id or int(time.time() * 1000)
    content_attributes: dict[str, Any] = {}
    additional_attributes: dict[str, Any] = {}
    if context.captain_assistant_id is not None:
        content_attributes["captain_assistant_id"] = context.captain_assistant_id
        additional_attributes["captain_assistant_id"] = context.captain_assistant_id
    return {
        "event": "message_created",
        "id": resolved_message_id,
        "content": prompt,
        "message_type": "incoming",
        "content_attributes": content_attributes,
        "additional_attributes": additional_attributes,
        "sender": {
            "id": context.contact_id,
            "name": context.contact_name,
            "email": context.contact_email,
            "phone_number": context.contact_phone,
            "additional_attributes": context.additional_attributes or {},
        },
        "conversation": {
            "id": context.conversation_id,
            "channel": context.inbox_channel_type or "Channel::Api",
            "labels": context.labels or ["ai"],
            "meta": {"assignee": {"name": context.assignee_name}},
            "contact_inbox": {
                "contact_id": context.contact_id,
                "source_id": context.source_id,
                "inbox_id": context.inbox_id,
                "contact": {
                    "name": context.contact_name,
                    "email": context.contact_email,
                    "phone_number": context.contact_phone,
                    "additional_attributes": context.additional_attributes or {},
                },
            },
            "messages": [
                {
                    "attachments": [],
                    "sender": {"name": context.contact_name},
                    "sender_id": context.contact_id,
                }
            ],
            "account_id": context.account_id,
        },
        "inbox": {"id": context.inbox_id, "name": context.inbox_name},
        "account": {"id": context.account_id},
        "captain_assistant_id": context.captain_assistant_id,
    }


def fetch_messages(runtime: RuntimeConfig, context: ConversationContext) -> list[ObservedMessage]:
    return fetch_conversation_poll_state(runtime, context).messages


def fetch_conversation_poll_state(
    runtime: RuntimeConfig,
    context: ConversationContext,
) -> ConversationPollState:
    payload = chatwoot_request(
        runtime,
        f"/api/v1/accounts/{runtime.account_id}/conversations/{context.conversation_id}/messages",
    )
    raw_messages = payload.get("payload") if isinstance(payload, dict) else None
    if not isinstance(raw_messages, list):
        return []
    normalized: list[ObservedMessage] = []
    for item in raw_messages:
        if not isinstance(item, dict):
            continue
        normalized.append(
            ObservedMessage(
                id=_clean(item.get("id")) or "",
                content=str(item.get("content") or ""),
                message_type=item.get("message_type"),
                private=bool(item.get("private", False)),
                created_at=item.get("created_at"),
                raw=item,
            )
        )
    normalized.sort(key=lambda m: (_created_int(m.created_at), m.id))
    raw_labels = _deep_get(payload, "meta", "labels")
    labels: list[str] = []
    if isinstance(raw_labels, list):
        labels = [str(item).strip() for item in raw_labels if str(item).strip()]
    assignee_name = _clean(_deep_get(payload, "meta", "assignee", "name"))
    latest_message = normalized[-1] if normalized else None
    latest_preview = None
    if latest_message and latest_message.content.strip():
        latest_preview = normalize_space(latest_message.content)[:160]
    return ConversationPollState(
        messages=normalized,
        labels=labels,
        assignee_name=assignee_name,
        latest_message_id=latest_message.id if latest_message else None,
        latest_message_preview=latest_preview,
    )


def collect_new_public_outgoing(messages: list[ObservedMessage], seen_ids: set[str]) -> list[ObservedMessage]:
    new_messages: list[ObservedMessage] = []
    for message in messages:
        if not message.id or message.id in seen_ids:
            continue
        seen_ids.add(message.id)
        if is_public_outgoing(message):
            new_messages.append(message)
    return new_messages


def is_public_outgoing(message: ObservedMessage) -> bool:
    if message.private:
        return False
    if isinstance(message.message_type, str):
        return message.message_type.strip().lower() == "outgoing"
    if isinstance(message.message_type, int):
        return message.message_type == 1
    return False


def has_handoff_label(labels: list[str]) -> bool:
    return any("handoff" in normalize_match_text(label) for label in labels if label)


def wait_for_step_reply(
    runtime: RuntimeConfig,
    context: ConversationContext,
    seen_ids: set[str],
    *,
    timeout_seconds: float,
    poll_interval_seconds: float,
    settle_seconds: float,
    status_callback: Callable[[dict[str, Any]], None] | None = None,
    status_log_interval_seconds: float = DEFAULT_STATUS_LOG_INTERVAL_SECONDS,
) -> list[ObservedMessage]:
    effective_timeout_seconds = max(float(timeout_seconds), MIN_REPLY_TIMEOUT_SECONDS)
    deadline = time.monotonic() + effective_timeout_seconds
    quiet_deadline = None
    collected: list[ObservedMessage] = []
    started = time.monotonic()
    last_status_emit = 0.0
    last_status_signature: tuple[Any, ...] | None = None
    while time.monotonic() < deadline:
        state = fetch_conversation_poll_state(runtime, context)
        new_messages = collect_new_public_outgoing(state.messages, seen_ids)
        if new_messages:
            collected.extend(new_messages)
            quiet_deadline = time.monotonic() + settle_seconds
        if has_handoff_label(state.labels):
            raise HandoffDetected(
                context.conversation_id,
                labels=state.labels,
                detail=state.latest_message_preview,
                replies=collected,
            )
        now = time.monotonic()
        if status_callback is not None:
            status_signature = (
                tuple(state.labels),
                state.assignee_name,
                state.latest_message_id,
                len(collected),
                bool(quiet_deadline),
            )
            should_emit = (
                last_status_signature != status_signature
                or now - last_status_emit >= status_log_interval_seconds
            )
            if should_emit:
                status_callback(
                    {
                        "conversation_id": context.conversation_id,
                        "elapsed_seconds": round(now - started, 1),
                        "remaining_seconds": round(max(0.0, deadline - now), 1),
                        "phase": (
                            "settling_after_reply"
                            if quiet_deadline is not None
                            else "waiting_for_reply"
                        ),
                        "labels": list(state.labels),
                        "assignee_name": state.assignee_name,
                        "latest_message_id": state.latest_message_id,
                        "latest_message_preview": state.latest_message_preview,
                        "public_reply_count": len(collected),
                    }
                )
                last_status_emit = now
                last_status_signature = status_signature
        if quiet_deadline is not None and time.monotonic() >= quiet_deadline:
            return collected
        time.sleep(poll_interval_seconds)
    raise RunnerError(
        f"Timed out waiting for replies in conversation {context.conversation_id} "
        f"after {int(effective_timeout_seconds)}s."
    )


def combine_reply_text(replies: list[ObservedMessage]) -> str:
    return "\n\n".join(reply.content.strip() for reply in replies if reply.content.strip()).strip()


def is_error_reply_text(reply_text: str) -> bool:
    lowered = normalize_space(reply_text).lower()
    if not lowered:
        return False
    return any(pattern in lowered for pattern in ERROR_REPLY_PATTERNS)


def validate_reply(reply_text: str, expectation: dict[str, Any]) -> str | None:
    raw_reply = normalize_space(reply_text)
    if not raw_reply:
        return "empty_reply"
    normalized_reply = normalize_match_text(raw_reply)
    contains_any = [str(item) for item in expectation.get("contains_any", []) or [] if str(item).strip()]
    regex_any = [str(item) for item in expectation.get("regex_any", []) or [] if str(item).strip()]
    normalized_contains = [normalize_match_text(item) for item in contains_any if normalize_match_text(item)]
    if normalized_contains and not any(fragment in normalized_reply for fragment in normalized_contains):
        return f"missing_contains_any:{contains_any}"
    if regex_any and not any(re.search(pattern, raw_reply, re.IGNORECASE | re.MULTILINE) for pattern in regex_any):
        return f"missing_regex_any:{regex_any}"
    return None


def merge_case_config(defaults: dict[str, Any], case: dict[str, Any]) -> dict[str, Any]:
    merged = dict(defaults)
    for key, value in case.items():
        if value is None and key in merged:
            continue
        merged[key] = value
    return merged


def build_case_context(
    runtime: RuntimeConfig,
    merged: dict[str, Any],
    *,
    case_id: str,
) -> ConversationContext:
    labels = merged.get("labels") or ["ai"]
    pinned_conversation_id = _clean(merged.get("pinned_conversation_id"))
    if pinned_conversation_id:
        return build_pinned_conversation_context(
            runtime,
            conversation_id=pinned_conversation_id,
            labels=list(labels),
            assignee_name=str(merged.get("assignee_name") or ""),
            captain_assistant_id=_optional_int(merged.get("captain_assistant_id")),
        )

    contact = merged.get("contact") or {}
    if not isinstance(contact, dict):
        raise RunnerError(f"Case {case_id} contact must be an object.")
    contact_name = _clean(contact.get("name"))
    if not contact_name:
        raise RunnerError(f"Case {case_id} missing contact.name.")
    requested_inbox_id = merged.get("inbox_id")
    if requested_inbox_id in (None, ""):
        raise RunnerError(f"Case {case_id} must set inbox_id.")
    requested_inbox_id = int(requested_inbox_id)
    chat_ui_mode = str(merged.get("chat_ui_mode") or DEFAULT_CHAT_UI_MODE).strip().lower()
    explicit_ui_inbox_id = _optional_int(merged.get("ui_inbox_id"))

    if chat_ui_mode == "realistic":
        ui_inbox_id, ui_inbox_name, ui_inbox_channel_type = resolve_realistic_ui_inbox(
            runtime,
            requested_inbox_id=requested_inbox_id,
            explicit_ui_inbox_id=explicit_ui_inbox_id,
        )
        if ui_inbox_channel_type != "Channel::Api":
            raise RunnerError(
                "Realistic Chatwoot mode only supports Api inbox conversations, "
                f"got {ui_inbox_channel_type or 'unknown'} for inbox_id {ui_inbox_id}."
            )
        suppress_native_processing = os.getenv(
            "CHATWOOT_TEST_SUPPRESS_NATIVE_WEBHOOK_PROCESSING", ""
        ).strip().lower() in {"1", "true", "yes"}
        context = create_conversation(
            runtime,
            inbox_id=ui_inbox_id,
            contact_name=contact_name,
            contact_phone=None,
            contact_email=None,
            additional_attributes=contact.get("additional_attributes") or {},
            labels=[] if suppress_native_processing else list(labels),
            assignee_name=(
                "" if suppress_native_processing else str(merged.get("assignee_name") or "Bot")
            ),
            captain_assistant_id=_optional_int(merged.get("captain_assistant_id")),
        )
        context.original_inbox_id = requested_inbox_id
        context.inbox_name = ui_inbox_name or context.inbox_name
        context.inbox_channel_type = ui_inbox_channel_type
        context.persist_user_messages = True
        if suppress_native_processing:
            context.labels = list(labels)
            context.assignee_name = str(merged.get("assignee_name") or "Bot")
        return context

    if merged.get("conversation_id"):
        contact_id = _clean(merged.get("contact_id"))
        if not contact_id:
            raise RunnerError(f"Case {case_id} needs contact_id and inbox_id with conversation_id.")
        return ConversationContext(
            account_id=runtime.account_id,
            conversation_id=str(merged["conversation_id"]),
            contact_id=contact_id,
            contact_name=contact_name,
            original_inbox_id=requested_inbox_id,
            contact_phone=_clean(contact.get("phone")),
            contact_email=_clean(contact.get("email")),
            additional_attributes=contact.get("additional_attributes") or {},
            inbox_id=requested_inbox_id,
            labels=list(labels),
            assignee_name=str(merged.get("assignee_name") or "Bot"),
            captain_assistant_id=_optional_int(merged.get("captain_assistant_id")),
        )

    contact_id = _clean(merged.get("contact_id"))
    source_id = _clean(merged.get("source_id"))
    if contact_id and source_id:
        context = create_conversation_from_existing_contact(
            runtime,
            inbox_id=requested_inbox_id,
            contact_id=contact_id,
            source_id=source_id,
            contact_name=contact_name,
            contact_phone=_clean(contact.get("phone")),
            contact_email=_clean(contact.get("email")),
            additional_attributes=contact.get("additional_attributes") or {},
            labels=list(labels),
            assignee_name=str(merged.get("assignee_name") or "Bot"),
            captain_assistant_id=_optional_int(merged.get("captain_assistant_id")),
        )
        context.original_inbox_id = requested_inbox_id
        return context
    context = create_conversation(
        runtime,
        inbox_id=requested_inbox_id,
        contact_name=contact_name,
        contact_phone=_clean(contact.get("phone")),
        contact_email=_clean(contact.get("email")),
        additional_attributes=contact.get("additional_attributes") or {},
        labels=list(labels),
        assignee_name=str(merged.get("assignee_name") or "Bot"),
        captain_assistant_id=_optional_int(merged.get("captain_assistant_id")),
    )
    context.original_inbox_id = requested_inbox_id
    return context


def initial_seen_outgoing_ids(runtime: RuntimeConfig, context: ConversationContext) -> set[str]:
    return {
        message.id
        for message in fetch_messages(runtime, context)
        if message.id and is_public_outgoing(message)
    }


def post_prompt_and_wait(
    runtime: RuntimeConfig,
    context: ConversationContext,
    seen_ids: set[str],
    prompt: str,
    *,
    timeout_seconds: float,
    poll_interval_seconds: float,
    settle_seconds: float,
    status_callback: Callable[[dict[str, Any]], None] | None = None,
) -> tuple[list[ObservedMessage], str, int]:
    started = time.time()
    persisted_message = None
    if context.persist_user_messages:
        persisted_message = create_incoming_message(runtime, context, prompt)
        persisted_message_id = _optional_int((persisted_message or {}).get("id"))
        webhook_message_id = persisted_message_id
        skip_local_webhook_post = os.getenv(
            "CHATWOOT_TEST_SKIP_LOCAL_WEBHOOK_POST", ""
        ).strip().lower() in {"1", "true", "yes"}
        if os.getenv("CHATWOOT_TEST_SUPPRESS_NATIVE_WEBHOOK_PROCESSING", "").strip().lower() in {
            "1",
            "true",
            "yes",
        }:
            webhook_message_id = int(time.time() * 1000)
        if not skip_local_webhook_post:
            post_webhook(
                runtime,
                build_incoming_payload(
                    context,
                    prompt,
                    message_id=webhook_message_id,
                ),
            )
        try:
            replies = wait_for_step_reply(
                runtime,
                context,
                seen_ids,
                timeout_seconds=timeout_seconds,
                poll_interval_seconds=poll_interval_seconds,
                settle_seconds=settle_seconds,
                status_callback=status_callback,
            )
            return replies, combine_reply_text(replies), int((time.time() - started) * 1000)
        except HandoffDetected:
            raise
        except RunnerError as first_timeout:
            if skip_local_webhook_post:
                raise
            post_webhook(
                runtime,
                build_incoming_payload(
                    context,
                    prompt,
                    message_id=webhook_message_id,
                ),
            )
            try:
                replies = wait_for_step_reply(
                    runtime,
                    context,
                    seen_ids,
                    timeout_seconds=timeout_seconds,
                    poll_interval_seconds=poll_interval_seconds,
                    settle_seconds=settle_seconds,
                    status_callback=status_callback,
                )
                return replies, combine_reply_text(replies), int((time.time() - started) * 1000)
            except HandoffDetected:
                raise
            except RunnerError as second_timeout:
                raise RunnerError(
                    f"{first_timeout} Retry after timeout also timed out in conversation "
                    f"{context.conversation_id}."
                ) from second_timeout

    post_webhook(
        runtime,
        build_incoming_payload(
            context,
            prompt,
            message_id=_optional_int((persisted_message or {}).get("id")),
        ),
    )
    replies = wait_for_step_reply(
        runtime,
        context,
        seen_ids,
        timeout_seconds=timeout_seconds,
        poll_interval_seconds=poll_interval_seconds,
        settle_seconds=settle_seconds,
        status_callback=status_callback,
    )
    return replies, combine_reply_text(replies), int((time.time() - started) * 1000)


def run_suite(
    runtime: RuntimeConfig,
    suite: dict[str, Any],
    *,
    progress_callback: Callable[[list[dict[str, Any]]], None] | None = None,
) -> dict[str, Any]:
    defaults = suite.get("defaults") or {}
    cases = suite.get("cases")
    if not isinstance(cases, list) or not cases:
        raise RunnerError("Suite must contain a non-empty cases list.")

    run_started_at = time.time()
    results: list[dict[str, Any]] = []
    for index, case in enumerate(cases, start=1):
        if not isinstance(case, dict):
            raise RunnerError(f"Case #{index} is not a YAML object.")
        current_case_result: dict[str, Any] | None = None

        def emit_case_progress(case_result: dict[str, Any]) -> None:
            nonlocal current_case_result
            current_case_result = case_result
            if progress_callback is not None:
                progress_callback([*results, case_result])

        try:
            final_case_result = run_case(
                runtime,
                defaults,
                case,
                index,
                progress_callback=emit_case_progress,
            )
        except RunnerError as error:
            case_id = str(case.get("case_id") or f"case-{index:02d}")
            final_case_result = {
                "case_index": index,
                "case_id": case_id,
                "title": case.get("title") or case_id,
                "objective": case.get("objective"),
                "succeeded": False,
                "completed_reason": "runner_error",
                "failure_reason": str(error),
                "turns": [],
            }
        if progress_callback is not None and current_case_result is None:
            progress_callback([*results, final_case_result])
        results.append(final_case_result)
    return {
        "suite_name": suite.get("suite_name") or "chatwoot-suite",
        "generated_at": suite.get("generated_at"),
        "run_generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "goal_summary": suite.get("goal_summary"),
        "defaults": defaults,
        "total_case_count": len(results),
        "success_count": count_success_results(results),
        "handoff_count": count_handoff_results(results),
        "failure_count": count_failure_results(results),
        "run_started_at": run_started_at,
        "run_completed_at": time.time(),
        "results": results,
    }


def run_case(
    runtime: RuntimeConfig,
    defaults: dict[str, Any],
    case: dict[str, Any],
    case_index: int,
    *,
    progress_callback: Callable[[dict[str, Any]], None] | None = None,
) -> dict[str, Any]:
    case_id = str(case.get("case_id") or f"case-{case_index:02d}")
    merged = merge_case_config(defaults, case)
    context = build_case_context(runtime, merged, case_id=case_id)
    seen_ids = initial_seen_outgoing_ids(runtime, context)
    steps = merged.get("steps")
    if not isinstance(steps, list) or not steps:
        raise RunnerError(f"Case {case_id} must define steps.")

    case_result = {
        "case_index": case_index,
        "case_id": case_id,
        "title": case.get("title") or case.get("case_id") or f"case-{case_index:02d}",
        "objective": case.get("objective"),
        "conversation_id": context.conversation_id,
        "contact_id": context.contact_id,
        "inbox_id": context.inbox_id,
        "original_inbox_id": context.original_inbox_id,
        "inbox_channel_type": context.inbox_channel_type,
        "persist_user_messages": context.persist_user_messages,
        "succeeded": False,
        "completed_reason": "running",
        "handoff_detected": False,
        "handoff_labels": None,
        "handoff_detail": None,
        "wait_status": None,
        "turns": [],
    }

    def emit_progress() -> None:
        if progress_callback is not None:
            progress_callback(case_result)

    stop_patterns = [str(item) for item in merged.get("stop_regex_any", []) or [] if str(item).strip()]
    fail_patterns = [str(item) for item in merged.get("fail_regex_any", []) or [] if str(item).strip()]
    reply_timeout_seconds = max(
        float(merged.get("reply_timeout_seconds") or DEFAULT_REPLY_TIMEOUT_SECONDS),
        MIN_REPLY_TIMEOUT_SECONDS,
    )
    reply_settle_seconds = float(merged.get("reply_settle_seconds") or DEFAULT_REPLY_SETTLE_SECONDS)
    poll_interval_seconds = float(merged.get("poll_interval_seconds") or DEFAULT_POLL_INTERVAL_SECONDS)

    def on_wait_status(status: dict[str, Any]) -> None:
        case_result["wait_status"] = status
        print(
            f"[{case_result['case_id']} step-wait] elapsed={status['elapsed_seconds']}s "
            f"remaining={status['remaining_seconds']}s phase={status['phase']} "
            f"labels={status.get('labels') or []} "
            f"last={status.get('latest_message_preview') or '-'}"
        )
        emit_progress()

    def first_regex_match(patterns: list[str], text: str) -> str | None:
        for pattern in patterns:
            try:
                if re.search(pattern, text, re.IGNORECASE | re.MULTILINE):
                    return pattern
            except re.error as error:
                print(f"[{case_result['case_id']}] ignored invalid stop regex: {pattern} ({error})")
        return None

    for step_index, step in enumerate(steps, start=1):
        if not isinstance(step, dict):
            raise RunnerError(f"Case {case_result['case_id']} step {step_index} must be an object.")
        prompt = _clean(step.get("prompt"))
        if not prompt:
            raise RunnerError(f"Case {case_result['case_id']} step {step_index} missing prompt.")

        try:
            replies, combined_reply, latency_ms = post_prompt_and_wait(
                runtime,
                context,
                seen_ids,
                prompt,
                timeout_seconds=max(
                    float(step.get("timeout_seconds") or reply_timeout_seconds),
                    MIN_REPLY_TIMEOUT_SECONDS,
                ),
                poll_interval_seconds=poll_interval_seconds,
                settle_seconds=reply_settle_seconds,
                status_callback=on_wait_status,
            )
        except HandoffDetected as handoff:
            case_result["turns"].append(
                enrich_turn_with_trace_data(
                    {
                        "turn_index": step_index,
                        "user_message": prompt,
                        "assistant_text": combine_reply_text(handoff.replies),
                        "latency_ms": 0,
                        "expectation": step.get("expectation") or {},
                        "messages": [message.raw for message in handoff.replies],
                        "reason": "handoff_detected",
                        "handoff_labels": handoff.labels,
                        "handoff_detail": handoff.detail,
                    }
                )
            )
            case_result["handoff_detected"] = True
            case_result["handoff_labels"] = list(handoff.labels)
            case_result["handoff_detail"] = handoff.detail
            case_result["completed_reason"] = "handoff_detected"
            emit_progress()
            return case_result
        case_result["wait_status"] = None
        if is_error_reply_text(combined_reply):
            case_result["turns"].append(
                enrich_turn_with_trace_data(
                    {
                        "turn_index": step_index,
                        "user_message": prompt,
                        "assistant_text": combined_reply,
                        "latency_ms": latency_ms,
                        "expectation": step.get("expectation") or {},
                        "messages": [message.raw for message in replies],
                        "reason": "assistant_error_response",
                    }
                )
            )
            case_result["completed_reason"] = "assistant_error_response"
            case_result["failure_reason"] = "assistant_error_response"
            emit_progress()
            return case_result
        fail_match = first_regex_match(fail_patterns, combined_reply)
        if fail_match:
            case_result["turns"].append(
                enrich_turn_with_trace_data(
                    {
                        "turn_index": step_index,
                        "user_message": prompt,
                        "assistant_text": combined_reply,
                        "latency_ms": latency_ms,
                        "expectation": step.get("expectation") or {},
                        "messages": [message.raw for message in replies],
                        "reason": "failure_stop_signal",
                    }
                )
            )
            case_result["completed_reason"] = "failure_stop_signal"
            case_result["failure_reason"] = f"failure_stop_signal: {fail_match}"
            emit_progress()
            return case_result
        failure_reason = validate_reply(combined_reply, step.get("expectation") or {})
        case_result["turns"].append(
            enrich_turn_with_trace_data(
                {
                    "turn_index": step_index,
                    "user_message": prompt,
                    "assistant_text": combined_reply,
                    "latency_ms": latency_ms,
                    "expectation": step.get("expectation") or {},
                    "messages": [message.raw for message in replies],
                    "reason": failure_reason or "matched",
                }
            )
        )
        emit_progress()
        if failure_reason:
            case_result["completed_reason"] = "expectation_failed"
            case_result["failure_reason"] = failure_reason
            emit_progress()
            return case_result
    if first_regex_match(stop_patterns, combined_reply):
        case_result["completed_reason"] = "success_stop_signal"
        case_result["succeeded"] = True
        emit_progress()
        return case_result

    case_result["wait_status"] = None

    case_result["completed_reason"] = "all_steps_matched"
    case_result["succeeded"] = True
    emit_progress()
    return case_result


def default_output_path(output_root: Path, suite_name: str) -> Path:
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    dated_dir = f"{time.strftime('%Y-%m-%d')}-{suite_name}"
    output_dir = output_root / dated_dir
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir / f"{timestamp}-{suite_name}.yml"


def raw_output_path(yaml_path: Path) -> Path:
    return yaml_path.with_name(f"{yaml_path.stem}-raw.json")


def _unwrap_payload(payload: dict[str, Any]) -> dict[str, Any]:
    for key in ("payload", "data"):
        nested = payload.get(key)
        if isinstance(nested, dict):
            return nested
        if isinstance(nested, list) and nested and isinstance(nested[0], dict):
            return nested[0]
    return payload


def _extract_contact_id(payload: dict[str, Any]) -> str | None:
    candidates = [
        payload.get("id"),
        payload.get("contact_id"),
        payload.get("contact", {}).get("id") if isinstance(payload.get("contact"), dict) else None,
    ]
    for candidate in candidates:
        normalized = _clean(candidate)
        if normalized:
            return normalized
    return None


def _extract_source_id(payload: dict[str, Any], inbox_id: int) -> str | None:
    contact_inboxes = payload.get("contact_inboxes")
    if not isinstance(contact_inboxes, list):
        nested_contact = payload.get("contact")
        if isinstance(nested_contact, dict) and isinstance(nested_contact.get("contact_inboxes"), list):
            contact_inboxes = nested_contact.get("contact_inboxes")
        else:
            contact_inboxes = []
    nested_contact_inbox = payload.get("contact_inbox")
    if isinstance(nested_contact_inbox, dict):
        nested_source_id = _clean(nested_contact_inbox.get("source_id"))
        nested_inbox = nested_contact_inbox.get("inbox")
        nested_inbox_id = None
        if isinstance(nested_inbox, dict):
            nested_inbox_id = nested_inbox.get("id")
        if nested_inbox_id in (None, ""):
            nested_inbox_id = nested_contact_inbox.get("inbox_id")
        try:
            if nested_source_id and nested_inbox_id is not None and int(nested_inbox_id) == int(inbox_id):
                return nested_source_id
        except (TypeError, ValueError):
            pass
    fallback = None
    for item in contact_inboxes:
        if not isinstance(item, dict):
            continue
        source_id = _clean(item.get("source_id"))
        if source_id and fallback is None:
            fallback = source_id
        inbox = item.get("inbox") if isinstance(item.get("inbox"), dict) else {}
        item_inbox_id = inbox.get("id") if isinstance(inbox, dict) else item.get("inbox_id")
        try:
            if item_inbox_id is not None and int(item_inbox_id) == int(inbox_id):
                return source_id
        except (TypeError, ValueError):
            continue
    return fallback


def _created_int(value: Any) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _optional_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    return int(value)


def _clean(value: Any) -> str | None:
    if value in (None, ""):
        return None
    normalized = str(value).strip()
    return normalized or None


def _deep_get(payload: Any, *path: str) -> Any:
    current = payload
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current

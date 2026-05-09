#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any


LANGFUSE_HELPER = Path(
    "/Users/quangnguyenbh/.codex/skills/langfuse-vxr/scripts/langfuse_query.py"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Render an HTML viewer that shows Langfuse tool calls by "
            "conversation -> turn -> tool call."
        )
    )
    parser.add_argument(
        "--raw-file",
        required=True,
        help="Path to the chatwoot runner -raw.json report file.",
    )
    parser.add_argument(
        "--json-output",
        help="Optional output path for the enriched JSON artifact.",
    )
    parser.add_argument(
        "--html-output",
        help="Optional output path for the HTML artifact.",
    )
    return parser.parse_args()


def _pretty_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def _load_json(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeError(f"{path} must contain a JSON object.")
    return data


def _artifact_base_from_raw(raw_path: Path) -> Path:
    stem = raw_path.stem
    if stem.endswith("-raw"):
        stem = stem[: -len("-raw")]
    return raw_path.with_name(f"{stem}-langfuse-tool-calls")


def _get_observation_attrs(observation: dict[str, Any]) -> dict[str, Any]:
    metadata = observation.get("metadata")
    if not isinstance(metadata, dict):
        return {}
    attrs = metadata.get("attributes")
    return attrs if isinstance(attrs, dict) else {}


def _fetch_observations(trace_id: str, cache: dict[str, list[dict[str, Any]]]) -> list[dict[str, Any]]:
    cached = cache.get(trace_id)
    if cached is not None:
        return cached

    cmd = [
        "python3",
        str(LANGFUSE_HELPER),
        "get",
        "observations",
        "--param",
        f"traceId={trace_id}",
        "--limit",
        "100",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    payload = json.loads(result.stdout)
    observations = payload.get("data")
    if not isinstance(observations, list):
        observations = []
    cache[trace_id] = observations
    time.sleep(0.01)
    return observations


def _sorted_observations(observations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        observations,
        key=lambda item: (
            str(item.get("startTime") or ""),
            str(item.get("createdAt") or ""),
            str(item.get("id") or ""),
        ),
    )


def _extract_tool_execution_maps(
    observations: list[dict[str, Any]],
) -> tuple[dict[str, dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    by_call_id: dict[str, dict[str, Any]] = {}
    by_tool_name: dict[str, list[dict[str, Any]]] = {}

    for observation in _sorted_observations(observations):
        name = str(observation.get("name") or "")
        if observation.get("type") != "SPAN" or "running tool:" not in name:
            continue

        attrs = _get_observation_attrs(observation)
        tool_name = str(
            attrs.get("gen_ai.tool.name")
            or name.replace("running tool:", "", 1).strip()
        ).strip()
        tool_call_id = str(attrs.get("gen_ai.tool.call.id") or "").strip()
        execution = {
            "observation_id": observation.get("id"),
            "observation_name": observation.get("name"),
            "start_time": observation.get("startTime"),
            "end_time": observation.get("endTime"),
            "latency_ms": observation.get("latency"),
            "tool_name": tool_name,
            "tool_call_id": tool_call_id or None,
            "execution_input": observation.get("input"),
            "execution_output": observation.get("output"),
            "attributes": attrs,
        }
        if tool_call_id:
            by_call_id[tool_call_id] = execution
        by_tool_name.setdefault(tool_name, []).append(execution)

    return by_call_id, by_tool_name


def _extract_generation_input_map(
    observations: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    generation_map: dict[str, dict[str, Any]] = {}
    for observation in _sorted_observations(observations):
        if observation.get("type") != "GENERATION":
            continue
        observation_id = str(observation.get("id") or "").strip()
        if not observation_id:
            continue
        generation_map[observation_id] = {
            "generation_observation_id": observation.get("id"),
            "generation_name": observation.get("name"),
            "generation_start_time": observation.get("startTime"),
            "generation_end_time": observation.get("endTime"),
            "model": observation.get("model"),
            "prompt_tokens": observation.get("promptTokens"),
            "usage": observation.get("usage"),
            "usage_details": observation.get("usageDetails"),
            "generation_input": observation.get("input"),
        }
    return generation_map


def _fetch_model_context_windows(models: set[str]) -> dict[str, dict[str, Any]]:
    if not models:
        return {}
    try:
        result = subprocess.run(
            ["curl", "-fsSL", "https://openrouter.ai/api/v1/models"],
            capture_output=True,
            text=True,
            check=True,
        )
        payload = json.loads(result.stdout)
        items = payload.get("data")
        if not isinstance(items, list):
            return {}
    except Exception:
        return {}

    matched: dict[str, dict[str, Any]] = {}
    wanted = {model.strip() for model in models if model and str(model).strip()}
    for item in items:
        model_id = str(item.get("id") or "").strip()
        if not model_id:
            continue
        aliases = {model_id}
        if "/" in model_id:
            aliases.add(model_id.split("/")[-1])
        overlap = aliases & wanted
        if not overlap:
            continue
        context_length = item.get("context_length")
        top_provider = item.get("top_provider")
        top_context = (
            top_provider.get("context_length")
            if isinstance(top_provider, dict)
            else None
        )
        effective_context = (
            top_context
            if isinstance(top_context, int)
            else context_length if isinstance(context_length, int) else None
        )
        info = {
            "model_api_id": model_id,
            "context_window": effective_context,
            "context_window_source": "openrouter_models_api",
        }
        for alias in overlap:
            matched[alias] = info
    return matched


def _coerce_int(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        try:
            return int(value)
        except Exception:
            return None
    return None


def _annotate_context_window_usage(report: dict[str, Any]) -> None:
    models: set[str] = set()
    generation_refs: list[dict[str, Any]] = []

    for conversation in report.get("conversations") or []:
        for turn in conversation.get("turns") or []:
            for entry in turn.get("timeline") or []:
                generation_ref = entry.get("generation_input_ref")
                if not isinstance(generation_ref, dict):
                    continue
                generation_refs.append(generation_ref)
                model = str(generation_ref.get("model") or "").strip()
                if model:
                    models.add(model)

    context_map = _fetch_model_context_windows(models)
    for generation_ref in generation_refs:
        model = str(generation_ref.get("model") or "").strip()
        model_context = context_map.get(model) or {}
        context_window = _coerce_int(model_context.get("context_window"))

        usage = generation_ref.get("usage")
        prompt_tokens = _coerce_int(generation_ref.get("prompt_tokens"))
        usage_input = None
        if isinstance(usage, dict):
            usage_input = _coerce_int(usage.get("input"))
        input_tokens = usage_input if usage_input is not None else prompt_tokens

        context_usage_percent = None
        context_state = "unknown"
        if context_window and input_tokens is not None:
            context_usage_percent = round((input_tokens / context_window) * 100, 2)
            if input_tokens > context_window:
                context_state = "overflow"
            elif context_usage_percent >= 90:
                context_state = "near_limit"
            else:
                context_state = "ok"

        generation_ref["model_context"] = {
            "model": model or None,
            "model_api_id": model_context.get("model_api_id"),
            "input_tokens": input_tokens,
            "prompt_tokens": prompt_tokens,
            "context_window": context_window,
            "context_window_source": model_context.get("context_window_source"),
            "context_usage_percent": context_usage_percent,
            "context_state": context_state,
        }


def _match_tool_execution(
    *,
    tool_name: str,
    tool_call_id: str,
    by_call_id: dict[str, dict[str, Any]],
    by_tool_name: dict[str, list[dict[str, Any]]],
    fallback_indices: dict[str, int],
) -> dict[str, Any] | None:
    matched_execution = by_call_id.get(tool_call_id)
    if matched_execution is None and tool_name:
        candidates = by_tool_name.get(tool_name) or []
        fallback_index = fallback_indices.get(tool_name, 0)
        if fallback_index < len(candidates):
            matched_execution = candidates[fallback_index]
            fallback_indices[tool_name] = fallback_index + 1
    return matched_execution


def _extract_timeline_from_observations(
    observations: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_call_id, by_tool_name = _extract_tool_execution_maps(observations)
    generation_map = _extract_generation_input_map(observations)
    fallback_indices: dict[str, int] = {}
    timeline: list[dict[str, Any]] = []
    sequence = 1

    for observation in _sorted_observations(observations):
        if observation.get("type") != "GENERATION":
            continue
        output = observation.get("output")
        if not isinstance(output, list):
            continue
        for message_index, message in enumerate(output, start=1):
            if not isinstance(message, dict):
                continue
            parts = message.get("parts")
            if not isinstance(parts, list):
                continue
            for part_index, part in enumerate(parts, start=1):
                if not isinstance(part, dict):
                    continue
                part_type = str(part.get("type") or "").strip()
                if part_type == "thinking":
                    timeline.append(
                        {
                            "entry_type": "thinking",
                            "seq": sequence,
                            "generation_observation_id": observation.get("id"),
                            "generation_name": observation.get("name"),
                            "generation_start_time": observation.get("startTime"),
                            "generation_end_time": observation.get("endTime"),
                            "parent_observation_id": observation.get(
                                "parentObservationId"
                            ),
                            "message_index_within_generation": message_index,
                            "part_index_within_message": part_index,
                            "thinking_text": part.get("content"),
                            "generation_input_ref": generation_map.get(
                                str(observation.get("id") or "").strip()
                            ),
                        }
                    )
                    sequence += 1
                    continue

                if part_type != "tool_call":
                    continue

                tool_name = str(part.get("name") or "").strip()
                tool_call_id = str(part.get("id") or "").strip()
                matched_execution = _match_tool_execution(
                    tool_name=tool_name,
                    tool_call_id=tool_call_id,
                    by_call_id=by_call_id,
                    by_tool_name=by_tool_name,
                    fallback_indices=fallback_indices,
                )

                timeline.append(
                    {
                        "entry_type": "tool_call",
                        "seq": sequence,
                        "generation_observation_id": observation.get("id"),
                        "generation_name": observation.get("name"),
                        "generation_start_time": observation.get("startTime"),
                        "generation_end_time": observation.get("endTime"),
                        "parent_observation_id": observation.get("parentObservationId"),
                        "message_index_within_generation": message_index,
                        "part_index_within_message": part_index,
                        "tool_call_id": tool_call_id or None,
                        "tool_name": tool_name or None,
                        "tool_arguments_raw": part.get("arguments"),
                        "execution": matched_execution,
                        "generation_input_ref": generation_map.get(
                            str(observation.get("id") or "").strip()
                        ),
                    }
                )
                sequence += 1

    return timeline


def _conversation_url(base_url: Any, account_id: Any, conversation_id: Any) -> str | None:
    if not base_url or account_id in (None, "") or conversation_id in (None, ""):
        return None
    return (
        f"{str(base_url).rstrip('/')}/app/accounts/{account_id}/conversations/{conversation_id}"
    )


def build_enriched_report(raw_report: dict[str, Any]) -> dict[str, Any]:
    runtime = raw_report.get("runtime")
    runtime = runtime if isinstance(runtime, dict) else {}
    observation_cache: dict[str, list[dict[str, Any]]] = {}

    conversations: list[dict[str, Any]] = []
    trace_fetch_count = 0

    for result in raw_report.get("results") or []:
        status = (
            "handoff"
            if result.get("handoff_detected")
            else ("success" if result.get("succeeded") else "failed")
        )
        conversation = {
            "case_index": result.get("case_index"),
            "case_id": result.get("case_id"),
            "title": result.get("title"),
            "objective": result.get("objective"),
            "status": status,
            "completed_reason": result.get("completed_reason"),
            "failure_reason": result.get("failure_reason"),
            "conversation_id": result.get("conversation_id"),
            "conversation_url": _conversation_url(
                runtime.get("chatwoot_api_base"),
                runtime.get("account_id"),
                result.get("conversation_id"),
            ),
            "user_turn_count": result.get("user_turn_count"),
            "turns": [],
        }

        for turn in result.get("turns") or []:
            trace_id = str(turn.get("langfuse_trace_id") or "").strip()
            timeline: list[dict[str, Any]] = []
            if trace_id:
                observations = _fetch_observations(trace_id, observation_cache)
                trace_fetch_count += 1
                if trace_fetch_count % 10 == 0:
                    print(
                        f"processed_traces={trace_fetch_count}",
                        file=sys.stderr,
                        flush=True,
                    )
                timeline = _extract_timeline_from_observations(observations)

            tool_calls = [
                item for item in timeline if item.get("entry_type") == "tool_call"
            ]
            thinking_entries = [
                item for item in timeline if item.get("entry_type") == "thinking"
            ]

            conversation["turns"].append(
                {
                    "turn_index": turn.get("turn_index"),
                    "user_message": turn.get("user_message"),
                    "assistant_text": turn.get("assistant_text"),
                    "reason": turn.get("reason"),
                    "latency_ms": turn.get("latency_ms"),
                    "langfuse_trace_id": trace_id or None,
                    "view_log_url": turn.get("view_log_url"),
                    "timeline_entry_count": len(timeline),
                    "thinking_count": len(thinking_entries),
                    "tool_call_count": len(tool_calls),
                    "timeline": timeline,
                    "tool_calls": tool_calls,
                }
            )

        conversations.append(conversation)

    return {
        "suite_name": raw_report.get("suite_name"),
        "generated_at": raw_report.get("generated_at"),
        "run_generated_at": raw_report.get("run_generated_at") or datetime.now().isoformat(),
        "source_trace": raw_report.get("source_trace"),
        "runtime": runtime,
        "trace_fetch_count": trace_fetch_count,
        "conversation_count": len(conversations),
        "success_count": sum(1 for item in conversations if item["status"] == "success"),
        "handoff_count": sum(1 for item in conversations if item["status"] == "handoff"),
        "failed_count": sum(1 for item in conversations if item["status"] == "failed"),
        "conversations": conversations,
    }


def _badge_label(status: str) -> str:
    return {
        "success": "Success",
        "handoff": "Handoff",
        "failed": "Failure",
    }.get(status, status.title())


def _tool_call_summary(tool_call: dict[str, Any]) -> str:
    tool_name = str(tool_call.get("tool_name") or "unknown_tool")
    seq = tool_call.get("seq")
    execution = tool_call.get("execution")
    matched = "matched" if execution else "unmatched"
    return f"{seq}. {tool_name} · {matched}"


def _thinking_summary(entry: dict[str, Any]) -> str:
    text = str(entry.get("thinking_text") or "").strip().replace("\n", " ")
    short = text[:100] + ("..." if len(text) > 100 else "")
    return f'{entry.get("seq")}. thinking · {short or "(empty)"}'


def _panel_header(title: str, target_id: str) -> str:
    return (
        '<div class="panel-head">'
        f"<h5>{html.escape(title)}</h5>"
        f'<button class="copy-btn" type="button" data-copy-target="{html.escape(target_id)}">'
        "Copy</button>"
        "</div>"
    )


def _prompt_dump_dir_for_html(html_output: Path) -> Path:
    return html_output.with_name(f"{html_output.stem}-prompt-dumps")


def _write_prompt_dump_files(
    report: dict[str, Any],
    *,
    html_output: Path,
) -> dict[str, dict[str, str]]:
    dump_dir = _prompt_dump_dir_for_html(html_output)
    dump_dir.mkdir(parents=True, exist_ok=True)

    generation_to_paths: dict[str, dict[str, str]] = {}

    for conversation in report.get("conversations") or []:
        for turn in conversation.get("turns") or []:
            for entry in turn.get("timeline") or []:
                generation_ref = entry.get("generation_input_ref")
                if not isinstance(generation_ref, dict):
                    continue
                generation_id = str(
                    generation_ref.get("generation_observation_id") or ""
                ).strip()
                if not generation_id or generation_id in generation_to_paths:
                    continue

                payload = {
                    "generation_observation_id": generation_ref.get(
                        "generation_observation_id"
                    ),
                    "generation_name": generation_ref.get("generation_name"),
                    "generation_start_time": generation_ref.get("generation_start_time"),
                    "generation_end_time": generation_ref.get("generation_end_time"),
                    "model_context": generation_ref.get("model_context"),
                    "generation_input": generation_ref.get("generation_input"),
                }

                json_path = dump_dir / f"{generation_id}.json"
                html_path = dump_dir / f"{generation_id}.html"
                json_text = json.dumps(payload, ensure_ascii=False, indent=2)
                model_context = payload.get("model_context") or {}
                context_summary = [
                    f"Model: {model_context.get('model') or '-'}",
                    f"Input tokens: {model_context.get('input_tokens') or '-'}",
                    f"Context window: {model_context.get('context_window') or '-'}",
                    f"Used: {model_context.get('context_usage_percent') or '-'}%",
                    f"State: {model_context.get('context_state') or 'unknown'}",
                ]
                json_path.write_text(json_text, encoding="utf-8")
                html_path.write_text(
                    """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <style>
    body {{
      margin: 0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      background: #f5f1e8;
      color: #1f2933;
    }}
    .page {{
      max-width: 1280px;
      margin: 0 auto;
      padding: 24px;
    }}
    .card {{
      background: #fffdf8;
      border: 1px solid #ded7c9;
      border-radius: 16px;
      padding: 20px;
      box-shadow: 0 10px 24px rgba(31, 41, 51, 0.06);
    }}
    pre {{
      white-space: pre-wrap;
      word-break: break-word;
      background: #f8f5ef;
      border-radius: 12px;
      padding: 12px;
      overflow: auto;
      max-height: 80vh;
    }}
    a {{
      color: #0f766e;
      text-decoration: none;
    }}
  </style>
</head>
<body>
  <div class="page">
    <div class="card">
      <h1>{title}</h1>
      <p>{context_summary}</p>
      <p><a href="{json_name}">Open raw JSON</a></p>
      <pre>{body}</pre>
    </div>
  </div>
</body>
</html>
                    """.format(
                        title=html.escape(f"Model input {generation_id}"),
                        context_summary=html.escape(" | ".join(context_summary)),
                        json_name=html.escape(json_path.name),
                        body=html.escape(json_text),
                    ),
                    encoding="utf-8",
                )

                generation_to_paths[generation_id] = {
                    "json_relative_path": (
                        f"{dump_dir.name}/{json_path.name}"
                    ),
                    "html_relative_path": (
                        f"{dump_dir.name}/{html_path.name}"
                    ),
                }

    for conversation in report.get("conversations") or []:
        for turn in conversation.get("turns") or []:
            for entry in turn.get("timeline") or []:
                generation_ref = entry.get("generation_input_ref")
                if not isinstance(generation_ref, dict):
                    continue
                generation_id = str(
                    generation_ref.get("generation_observation_id") or ""
                ).strip()
                if not generation_id:
                    continue
                path_info = generation_to_paths.get(generation_id)
                if path_info:
                    entry["prompt_dump"] = path_info

    return generation_to_paths


def build_html_report(report: dict[str, Any], source_path: Path) -> str:
    conversations = sorted(
        list(report.get("conversations") or []),
        key=lambda item: (
            {"failed": 0, "handoff": 1, "success": 2}.get(str(item.get("status")), 3),
            int(item.get("case_index") or 0),
        ),
    )

    cards: list[str] = []
    for conversation in conversations:
        turn_blocks: list[str] = []
        for turn in conversation.get("turns") or []:
            timeline_blocks: list[str] = []
            for entry in turn.get("timeline") or []:
                case_index = str(conversation.get("case_index") or "x")
                turn_index = str(turn.get("turn_index") or "x")
                seq = str(entry.get("seq") or "x")
                base_id = f"case-{case_index}-turn-{turn_index}-timeline-{seq}"

                if entry.get("entry_type") == "thinking":
                    thinking_id = f"{base_id}-thinking"
                    prompt_dump = entry.get("prompt_dump") if isinstance(entry, dict) else None
                    prompt_dump_html = None
                    prompt_dump_json = None
                    if isinstance(prompt_dump, dict):
                        prompt_dump_html = prompt_dump.get("html_relative_path")
                        prompt_dump_json = prompt_dump.get("json_relative_path")
                    model_context = (
                        (entry.get("generation_input_ref") or {}).get("model_context")
                        if isinstance(entry, dict)
                        else None
                    )
                    model_context = model_context if isinstance(model_context, dict) else {}
                    context_badge = (
                        f"{model_context.get('input_tokens') or '-'} / "
                        f"{model_context.get('context_window') or '-'} tokens "
                        f"({model_context.get('context_usage_percent') or '-'}%)"
                    )
                    timeline_blocks.append(
                        """
                        <details class="timeline-entry thinking" {open_attr}>
                          <summary>{summary}</summary>
                          <div class="tool-body">
                            <div class="tool-meta">
                              <span><strong>Type:</strong> thinking</span>
                              <span><strong>Generation observation:</strong> {generation_observation_id}</span>
                              <span><strong>Model:</strong> {model_name}</span>
                              <span><strong>Context usage:</strong> {context_badge}</span>
                              <span><strong>State:</strong> {context_state}</span>
                              <span><strong>Model input:</strong> {prompt_dump_link}</span>
                              <span><strong>Raw JSON:</strong> {prompt_dump_json_link}</span>
                            </div>
                            <section>
                              {thinking_header}
                              <pre id="{thinking_id}">{thinking_text}</pre>
                            </section>
                          </div>
                        </details>
                        """.format(
                            open_attr="open" if int(entry.get("seq") or 0) <= 2 else "",
                            summary=html.escape(_thinking_summary(entry)),
                            generation_observation_id=html.escape(
                                str(entry.get("generation_observation_id") or "-")
                            ),
                            model_name=html.escape(
                                str(model_context.get("model") or "-")
                            ),
                            context_badge=html.escape(context_badge),
                            context_state=html.escape(
                                str(model_context.get("context_state") or "unknown")
                            ),
                            prompt_dump_link=(
                                f'<a href="{html.escape(str(prompt_dump_html))}" target="_blank" rel="noreferrer">View model input</a>'
                                if prompt_dump_html
                                else "-"
                            ),
                            prompt_dump_json_link=(
                                f'<a href="{html.escape(str(prompt_dump_json))}" target="_blank" rel="noreferrer">Open JSON</a>'
                                if prompt_dump_json
                                else "-"
                            ),
                            thinking_header=_panel_header("Thinking", thinking_id),
                            thinking_id=html.escape(thinking_id),
                            thinking_text=html.escape(
                                str(entry.get("thinking_text") or "(empty)")
                            ),
                        )
                    )
                    continue

                tool_call = entry
                execution = (
                    tool_call.get("execution") if isinstance(tool_call, dict) else None
                )
                exec_input = None if not execution else execution.get("execution_input")
                exec_output = None if not execution else execution.get("execution_output")
                model_args_id = f"{base_id}-model-arguments"
                exec_input_id = f"{base_id}-execution-input"
                exec_output_id = f"{base_id}-execution-output"
                exec_attrs_id = f"{base_id}-execution-attributes"
                timeline_blocks.append(
                    """
                    <details class="timeline-entry tool-call" {open_attr}>
                      <summary>{summary}</summary>
                      <div class="tool-body">
                        <div class="tool-meta">
                          <span><strong>Tool:</strong> {tool_name}</span>
                          <span><strong>Tool call id:</strong> {tool_call_id}</span>
                          <span><strong>Matched execution:</strong> {matched}</span>
                          <span><strong>Exec observation id:</strong> {exec_obs_id}</span>
                          <span><strong>Exec latency:</strong> {exec_latency}</span>
                        </div>
                        <div class="tool-grid">
                          <section>
                            {model_arguments_header}
                            <pre id="{model_arguments_id}">{model_arguments}</pre>
                          </section>
                          <section>
                            {execution_input_header}
                            <pre id="{execution_input_id}">{execution_input}</pre>
                          </section>
                          <section>
                            {execution_output_header}
                            <pre id="{execution_output_id}">{execution_output}</pre>
                          </section>
                          <section>
                            {execution_attributes_header}
                            <pre id="{execution_attributes_id}">{execution_attributes}</pre>
                          </section>
                        </div>
                      </div>
                    </details>
                    """.format(
                        open_attr="open" if int(tool_call.get("seq") or 0) <= 2 else "",
                        summary=html.escape(_tool_call_summary(tool_call)),
                        tool_name=html.escape(str(tool_call.get("tool_name") or "-")),
                        tool_call_id=html.escape(str(tool_call.get("tool_call_id") or "-")),
                        matched=html.escape("yes" if execution else "no"),
                        exec_obs_id=html.escape(
                            str((execution or {}).get("observation_id") or "-")
                        ),
                        exec_latency=html.escape(
                            str((execution or {}).get("latency_ms") or "-")
                        ),
                        model_arguments_header=_panel_header(
                            "Model arguments", model_args_id
                        ),
                        model_arguments_id=html.escape(model_args_id),
                        model_arguments=html.escape(
                            str(tool_call.get("tool_arguments_raw") or "-")
                        ),
                        execution_input_header=_panel_header(
                            "Execution input", exec_input_id
                        ),
                        execution_input_id=html.escape(exec_input_id),
                        execution_input=html.escape(
                            _pretty_json(exec_input) if exec_input is not None else "-"
                        ),
                        execution_output_header=_panel_header(
                            "Execution output", exec_output_id
                        ),
                        execution_output_id=html.escape(exec_output_id),
                        execution_output=html.escape(
                            _pretty_json(exec_output) if exec_output is not None else "-"
                        ),
                        execution_attributes_header=_panel_header(
                            "Execution attributes", exec_attrs_id
                        ),
                        execution_attributes_id=html.escape(exec_attrs_id),
                        execution_attributes=html.escape(
                            _pretty_json((execution or {}).get("attributes") or {})
                            if execution
                            else "-"
                        ),
                    )
                )

            turn_blocks.append(
                """
                <details class="turn" {open_attr}>
                  <summary>
                    <span class="turn-index">Turn {turn_index}</span>
                    <span class="turn-question">{question}</span>
                    <span class="turn-meta">{timeline_count} items · {tool_count} tool · {thinking_count} thinking</span>
                  </summary>
                  <div class="turn-body">
                    <div class="turn-info">
                      <span><strong>Latency:</strong> {latency}</span>
                      <span><strong>Reason:</strong> {reason}</span>
                      <span><strong>Trace:</strong> {trace_html}</span>
                    </div>
                    <div class="message-grid">
                      <section>
                        <h4>User question</h4>
                        <pre>{user_message}</pre>
                      </section>
                      <section>
                        <h4>Assistant reply</h4>
                        <pre>{assistant_text}</pre>
                      </section>
                    </div>
                    <div class="timeline-list">{timeline_blocks}</div>
                  </div>
                </details>
                """.format(
                    open_attr="open" if int(turn.get("turn_index") or 0) == 1 else "",
                    turn_index=html.escape(str(turn.get("turn_index") or "-")),
                    question=html.escape(
                        str(turn.get("user_message") or "(empty)").strip().replace("\n", " ")[:180]
                    ),
                    timeline_count=html.escape(str(turn.get("timeline_entry_count") or 0)),
                    tool_count=html.escape(str(turn.get("tool_call_count") or 0)),
                    thinking_count=html.escape(str(turn.get("thinking_count") or 0)),
                    latency=html.escape(str(turn.get("latency_ms") or "-")),
                    reason=html.escape(str(turn.get("reason") or "-")),
                    trace_html=(
                        f'<a href="{html.escape(str(turn.get("view_log_url")))}" '
                        f'target="_blank" rel="noreferrer">{html.escape(str(turn.get("langfuse_trace_id") or "-"))}</a>'
                        if turn.get("view_log_url")
                        else html.escape(str(turn.get("langfuse_trace_id") or "-"))
                    ),
                    user_message=html.escape(str(turn.get("user_message") or "(empty)")),
                    assistant_text=html.escape(str(turn.get("assistant_text") or "(empty)")),
                    timeline_blocks="".join(timeline_blocks) or '<p class="empty">No timeline items.</p>',
                )
            )

        conversation_html = html.escape(str(conversation.get("conversation_id") or "-"))
        if conversation.get("conversation_url"):
            conversation_html = (
                f'<a href="{html.escape(str(conversation["conversation_url"]))}" '
                f'target="_blank" rel="noreferrer">{conversation_html}</a>'
            )

        cards.append(
            """
            <details class="conversation {status}" data-status="{status}" data-case-id="{case_id}" data-title="{title}" data-conversation-id="{conversation_id}">
              <summary>
                <span class="badge {status}">{status_label}</span>
                <strong>#{case_index} {title_text}</strong>
                <span class="summary-meta">Conv {conversation_id_text} · {turn_count} turns</span>
              </summary>
              <div class="conversation-body">
                <p><strong>Case ID:</strong> {case_id_text}</p>
                <p><strong>Conversation:</strong> {conversation_link}</p>
                <p><strong>Objective:</strong> {objective}</p>
                <p><strong>Completed reason:</strong> {completed_reason}</p>
                <p><strong>Failure reason:</strong> {failure_reason}</p>
                <div class="turn-list">{turn_blocks}</div>
              </div>
            </details>
            """.format(
                status=html.escape(str(conversation.get("status") or "unknown")),
                status_label=html.escape(_badge_label(str(conversation.get("status") or ""))),
                case_index=html.escape(str(conversation.get("case_index") or "-")),
                title_text=html.escape(str(conversation.get("title") or conversation.get("case_id") or "-")),
                conversation_id_text=html.escape(str(conversation.get("conversation_id") or "-")),
                turn_count=html.escape(str(len(conversation.get("turns") or []))),
                case_id=html.escape(str(conversation.get("case_id") or "")),
                title=html.escape(str(conversation.get("title") or "")),
                conversation_id=html.escape(str(conversation.get("conversation_id") or "")),
                case_id_text=html.escape(str(conversation.get("case_id") or "-")),
                conversation_link=conversation_html,
                objective=html.escape(str(conversation.get("objective") or "-")),
                completed_reason=html.escape(str(conversation.get("completed_reason") or "-")),
                failure_reason=html.escape(str(conversation.get("failure_reason") or "-")),
                turn_blocks="".join(turn_blocks),
            )
        )

    return """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <style>
    body {{
      margin: 0;
      font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
      background: linear-gradient(180deg, #f5f1e8 0%, #eee7d6 100%);
      color: #1f2933;
    }}
    .page {{
      max-width: 1600px;
      margin: 0 auto;
      padding: 24px;
    }}
    .hero, .conversation, .turn, .timeline-entry {{
      background: #fffdf8;
      border: 1px solid #ded7c9;
      border-radius: 16px;
      box-shadow: 0 10px 24px rgba(31, 41, 51, 0.06);
    }}
    .hero {{
      padding: 20px;
      margin-bottom: 18px;
    }}
    .stats {{
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 14px;
    }}
    .stat {{
      background: #fff;
      border: 1px solid #ded7c9;
      border-radius: 12px;
      padding: 10px 14px;
      min-width: 120px;
    }}
    .toolbar {{
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 0 0 18px;
      align-items: center;
    }}
    .filter-btn {{
      border: 1px solid #ded7c9;
      background: #fff;
      color: #1f2933;
      border-radius: 999px;
      padding: 8px 14px;
      cursor: pointer;
      font: inherit;
    }}
    .filter-btn.active {{
      background: #1f2933;
      color: #fffdf8;
      border-color: #1f2933;
    }}
    .toolbar input {{
      flex: 1 1 320px;
      min-width: 240px;
      border: 1px solid #ded7c9;
      border-radius: 999px;
      padding: 9px 14px;
      font: inherit;
      background: #fff;
    }}
    details {{
      margin-bottom: 14px;
    }}
    summary {{
      list-style: none;
      cursor: pointer;
    }}
    .conversation > summary {{
      display: flex;
      gap: 12px;
      align-items: center;
      padding: 16px 18px;
    }}
    .conversation-body {{
      padding: 0 18px 18px;
    }}
    .conversation.hidden {{
      display: none;
    }}
    .badge {{
      display: inline-block;
      min-width: 72px;
      text-align: center;
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      text-transform: uppercase;
    }}
    .badge.success {{
      background: #eefaf8;
      color: #0f766e;
    }}
    .badge.failed {{
      background: #fff1f1;
      color: #b42318;
    }}
    .badge.handoff {{
      background: #fff7e8;
      color: #b54708;
    }}
    .summary-meta {{
      color: #6b7280;
      margin-left: auto;
    }}
    .turn-list {{
      margin-top: 16px;
    }}
    .turn {{
      margin: 14px 0 0;
      border-color: #ebe2d1;
    }}
    .turn > summary {{
      display: grid;
      grid-template-columns: 90px 1fr 120px;
      gap: 12px;
      padding: 14px 16px;
      align-items: center;
    }}
    .turn-index {{
      font-weight: 700;
      color: #7c5e10;
    }}
    .turn-question {{
      color: #1f2933;
    }}
    .turn-meta {{
      justify-self: end;
      color: #6b7280;
    }}
    .turn-body {{
      padding: 0 16px 16px;
    }}
    .turn-info {{
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 12px;
    }}
    .message-grid, .tool-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }}
    .tool-grid {{
      grid-template-columns: 1fr 1fr;
    }}
    .timeline-list {{
      margin-top: 16px;
    }}
    .timeline-entry {{
      border: 1px solid #ebe2d1;
      margin-bottom: 10px;
      background: #fffaf1;
    }}
    .timeline-entry.thinking {{
      background: #f7fbff;
      border-color: #d7e8f7;
    }}
    .timeline-entry > summary {{
      padding: 12px 14px;
      font-weight: 600;
    }}
    .tool-body {{
      padding: 0 14px 14px;
    }}
    .tool-meta {{
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 12px;
    }}
    .panel-head {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }}
    .panel-head h5 {{
      margin: 0;
    }}
    .copy-btn {{
      border: 1px solid #ded7c9;
      background: #fff;
      color: #1f2933;
      border-radius: 999px;
      padding: 6px 10px;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      flex: 0 0 auto;
    }}
    .copy-btn.copied {{
      background: #0f766e;
      color: #fff;
      border-color: #0f766e;
    }}
    pre {{
      white-space: pre-wrap;
      word-break: break-word;
      background: #f8f5ef;
      border-radius: 12px;
      padding: 12px;
      margin: 0;
      max-height: 420px;
      overflow: auto;
    }}
    .empty {{
      color: #6b7280;
    }}
    a {{
      color: #0f766e;
      text-decoration: none;
    }}
    @media (max-width: 980px) {{
      .turn > summary,
      .message-grid,
      .tool-grid {{
        grid-template-columns: 1fr;
      }}
      .summary-meta,
      .turn-meta {{
        margin-left: 0;
        justify-self: start;
      }}
    }}
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <h1>{suite_name}</h1>
      <p>Generated at {generated_at}</p>
      <p>Source report: {source_path}</p>
      <div class="stats">
        <div class="stat"><strong>{conversation_count}</strong><div>Conversations</div></div>
        <div class="stat"><strong>{trace_fetch_count}</strong><div>Traces fetched</div></div>
        <div class="stat"><strong>{success_count}</strong><div>Success</div></div>
        <div class="stat"><strong>{handoff_count}</strong><div>Handoff</div></div>
        <div class="stat"><strong>{failed_count}</strong><div>Failure</div></div>
      </div>
    </section>
    <section class="toolbar">
      <button class="filter-btn active" data-filter="all">All ({conversation_count})</button>
      <button class="filter-btn" data-filter="success">Success ({success_count})</button>
      <button class="filter-btn" data-filter="handoff">Handoff ({handoff_count})</button>
      <button class="filter-btn" data-filter="failed">Failure ({failed_count})</button>
      <input id="conversation-search" type="search" placeholder="Filter by case id, title, conversation id">
    </section>
    {cards}
  </div>
  <script>
    const buttons = Array.from(document.querySelectorAll('.filter-btn'));
    const cards = Array.from(document.querySelectorAll('.conversation'));
    const searchInput = document.getElementById('conversation-search');
    let currentFilter = 'all';

    function applyFilters() {{
      const needle = (searchInput.value || '').trim().toLowerCase();
      cards.forEach((card) => {{
        const status = card.dataset.status || '';
        const haystack = [
          card.dataset.caseId || '',
          card.dataset.title || '',
          card.dataset.conversationId || '',
        ].join(' ').toLowerCase();
        const statusOk = currentFilter === 'all' || status === currentFilter;
        const searchOk = !needle || haystack.includes(needle);
        card.classList.toggle('hidden', !(statusOk && searchOk));
      }});
    }}

    buttons.forEach((button) => {{
      button.addEventListener('click', () => {{
        currentFilter = button.dataset.filter || 'all';
        buttons.forEach((item) => item.classList.toggle('active', item === button));
        applyFilters();
      }});
    }});
    searchInput.addEventListener('input', applyFilters);

    async function copyTextFromTarget(targetId, button) {{
      const node = document.getElementById(targetId);
      if (!node) {{
        return;
      }}
      const text = node.textContent || '';
      try {{
        await navigator.clipboard.writeText(text);
        const original = button.textContent;
        button.textContent = 'Copied';
        button.classList.add('copied');
        window.setTimeout(() => {{
          button.textContent = original;
          button.classList.remove('copied');
        }}, 1200);
      }} catch (_error) {{
        button.textContent = 'Copy failed';
        window.setTimeout(() => {{
          button.textContent = 'Copy';
        }}, 1200);
      }}
    }}

    document.querySelectorAll('.copy-btn').forEach((button) => {{
      button.addEventListener('click', () => {{
        copyTextFromTarget(button.dataset.copyTarget || '', button);
      }});
    }});

    applyFilters();
  </script>
</body>
</html>
""".format(
        title=html.escape(str(report.get("suite_name") or "langfuse-tool-calls")),
        suite_name=html.escape(str(report.get("suite_name") or "langfuse-tool-calls")),
        generated_at=html.escape(str(report.get("run_generated_at") or "")),
        source_path=html.escape(str(source_path)),
        conversation_count=html.escape(str(report.get("conversation_count") or 0)),
        trace_fetch_count=html.escape(str(report.get("trace_fetch_count") or 0)),
        success_count=html.escape(str(report.get("success_count") or 0)),
        handoff_count=html.escape(str(report.get("handoff_count") or 0)),
        failed_count=html.escape(str(report.get("failed_count") or 0)),
        cards="".join(cards),
    )


def main() -> int:
    args = parse_args()
    raw_path = Path(args.raw_file).expanduser().resolve()
    if not raw_path.exists():
        raise SystemExit(f"Raw report not found: {raw_path}")

    artifact_base = _artifact_base_from_raw(raw_path)
    json_output = (
        Path(args.json_output).expanduser().resolve()
        if args.json_output
        else artifact_base.with_suffix(".json")
    )
    html_output = (
        Path(args.html_output).expanduser().resolve()
        if args.html_output
        else artifact_base.with_suffix(".html")
    )

    raw_report = _load_json(raw_path)
    enriched_report = build_enriched_report(raw_report)
    _annotate_context_window_usage(enriched_report)
    _write_prompt_dump_files(enriched_report, html_output=html_output)

    json_output.write_text(
        json.dumps(enriched_report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    html_output.write_text(
        build_html_report(enriched_report, raw_path),
        encoding="utf-8",
    )

    print(str(json_output))
    print(str(html_output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

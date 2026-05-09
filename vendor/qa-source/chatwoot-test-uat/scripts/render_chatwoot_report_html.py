#!/usr/bin/env python3
from __future__ import annotations

import argparse
import html
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from chatwoot_runner_core import (
    count_failure_results,
    count_handoff_results,
    count_success_results,
    enrich_turn_with_trace_data,
    is_handoff_result,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render an HTML viewer for a chatwoot test runner raw report."
    )
    parser.add_argument("--raw-file", required=True, help="Path to the -raw.json report file.")
    parser.add_argument("--output-file", help="Optional HTML output path.")
    return parser.parse_args()


def html_output_path_from_raw(raw_path: Path) -> Path:
    stem = raw_path.stem
    if stem.endswith("-raw"):
        stem = stem[: -len("-raw")]
    return raw_path.with_name(f"{stem}.html")


def _status_class(result: dict[str, Any]) -> str:
    if is_handoff_result(result):
        return "handoff"
    return "success" if result.get("succeeded") else "failed"


def _status_label(status: str) -> str:
    return {"success": "Success", "handoff": "Handoff", "failed": "Failure"}.get(
        status, status.title()
    )


def _pretty_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2)


def _chatwoot_conversation_url(
    *,
    base_url: str | None,
    account_id: Any,
    conversation_id: Any,
) -> str | None:
    if not base_url or account_id in (None, "") or conversation_id in (None, ""):
        return None
    return (
        f"{str(base_url).rstrip('/')}/app/accounts/{account_id}/conversations/{conversation_id}"
    )


def _render_trace_links(turn: dict[str, Any]) -> str:
    enriched = enrich_turn_with_trace_data(turn)
    pairs: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()

    for detail in enriched.get("message_trace_details") or []:
        if not isinstance(detail, dict):
            continue
        trace_id = str(
            detail.get("langfuse_trace_id")
            or detail.get("message_id")
            or detail.get("trace_id")
            or ""
        ).strip()
        url = str(
            detail.get("view_log_url")
            or detail.get("langfuse_trace_url")
            or ""
        ).strip()
        if not trace_id or not url:
            continue
        pair = (trace_id, url)
        if pair in seen:
            continue
        seen.add(pair)
        pairs.append(pair)

    if not pairs:
        trace_id = str(
            enriched.get("langfuse_trace_id")
            or enriched.get("trace_id")
            or ""
        ).strip()
        url = str(
            enriched.get("view_log_url")
            or enriched.get("langfuse_trace_url")
            or ""
        ).strip()
        if trace_id and url:
            pairs.append((trace_id, url))

    if not pairs:
        return ""

    links = " ".join(
        (
            f'<a class="trace-link" href="{html.escape(url)}" target="_blank" '
            f'rel="noreferrer">View log {html.escape(trace_id)}</a>'
        )
        for trace_id, url in pairs
    )
    return f'<div class="trace-links">{links}</div>'


def build_html_report(report: dict[str, Any], raw_path: Path) -> str:
    def sort_rank(item: dict[str, Any]) -> tuple[int, int]:
        status = _status_class(item)
        rank = {"failed": 0, "handoff": 1, "success": 2}.get(status, 3)
        return (rank, int(item.get("case_index") or 0))

    results = sorted(
        list(report.get("results") or []),
        key=sort_rank,
    )
    generated_at = report.get("run_generated_at") or datetime.now().isoformat()
    runtime = report.get("runtime") if isinstance(report.get("runtime"), dict) else {}
    source_trace = (
        report.get("source_trace") if isinstance(report.get("source_trace"), dict) else {}
    )
    source_trace_url = source_trace.get("conversation_url")
    if not source_trace_url:
        source_trace_url = _chatwoot_conversation_url(
            base_url=source_trace.get("chatwoot_base_url"),
            account_id=source_trace.get("account_id"),
            conversation_id=source_trace.get("conversation_id"),
        )
    source_trace_block = ""
    if source_trace_url:
        source_trace_block = (
            '<p><strong>Source trace:</strong> '
            f'<a href="{html.escape(str(source_trace_url))}">{html.escape(str(source_trace_url))}</a>'
            "</p>"
        )
    status_counts = {
        "success": report.get("success_count") or count_success_results(results),
        "handoff": report.get("handoff_count") or count_handoff_results(results),
        "failed": report.get("failure_count") or count_failure_results(results),
    }
    cards = []
    for result in results:
        status = _status_class(result)
        conversation_url = _chatwoot_conversation_url(
            base_url=runtime.get("chatwoot_api_base"),
            account_id=runtime.get("account_id"),
            conversation_id=result.get("conversation_id"),
        )
        conversation_html = html.escape(str(result.get("conversation_id") or ""))
        if conversation_url:
            conversation_html = (
                f'<a href="{html.escape(conversation_url)}">{conversation_html}</a>'
            )
        turns = []
        for turn in result.get("turns") or []:
            trace_links = _render_trace_links(turn)
            user_message = str(turn.get("user_message") or "").strip() or "(empty)"
            assistant_text = str(turn.get("assistant_text") or "").strip() or "(empty)"
            turns.append(
                """
                <div class="turn">
                  <div class="head">Turn {idx} · {latency} ms · {reason}</div>
                  {trace_links}
                  <div class="grid">
                    <section><h4>User</h4><pre>{user}</pre></section>
                    <section><h4>Assistant</h4><pre>{assistant}</pre></section>
                  </div>
                </div>
                """.format(
                    idx=html.escape(str(turn.get("turn_index") or "")),
                    latency=html.escape(str(turn.get("latency_ms") or "")),
                    reason=html.escape(str(turn.get("reason") or "")),
                    trace_links=trace_links,
                    user=html.escape(user_message),
                    assistant=html.escape(assistant_text),
                )
            )
        ticket_code = str(result.get("ticket_code") or "").strip()
        booking_code = str(result.get("booking_code") or "").strip()
        payment_link = str(result.get("payment_link") or "").strip()
        objective = str(result.get("objective") or "").strip()
        cards.append(
            """
            <details class="case {status}" data-status="{status}" data-case-id="{case_id_attr}" data-title="{title_attr}" data-reason="{reason_attr}" {opened}>
              <summary>
                <span class="badge {status}">{status}</span>
                <strong>#{index} {title}</strong>
                <span class="meta">{reason}</span>
              </summary>
              <div class="body">
                <p><strong>Case ID:</strong> {case_id}</p>
                <p><strong>Objective:</strong> {objective}</p>
                <p><strong>Conversation:</strong> {conversation_id}</p>
                <p><strong>User turns:</strong> {user_turn_count}</p>
                <p><strong>Ticket code:</strong> {ticket_code}</p>
                <p><strong>Booking code:</strong> {booking_code}</p>
                <p><strong>Payment link:</strong> {payment_link}</p>
                <p><strong>Failure:</strong> {failure}</p>
                <div class="turns">{turns}</div>
              </div>
            </details>
            """.format(
                status=status,
                case_id_attr=html.escape(str(result.get("case_id") or "")),
                title_attr=html.escape(str(result.get("title") or result.get("case_id") or "")),
                reason_attr=html.escape(str(result.get("completed_reason") or "")),
                opened="open" if status != "success" else "",
                index=html.escape(str(result.get("case_index") or "")),
                title=html.escape(str(result.get("title") or result.get("case_id") or "")),
                reason=html.escape(str(result.get("completed_reason") or "")),
                case_id=html.escape(str(result.get("case_id") or "")),
                objective=html.escape(objective or "-"),
                conversation_id=conversation_html,
                user_turn_count=html.escape(str(result.get("user_turn_count") or 0)),
                ticket_code=html.escape(ticket_code or "-"),
                booking_code=html.escape(booking_code or "-"),
                payment_link=html.escape(payment_link or "-"),
                failure=html.escape(str(result.get("failure_reason") or "")),
                turns="".join(turns),
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
      background: #f6f1e7;
      color: #1f2933;
    }}
    .page {{
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
    }}
    .hero, .case {{
      background: #fffdf8;
      border: 1px solid #ded7c9;
      border-radius: 16px;
      box-shadow: 0 10px 24px rgba(31, 41, 51, 0.08);
      margin-bottom: 16px;
    }}
    .hero {{
      padding: 20px;
    }}
    .stats {{
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }}
    .toolbar {{
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin: 18px 0 20px;
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
      flex: 1 1 280px;
      min-width: 220px;
      border: 1px solid #ded7c9;
      border-radius: 999px;
      padding: 9px 14px;
      font: inherit;
      background: #fff;
    }}
    .stat {{
      background: #fff;
      border: 1px solid #ded7c9;
      border-radius: 12px;
      padding: 10px 14px;
    }}
    summary {{
      list-style: none;
      cursor: pointer;
      padding: 16px 18px;
      display: flex;
      gap: 12px;
      align-items: center;
    }}
    .body {{
      padding: 0 18px 18px;
    }}
    .case.hidden {{
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
    .meta {{
      color: #6b7280;
    }}
    .grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }}
    .turn {{
      border-top: 1px solid #ece6d8;
      padding-top: 12px;
      margin-top: 12px;
    }}
    .turn .head {{
      color: #6b7280;
      margin-bottom: 8px;
      font-size: 13px;
    }}
    .trace-links {{
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }}
    .trace-link {{
      display: inline-block;
      text-decoration: none;
      color: #0f766e;
      background: #eefaf8;
      border: 1px solid #b7e4dd;
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
    }}
    pre {{
      white-space: pre-wrap;
      word-break: break-word;
      background: #f8f5ef;
      border-radius: 12px;
      padding: 12px;
      margin: 0;
    }}
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <h1>{suite_name}</h1>
      <p>Generated at {generated_at}</p>
      <p>Raw file: {raw_path}</p>
      {source_trace_block}
      <div class="stats">
        <div class="stat"><strong>{total}</strong><div>Total</div></div>
        <div class="stat"><strong>{success}</strong><div>Success</div></div>
        <div class="stat"><strong>{handoff}</strong><div>Handoff</div></div>
        <div class="stat"><strong>{failure}</strong><div>Failure</div></div>
      </div>
    </section>
    <section class="toolbar">
      <button class="filter-btn active" data-filter="all">All ({total})</button>
      <button class="filter-btn" data-filter="success">Success ({success})</button>
      <button class="filter-btn" data-filter="handoff">Handoff ({handoff})</button>
      <button class="filter-btn" data-filter="failed">Failure ({failure})</button>
      <input id="case-search" type="search" placeholder="Filter by case id, title, or reason">
    </section>
    {cards}
  </div>
  <script>
    const buttons = Array.from(document.querySelectorAll('.filter-btn'));
    const cards = Array.from(document.querySelectorAll('.case'));
    const searchInput = document.getElementById('case-search');
    let currentFilter = 'all';

    function applyFilters() {{
      const needle = (searchInput.value || '').trim().toLowerCase();
      cards.forEach((card) => {{
        const status = card.dataset.status || '';
        const haystack = [
          card.dataset.caseId || '',
          card.dataset.title || '',
          card.dataset.reason || '',
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
    applyFilters();
  </script>
</body>
</html>
""".format(
        title=html.escape(str(report.get("suite_name") or "chatwoot-report")),
        suite_name=html.escape(str(report.get("suite_name") or "chatwoot-report")),
        generated_at=html.escape(str(generated_at)),
        raw_path=html.escape(str(raw_path)),
        source_trace_block=source_trace_block,
        total=html.escape(str(report.get("total_case_count") or len(results))),
        success=html.escape(str(status_counts["success"])),
        handoff=html.escape(str(status_counts["handoff"])),
        failure=html.escape(str(status_counts["failed"])),
        cards="".join(cards),
    )


def write_html_report(raw_path: Path, output_path: Path | None = None) -> Path:
    report = json.loads(raw_path.read_text(encoding="utf-8"))
    if not isinstance(report, dict):
        raise RuntimeError("Raw report must be a JSON object.")
    output = output_path or html_output_path_from_raw(raw_path)
    output.write_text(build_html_report(report, raw_path), encoding="utf-8")
    return output


def main() -> int:
    args = parse_args()
    raw_path = Path(args.raw_file).expanduser().resolve()
    output_path = (
        Path(args.output_file).expanduser().resolve()
        if args.output_file
        else None
    )
    written = write_html_report(raw_path, output_path)
    print(str(written))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

from __future__ import annotations

import sys
from pathlib import Path


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from chatwoot_runner_core import (  # noqa: E402
    build_langfuse_trace_url,
    enrich_turn_with_trace_data,
    extract_message_trace_metadata,
)


def test_extract_message_trace_metadata_builds_view_log_url_from_trace_id() -> None:
    message = {
        "id": 123,
        "additional_attributes": {
            "trace_id": "internal-trace-1",
            "langfuse_trace_id": "019dbf63213173c042b1b12065b09204",
        },
    }

    metadata = extract_message_trace_metadata(message)

    expected_url = build_langfuse_trace_url("019dbf63213173c042b1b12065b09204")
    assert metadata["trace_id"] == "internal-trace-1"
    assert metadata["langfuse_trace_id"] == "019dbf63213173c042b1b12065b09204"
    assert metadata["langfuse_trace_url"] == expected_url
    assert metadata["view_log_url"] == expected_url


def test_extract_message_trace_metadata_prefers_direct_view_log_link() -> None:
    message = {
        "id": 456,
        "content_attributes": {
            "actions": [
                {
                    "type": "link",
                    "label": "View log",
                    "uri": "https://langfuse.vexere.com/project/ai/traces/019dbf61ae9d7c88a9153f98fa247e84",
                }
            ]
        },
    }

    metadata = extract_message_trace_metadata(message)

    assert metadata["langfuse_trace_id"] == "019dbf61ae9d7c88a9153f98fa247e84"
    assert (
        metadata["view_log_url"]
        == "https://langfuse.vexere.com/project/ai/traces?peek=019dbf61ae9d7c88a9153f98fa247e84"
    )


def test_enrich_turn_with_trace_data_aggregates_message_level_trace_links() -> None:
    turn = {
        "turn_index": 1,
        "messages": [
            {
                "id": 1001,
                "additional_attributes": {
                    "langfuse_trace_id": "trace-one",
                },
            },
            {
                "id": 1002,
                "content_attributes": {
                    "actions": [
                        {
                            "uri": "https://langfuse.vexere.com/project/ai/traces?peek=trace-two",
                        }
                    ]
                },
            },
        ],
    }

    enriched = enrich_turn_with_trace_data(turn)

    assert enriched["langfuse_trace_id"] == "trace-one"
    assert enriched["langfuse_trace_ids"] == ["trace-one", "trace-two"]
    assert enriched["view_log_urls"] == [
        "https://langfuse.vexere.com/project/ai/traces?peek=trace-one",
        "https://langfuse.vexere.com/project/ai/traces?peek=trace-two",
    ]
    assert enriched["messages"][0]["view_log_url"] == (
        "https://langfuse.vexere.com/project/ai/traces?peek=trace-one"
    )
    assert enriched["messages"][1]["view_log_url"] == (
        "https://langfuse.vexere.com/project/ai/traces?peek=trace-two"
    )
    assert len(enriched["message_trace_details"]) == 2

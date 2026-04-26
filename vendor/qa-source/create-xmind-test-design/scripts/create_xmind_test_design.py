#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import re
import shutil
import subprocess
import textwrap
import unicodedata
import uuid
import warnings
import zipfile
from html import escape
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

warnings.filterwarnings("ignore", message=r"urllib3 v2 only supports OpenSSL 1\.1\.1\+.*")

import requests


SCRIPT_PATH = Path(__file__).resolve()
SKILL_DIR = SCRIPT_PATH.parent.parent


def resolve_repo_root() -> Path:
    for candidate in [SKILL_DIR, *SKILL_DIR.parents]:
        if (candidate / "package.json").exists() or (candidate / ".qa-automation.json").exists():
            return candidate
    return Path.cwd().resolve()


REPO_ROOT = resolve_repo_root()
DEFAULT_BASE_URL = "https://jira.vexere.net"
DEFAULT_OUTPUT_DIR = REPO_ROOT / "qa" / "xmind-test-design"
MAIN_TOPIC_COLORS = ["#FFC947", "#E46D57", "#1F3C88", "#9BFFED", "#070D59"]
CANVAS_FILL = "#F6F5F5"
ROOT_FILL = "#070D59"
DARK_TEXT = "#111827"
LIGHT_TEXT = "#FFFFFF"
PLACEHOLDER_PATTERN = re.compile(r"\b(fill|replace|update)\b", re.IGNORECASE)
ALWAYS_TESTDESIGN_LABEL = "AI_testdesign"

THEME_MAP = {
    "map": {
        "id": "4bac613d-461c-49e9-ac6f-4d4c13a3c478",
        "properties": {
            "svg:fill": CANVAS_FILL,
            "multi-line-colors": "#FFC947 #E46D57 #1F3C88",
            "color-list": "#F6F5F5 #9BFFED #FFC947 #E46D57 #1F3C88 #070D59",
            "line-tapered": "none",
        },
    },
    "centralTopic": {
        "id": "622c200c-7da7-45b1-9e58-9e97767017d0",
        "properties": {
            "fo:font-family": "Montserrat",
            "fo:font-size": "24pt",
            "fo:font-weight": "500",
            "fo:font-style": "normal",
            "fo:color": LIGHT_TEXT,
            "fo:text-transform": "manual",
            "fo:text-decoration": "none",
            "fo:text-align": "center",
            "svg:fill": ROOT_FILL,
            "fill-pattern": "solid",
            "line-width": "3pt",
            "line-color": ROOT_FILL,
            "line-pattern": "solid",
            "border-line-color": "inherited",
            "border-line-width": "3pt",
            "border-line-pattern": "inherited",
            "shape-class": "org.xmind.topicShape.roundedRect",
            "line-class": "org.xmind.branchConnection.roundedElbow",
            "arrow-end-class": "org.xmind.arrowShape.none",
            "alignment-by-level": "actived",
        },
    },
    "mainTopic": {
        "id": "5d07f605-bee0-4077-9b54-cee390c728fb",
        "properties": {
            "fo:font-family": "Montserrat",
            "fo:font-size": "18pt",
            "fo:font-weight": "400",
            "fo:font-style": "normal",
            "fo:color": DARK_TEXT,
            "fo:text-transform": "manual",
            "fo:text-decoration": "none",
            "fo:text-align": "left",
            "svg:fill": "inherited",
            "fill-pattern": "solid",
            "line-width": "2pt",
            "line-color": "inherited",
            "line-pattern": "inherited",
            "border-line-color": "inherited",
            "border-line-width": "0pt",
            "border-line-pattern": "inherited",
            "shape-class": "org.xmind.topicShape.roundedRect",
            "line-class": "org.xmind.branchConnection.roundedElbow",
            "arrow-end-class": "inherited",
        },
    },
    "subTopic": {
        "id": "a3fb797b-5984-4a1d-ac96-5af95f4609be",
        "properties": {
            "fo:font-family": "Montserrat",
            "fo:font-size": "14pt",
            "fo:font-weight": "400",
            "fo:font-style": "normal",
            "fo:color": DARK_TEXT,
            "fo:text-transform": "manual",
            "fo:text-decoration": "none",
            "fo:text-align": "left",
            "svg:fill": "inherited",
            "fill-pattern": "none",
            "line-width": "inherited",
            "line-color": "inherited",
            "line-pattern": "inherited",
            "border-line-color": "inherited",
            "border-line-width": "2pt",
            "border-line-pattern": "inherited",
            "shape-class": "org.xmind.topicShape.roundedRect",
            "line-class": "org.xmind.branchConnection.roundedElbow",
            "arrow-end-class": "inherited",
        },
    },
    "floatingTopic": {
        "id": "53086b81-aba0-4f6c-9ce1-26eb21453b68",
        "properties": {
            "fo:font-family": "Montserrat",
            "fo:font-size": "14pt",
            "fo:font-weight": "normal",
            "fo:font-style": "normal",
            "fo:color": "inherited",
            "fo:text-transform": "manual",
            "fo:text-decoration": "none",
            "fo:text-align": "center",
            "svg:fill": "#FFC947",
            "fill-pattern": "solid",
            "line-width": "2pt",
            "line-color": "inherited",
            "line-pattern": "solid",
            "border-line-color": "#FFC947",
            "border-line-width": "0pt",
            "border-line-pattern": "inherited",
            "shape-class": "org.xmind.topicShape.roundedRect",
            "line-class": "org.xmind.branchConnection.roundedElbow",
            "arrow-end-class": "org.xmind.arrowShape.none",
        },
    },
    "summaryTopic": {
        "id": "6de847cf-9083-423f-b858-28903eba6c7f",
        "properties": {
            "fo:font-family": "Montserrat",
            "fo:font-size": "14pt",
            "fo:font-weight": "400",
            "fo:font-style": "normal",
            "fo:color": "inherited",
            "fo:text-transform": "manual",
            "fo:text-decoration": "none",
            "fo:text-align": "center",
            "svg:fill": "#E46D57",
            "fill-pattern": "none",
            "line-width": "inherited",
            "line-color": "inherited",
            "line-pattern": "inherited",
            "border-line-color": "#E46D57",
            "border-line-width": "2",
            "border-line-pattern": "inherited",
            "shape-class": "org.xmind.topicShape.roundedRect",
            "line-class": "org.xmind.branchConnection.roundedElbow",
            "arrow-end-class": "inherited",
        },
    },
    "calloutTopic": {
        "id": "735f4619-314c-46c8-9ea4-6b2966f652e1",
        "properties": {
            "fo:font-family": "Montserrat",
            "fo:font-size": "14pt",
            "fo:font-weight": "400",
            "fo:font-style": "normal",
            "fo:color": "inherited",
            "fo:text-transform": "manual",
            "fo:text-decoration": "none",
            "fo:text-align": "left",
            "svg:fill": "#E46D57",
            "fill-pattern": "solid",
            "line-width": "inherited",
            "line-color": "inherited",
            "line-pattern": "inherited",
            "border-line-color": "#E46D57",
            "border-line-width": "inherited",
            "border-line-pattern": "inherited",
            "shape-class": "org.xmind.topicShape.roundedRect",
            "arrow-end-class": "inherited",
        },
    },
    "importantTopic": {
        "id": "2a28c13b-1f39-4c1c-9718-4d9ad388ea6a",
        "properties": {
            "svg:fill": "#6a1f87",
            "fill-pattern": "solid",
            "border-line-color": "#6a1f87",
        },
    },
    "minorTopic": {
        "id": "18635a1d-ce14-491e-9d5c-b354dcb1db70",
        "properties": {
            "svg:fill": "#861f56",
            "fill-pattern": "solid",
            "border-line-color": "#861f56",
        },
    },
    "expiredTopic": {
        "id": "031d7958-2197-44b9-b18a-dec495314c3c",
        "properties": {
            "fo:text-decoration": "line-through",
            "fill-pattern": "none",
        },
    },
    "boundary": {
        "id": "bf069cd9-1e72-43dc-8d7e-737296bf6bc4",
        "properties": {
            "fo:font-family": "'Montserrat','NeverMind','Microsoft YaHei','PingFang SC','Microsoft JhengHei','sans-serif',sans-serif",
            "fo:font-size": "14pt",
            "fo:font-weight": "400",
            "fo:font-style": "normal",
            "fo:color": "inherited",
            "fo:text-transform": "manual",
            "fo:text-decoration": "none",
            "fo:text-align": "center",
            "svg:fill": ROOT_FILL,
            "fill-pattern": "solid",
            "line-width": "1",
            "line-color": ROOT_FILL,
            "line-pattern": "dash",
            "shape-class": "org.xmind.boundaryShape.roundedRect",
        },
    },
    "summary": {
        "id": "9a0603bf-b33d-474b-897b-fe0f74c3c921",
        "properties": {
            "line-width": "2",
            "line-color": ROOT_FILL,
            "line-pattern": "solid",
            "shape-class": "org.xmind.summaryShape.square",
        },
    },
    "relationship": {
        "id": "c4a37bf2-442b-457a-bdc1-270e54b9bc25",
        "properties": {
            "fo:font-family": "'Montserrat','NeverMind','Microsoft YaHei','PingFang SC','Microsoft JhengHei','sans-serif',sans-serif",
            "fo:font-size": "13pt",
            "fo:font-weight": "400",
            "fo:font-style": "normal",
            "fo:color": "inherited",
            "fo:text-transform": "manual",
            "fo:text-decoration": "none",
            "fo:text-align": "center",
            "line-width": "1",
            "line-color": ROOT_FILL,
            "line-pattern": "dot",
            "shape-class": "org.xmind.relationshipShape.curved",
            "arrow-begin-class": "org.xmind.arrowShape.dot",
            "arrow-end-class": "org.xmind.arrowShape.triangle",
        },
    },
    "skeletonThemeId": "e61ab87dcac9e31dc0adba85ce",
    "colorThemeId": "Variety-#F6F5F5-MULTI_LINE_COLORS",
}


def load_local_config(skill_dir: Path) -> Dict[str, Any]:
    config_path = skill_dir / ".jira.local.json"
    if not config_path.exists():
        return {}
    return json.loads(config_path.read_text(encoding="utf-8"))


def resolve_auth(
    skill_dir: Path,
    base_url: Optional[str],
    user: Optional[str],
    password: Optional[str],
    token: Optional[str],
) -> Tuple[str, Dict[str, str], Optional[Tuple[str, str]]]:
    local = load_local_config(skill_dir)
    resolved_base = base_url or os.getenv("JIRA_BASE_URL") or local.get("base_url") or DEFAULT_BASE_URL
    resolved_token = token or os.getenv("JIRA_TOKEN") or local.get("token")
    resolved_user = user or os.getenv("JIRA_USER") or local.get("user")
    resolved_password = password or os.getenv("JIRA_PASSWORD") or local.get("password")

    headers = {"Accept": "application/json"}
    auth = None
    if resolved_token:
        headers["Authorization"] = f"Bearer {resolved_token}"
    elif resolved_user and resolved_password:
        auth = (resolved_user, resolved_password)
    else:
        raise SystemExit(
            "Missing Jira credentials. Provide --jira-token or --jira-user/--jira-password, "
            "or set JIRA_TOKEN / JIRA_USER / JIRA_PASSWORD, or use .jira.local.json."
        )
    return resolved_base.rstrip("/"), headers, auth


def requests_json(method: str, url: str, **kwargs: Any) -> Any:
    response = requests.request(method, url, timeout=kwargs.pop("timeout", 30), **kwargs)
    if response.status_code >= 400:
        raise RuntimeError(f"{method} {url} failed with HTTP {response.status_code}: {response.text[:1500]}")
    if not response.text.strip():
        return {}
    return response.json()


def jira_json(
    method: str,
    base_url: str,
    path: str,
    *,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    json_body: Optional[Any] = None,
    params: Optional[Dict[str, Any]] = None,
) -> Any:
    request_headers = dict(headers)
    if json_body is not None:
        request_headers["Content-Type"] = "application/json"
    return requests_json(
        method,
        f"{base_url}{path}",
        headers=request_headers,
        auth=auth,
        json=json_body,
        params=params,
    )


def fetch_issue(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    issue_key: str,
) -> Dict[str, Any]:
    return jira_json(
        "GET",
        base_url,
        f"/rest/api/2/issue/{issue_key}",
        headers=headers,
        auth=auth,
        params={"fields": "summary,description,status,issuetype,project,labels"},
    )


def normalize_status_name(value: Any) -> str:
    text = str(((value or {}).get("name") if isinstance(value, dict) else value) or "").strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text


def testdesign_status_label(status_name: str) -> Optional[str]:
    normalized = normalize_status_name(status_name)
    if normalized in {"to do", "todo", "in progress"}:
        return "TestDesign1"
    if normalized == "ready to test":
        return "TestDesign2"
    if normalized in {"testing", "done"}:
        return "TestDesign3"
    return None


def merge_issue_labels(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    issue: Dict[str, Any],
    labels_to_add: Sequence[str],
) -> List[str]:
    issue_key = str(issue.get("key") or "").strip()
    if not issue_key:
        raise SystemExit("Issue payload is missing key.")
    fields = issue.get("fields") or {}
    existing_labels = fields.get("labels") or []
    merged: List[str] = []
    seen = set()
    for label in [*existing_labels, *labels_to_add]:
        text = str(label or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        merged.append(text)
    jira_json(
        "PUT",
        base_url,
        f"/rest/api/2/issue/{issue_key}",
        headers=headers,
        auth=auth,
        json_body={"fields": {"labels": merged}},
    )
    return merged


def adf_to_text(node: Any) -> str:
    if node is None:
        return ""
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        return "\n".join(part for part in (adf_to_text(item) for item in node) if part)
    if not isinstance(node, dict):
        return str(node)

    node_type = node.get("type")
    if node_type == "text":
        return node.get("text", "")
    if node_type == "hardBreak":
        return "\n"
    if node_type in {"bulletList", "orderedList"}:
        lines = []
        for item in node.get("content", []):
            text = adf_to_text(item).strip()
            if text:
                lines.append(f"- {text}")
        return "\n".join(lines)
    if node_type == "listItem":
        return "\n".join(part for part in (adf_to_text(item) for item in node.get("content", [])) if part)
    if node_type in {"paragraph", "heading", "blockquote", "panel"}:
        text = "".join(adf_to_text(item) for item in node.get("content", []))
        return text.strip()
    return "\n".join(part for part in (adf_to_text(item) for item in node.get("content", [])) if part)


def normalize_description(description: Any) -> str:
    text = adf_to_text(description)
    text = text.replace("\r\n", "\n")
    text = re.sub(r"\{code(:[^}]*)?\}", "", text)
    text = re.sub(r"\{noformat\}", "", text)
    text = re.sub(r"\[(.*?)\|(https?://[^\]]+)\]", r"\1 (\2)", text)
    text = re.sub(r"^\s*h[1-6]\.\s*", "", text, flags=re.IGNORECASE | re.MULTILINE)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def build_issue_title(issue_key: str, summary: str) -> str:
    normalized_key = issue_key.strip().upper()
    compact_summary = re.sub(r"\s+", " ", summary).strip()
    if compact_summary.startswith(f"[{normalized_key}]"):
        return compact_summary
    return f"[{normalized_key}] {compact_summary}".strip()


def to_ascii_text(value: str) -> str:
    normalized = value.replace("Đ", "D").replace("đ", "d")
    normalized = unicodedata.normalize("NFKD", normalized).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^\x20-\x7E]+", " ", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return normalized


def normalize_outline_output(title: str, branches: Sequence[Dict[str, Any]], ascii_only: bool) -> Tuple[str, List[Dict[str, Any]]]:
    if not ascii_only:
        return title, [{"title": branch["title"], "items": list(branch["items"])} for branch in branches]
    return (
        to_ascii_text(title),
        [
            {
                "title": to_ascii_text(str(branch["title"])),
                "items": [to_ascii_text(str(item)) for item in branch["items"]],
            }
            for branch in branches
        ],
    )


def derive_template(summary: str, description: str, explicit: str) -> str:
    if explicit != "auto":
        return explicit

    haystack = f"{summary}\n{description}".lower()
    if any(token in haystack for token in ["report", "dashboard", "overview", "sort", "table", "list", "widget"]):
        return "reporting"
    if any(token in haystack for token in ["workflow", "routing", "assign", "queue", "state"]):
        return "workflow"
    if any(token in haystack for token in ["chatbot", "assistant", "handoff", "intent", "label", "grounding"]):
        return "chatbot"
    if any(token in haystack for token in ["ui", "frontend", "screen", "modal", "button", "form"]):
        return "ui"
    if any(token in haystack for token in ["bug", "fix", "regression", "duplicate", "retry"]):
        return "bugfix"
    if any(token in haystack for token in ["tool", "api", "webhook", "callback", "mapping", "payload"]):
        return "tool"
    return "general"


def scaffold_branch_titles(template: str) -> List[str]:
    if template == "reporting":
        return [
            "Sort priority and grouping",
            "Displayed data and row binding",
            "Refresh, realtime, and pagination",
            "Fallback, empty data, and regression",
            "Out of scope",
        ]
    if template == "workflow":
        return [
            "Primary flow and state carry-forward",
            "Validation and decision branches",
            "Retries, duplicates, and recovery",
            "Outputs, routing, and regression",
            "Out of scope",
        ]
    if template == "chatbot":
        return [
            "Intent and main user flow",
            "Tool choice and data grounding",
            "Edge cases, fallback, and handoff",
            "State, retries, and regression",
            "Out of scope",
        ]
    if template == "tool":
        return [
            "Main flow",
            "Input mapping and validation",
            "Output and state changes",
            "Fallback and regression",
            "Out of scope",
        ]
    if template == "ui":
        return [
            "Main user flow",
            "Validation and UI states",
            "Permissions and data conditions",
            "Error, empty states, and regression",
            "Out of scope",
        ]
    if template == "bugfix":
        return [
            "Primary fix path",
            "Negative path",
            "Retry and duplicate handling",
            "Fallback, recovery, and regression",
            "Out of scope",
        ]
    return [
        "Main flow",
        "Business variants",
        "Validation and input conditions",
        "Fallback, edge cases, and regression",
        "Out of scope",
    ]


def issue_to_summary(issue: Dict[str, Any]) -> Dict[str, Any]:
    fields = issue.get("fields") or {}
    summary = str(fields.get("summary") or "").strip()
    description = normalize_description(fields.get("description"))
    return {
        "key": issue.get("key"),
        "summary": summary,
        "title": build_issue_title(str(issue.get("key") or ""), summary),
        "status": (fields.get("status") or {}).get("name"),
        "issue_type": (fields.get("issuetype") or {}).get("name"),
        "project_key": (fields.get("project") or {}).get("key"),
        "description": description,
    }


def load_case_hints(path: Path) -> Dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        cases = payload
    elif isinstance(payload, dict) and isinstance(payload.get("test_cases"), list):
        cases = payload["test_cases"]
    else:
        raise SystemExit("Cases file must be a JSON array or an object with `test_cases`.")

    titles: List[str] = []
    techniques: List[str] = []
    coverage_tags: List[str] = []
    for item in cases:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        if title:
            titles.append(title)
        technique = str(item.get("technique") or "").strip()
        if technique and technique not in techniques:
            techniques.append(technique)
        for tag in item.get("coverage_tags") or []:
            text = str(tag or "").strip()
            if text and text not in coverage_tags:
                coverage_tags.append(text)

    return {
        "case_count": len([item for item in cases if isinstance(item, dict)]),
        "existing_case_titles": titles[:12],
        "existing_case_techniques": techniques[:8],
        "existing_case_coverage_tags": coverage_tags[:16],
    }


def make_outline_scaffold(issue_summary: Dict[str, Any], template: str, case_hints: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    description = issue_summary.get("description") or ""
    excerpt = description[:1600].strip()
    branches = []
    for title in scaffold_branch_titles(template):
        branches.append(
            {
                "title": title,
                "items": [
                    "Replace with 3-5 concrete scenarios that are specific to this Jira task."
                ]
            }
        )

    scaffold = {
        "issue_key": issue_summary.get("key"),
        "title": issue_summary.get("title"),
        "sheet_title": "Brace Map",
        "template": template,
        "branch_guidance": "Keep 4-5 main branches only. Each branch should have 3-5 concrete bullets. Replace all placeholders before render.",
        "source_context": {
            "summary": issue_summary.get("summary"),
            "issue_type": issue_summary.get("issue_type"),
            "status": issue_summary.get("status"),
            "description_excerpt": excerpt,
        },
        "branches": branches,
    }
    if case_hints:
        scaffold["supporting_context"] = case_hints
    return scaffold


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def write_json(path: Path, payload: Any) -> None:
    ensure_parent(path)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_outline(path: Path) -> Dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit("Outline file must be a JSON object.")
    branches = payload.get("branches")
    if not isinstance(branches, list) or not branches:
        raise SystemExit("Outline file must include a non-empty `branches` array.")
    return payload


def validate_outline(payload: Dict[str, Any]) -> Tuple[str, List[Dict[str, Any]]]:
    title = str(payload.get("title") or "").strip()
    if not title:
        raise SystemExit("Outline file must include `title`.")

    normalized_branches: List[Dict[str, Any]] = []
    has_out_of_scope = False
    for index, branch in enumerate(payload.get("branches") or [], start=1):
        if not isinstance(branch, dict):
            raise SystemExit(f"Branch #{index} must be an object.")
        branch_title = str(branch.get("title") or "").strip()
        raw_items = branch.get("items") or []
        if not branch_title:
            raise SystemExit(f"Branch #{index} is missing `title`.")
        if not isinstance(raw_items, list) or not raw_items:
            raise SystemExit(f"Branch `{branch_title}` must contain a non-empty `items` array.")
        items = [str(item).strip() for item in raw_items if str(item).strip()]
        if not items:
            raise SystemExit(f"Branch `{branch_title}` contains only empty items.")
        if PLACEHOLDER_PATTERN.search(" ".join(items)):
            raise SystemExit(
                f"Branch `{branch_title}` still contains placeholder text. "
                "Replace scaffold items with real scenarios before render."
            )
        if normalize_status_name(branch_title).startswith("out of scope"):
            has_out_of_scope = True
        normalized_branches.append({"title": branch_title, "items": items})

    if not has_out_of_scope:
        raise SystemExit(
            "Outline must include an `Out of scope` branch. "
            "Keep the map at 4-5 branches by merging regression or fail-safe into a nearby branch if needed."
        )

    return title, normalized_branches


def issue_attachments(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    issue_key: str,
) -> List[Dict[str, Any]]:
    payload = jira_json(
        "GET",
        base_url,
        f"/rest/api/2/issue/{issue_key}",
        headers=headers,
        auth=auth,
        params={"fields": "attachment"},
    )
    fields = payload.get("fields") or {}
    attachments = fields.get("attachment") or []
    return attachments if isinstance(attachments, list) else []


def delete_attachment(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    attachment_id: str,
) -> None:
    response = requests.delete(
        f"{base_url}/rest/api/2/attachment/{attachment_id}",
        headers=headers,
        auth=auth,
        timeout=30,
    )
    if response.status_code >= 400:
        raise RuntimeError(
            f"Attachment delete failed for {attachment_id} with HTTP {response.status_code}: {response.text[:1500]}"
        )


def delete_matching_attachments(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    issue_key: str,
    filenames: Sequence[str],
) -> List[Dict[str, Any]]:
    existing = issue_attachments(base_url, headers, auth, issue_key)
    target_names = set(filenames)
    deleted: List[Dict[str, Any]] = []
    for item in existing:
        filename = str(item.get("filename") or "")
        if filename not in target_names:
            continue
        attachment_id = str(item.get("id") or "")
        if not attachment_id:
            continue
        delete_attachment(base_url, headers, auth, attachment_id)
        deleted.append(
            {
                "filename": filename,
                "id": attachment_id,
            }
        )
    return deleted


def shorten_filename(name: str, limit: int = 180) -> str:
    safe = re.sub(r"[/:*?\"<>|]+", "-", name).strip()
    safe = re.sub(r"\s+", " ", safe)
    if len(safe) <= limit:
        return safe
    return safe[: limit - 3].rstrip() + "..."


def wrap_lines(text: str, width: int) -> List[str]:
    compact = re.sub(r"\s+", " ", text).strip()
    if not compact:
        return [""]
    return textwrap.wrap(compact, width=width, break_long_words=False, break_on_hyphens=False) or [compact]


def topic_box_height(lines: Sequence[str], line_height: int, padding_y: int) -> int:
    return padding_y * 2 + line_height * len(lines)


def svg_text_block(
    lines: Sequence[str],
    *,
    x: int,
    y: int,
    width: int,
    line_height: int,
    font_size: int,
    fill: str,
    bold: bool = False,
) -> str:
    anchor_x = x + width // 2
    weight = "600" if bold else "400"
    blocks = []
    baseline_y = y + font_size
    for index, line in enumerate(lines):
        blocks.append(
            f'<text x="{anchor_x}" y="{baseline_y + index * line_height}" text-anchor="middle" '
            f'font-family="Montserrat, Helvetica, Arial, sans-serif" font-size="{font_size}" '
            f'font-weight="{weight}" fill="{fill}">{escape(line)}</text>'
        )
    return "".join(blocks)


def estimate_text_color(fill: str) -> str:
    value = fill.lstrip("#")
    if len(value) != 6:
        return DARK_TEXT
    red = int(value[0:2], 16)
    green = int(value[2:4], 16)
    blue = int(value[4:6], 16)
    luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255
    return DARK_TEXT if luminance > 0.62 else LIGHT_TEXT


def topic_style(properties: Dict[str, str]) -> Dict[str, Any]:
    return {
        "id": new_id(),
        "properties": properties,
    }


def root_topic_style() -> Dict[str, Any]:
    return topic_style(
        {
            "fo:font-family": "Montserrat",
            "fo:font-size": "24pt",
            "fo:font-weight": "500",
            "fo:color": LIGHT_TEXT,
            "fo:text-align": "center",
            "svg:fill": ROOT_FILL,
            "fill-pattern": "solid",
            "line-width": "3pt",
            "line-color": ROOT_FILL,
            "border-line-color": ROOT_FILL,
            "border-line-width": "3pt",
            "shape-class": "org.xmind.topicShape.roundedRect",
            "line-class": "org.xmind.branchConnection.roundedElbow",
            "arrow-end-class": "org.xmind.arrowShape.none",
        }
    )


def main_topic_style(color: str) -> Dict[str, Any]:
    return topic_style(
        {
            "fo:font-family": "Montserrat",
            "fo:font-size": "18pt",
            "fo:font-weight": "400",
            "fo:color": estimate_text_color(color),
            "fo:text-align": "left",
            "svg:fill": color,
            "fill-pattern": "solid",
            "line-width": "2pt",
            "line-color": color,
            "border-line-color": color,
            "border-line-width": "0pt",
            "shape-class": "org.xmind.topicShape.roundedRect",
            "line-class": "org.xmind.branchConnection.roundedElbow",
            "arrow-end-class": "org.xmind.arrowShape.none",
        }
    )


def sub_topic_style(color: str) -> Dict[str, Any]:
    return topic_style(
        {
            "fo:font-family": "Montserrat",
            "fo:font-size": "14pt",
            "fo:font-weight": "400",
            "fo:color": DARK_TEXT,
            "fo:text-align": "left",
            "svg:fill": LIGHT_TEXT,
            "fill-pattern": "solid",
            "line-width": "2pt",
            "line-color": color,
            "border-line-color": color,
            "border-line-width": "2pt",
            "shape-class": "org.xmind.topicShape.roundedRect",
            "line-class": "org.xmind.branchConnection.roundedElbow",
            "arrow-end-class": "org.xmind.arrowShape.none",
        }
    )


def render_svg(title: str, branches: Sequence[Dict[str, Any]], output_path: Path) -> None:
    root_w = 560
    root_x = 110
    root_line_height = 36
    root_padding_y = 30
    root_lines = wrap_lines(title, 24)
    root_h = topic_box_height(root_lines, root_line_height, root_padding_y)

    main_x = 760
    main_w = 470
    item_x = 1320
    item_w = 1040
    top_pad = 80
    bottom_pad = 80
    group_gap = 38
    item_gap = 14

    layout: List[Dict[str, Any]] = []
    current_y = top_pad

    for index, branch in enumerate(branches):
        color = MAIN_TOPIC_COLORS[index % len(MAIN_TOPIC_COLORS)]
        branch_lines = wrap_lines(branch["title"], 24)
        branch_h = topic_box_height(branch_lines, 30, 20)
        items = []
        item_y = current_y
        for item_text in branch["items"]:
            item_lines = wrap_lines(item_text, 42)
            item_h = topic_box_height(item_lines, 26, 18)
            items.append(
                {
                    "text": item_text,
                    "lines": item_lines,
                    "x": item_x,
                    "y": item_y,
                    "w": item_w,
                    "h": item_h,
                }
            )
            item_y += item_h + item_gap
        items_total_h = 0
        if items:
            items_total_h = items[-1]["y"] + items[-1]["h"] - current_y

        group_h = max(branch_h, items_total_h)
        branch_y = current_y + max((group_h - branch_h) // 2, 0)
        layout.append(
            {
                "branch": branch,
                "color": color,
                "title_lines": branch_lines,
                "box": {"x": main_x, "y": branch_y, "w": main_w, "h": branch_h},
                "items": items,
                "group_top": current_y,
                "group_h": group_h,
            }
        )
        current_y += group_h + group_gap

    canvas_h = max(920, current_y - group_gap + bottom_pad)
    canvas_w = 2420
    root_y = (canvas_h - root_h) // 2
    root_mid_y = root_y + root_h // 2

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{canvas_w}" height="{canvas_h}" viewBox="0 0 {canvas_w} {canvas_h}">',
        f'<rect x="0" y="0" width="{canvas_w}" height="{canvas_h}" fill="{CANVAS_FILL}"/>',
        f'<rect x="{root_x}" y="{root_y}" width="{root_w}" height="{root_h}" rx="24" fill="{ROOT_FILL}"/>',
        svg_text_block(
            root_lines,
            x=root_x,
            y=root_y + root_padding_y,
            width=root_w,
            line_height=root_line_height,
            font_size=26,
            fill=LIGHT_TEXT,
            bold=True,
        ),
    ]

    for item in layout:
        color = item["color"]
        branch_box = item["box"]
        branch_mid_y = branch_box["y"] + branch_box["h"] // 2
        svg_parts.append(
            f'<path d="M {root_x + root_w} {root_mid_y} C {root_x + root_w + 90} {root_mid_y}, '
            f'{main_x - 120} {branch_mid_y}, {branch_box["x"]} {branch_mid_y}" '
            f'stroke="{color}" stroke-width="4" fill="none" stroke-linecap="round"/>'
        )
        svg_parts.append(
            f'<rect x="{branch_box["x"]}" y="{branch_box["y"]}" width="{branch_box["w"]}" '
            f'height="{branch_box["h"]}" rx="18" fill="{color}"/>'
        )
        svg_parts.append(
            svg_text_block(
                item["title_lines"],
                x=branch_box["x"],
                y=branch_box["y"] + 20,
                width=branch_box["w"],
                line_height=30,
                font_size=20,
                fill=estimate_text_color(color),
                bold=False,
            )
        )
        for topic in item["items"]:
            topic_mid_y = topic["y"] + topic["h"] // 2
            svg_parts.append(
                f'<path d="M {branch_box["x"] + branch_box["w"]} {branch_mid_y} '
                f'L {topic["x"] - 30} {branch_mid_y} L {topic["x"] - 30} {topic_mid_y} L {topic["x"]} {topic_mid_y}" '
                f'stroke="{color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
            )
            svg_parts.append(
                f'<rect x="{topic["x"]}" y="{topic["y"]}" width="{topic["w"]}" height="{topic["h"]}" '
                f'rx="16" fill="{LIGHT_TEXT}" stroke="{color}" stroke-width="2.5"/>'
            )
            svg_parts.append(
                svg_text_block(
                    topic["lines"],
                    x=topic["x"],
                    y=topic["y"] + 18,
                    width=topic["w"],
                    line_height=26,
                    font_size=16,
                    fill=DARK_TEXT,
                    bold=False,
                )
            )

    svg_parts.append("</svg>")
    ensure_parent(output_path)
    output_path.write_text("\n".join(svg_parts) + "\n", encoding="utf-8")


def svg_to_png(svg_path: Path, png_path: Path) -> None:
    ensure_parent(png_path)
    commands: List[List[str]] = []
    if shutil.which("sips"):
        commands.append(["sips", "-s", "format", "png", str(svg_path), "--out", str(png_path)])
    if shutil.which("rsvg-convert"):
        commands.append(["rsvg-convert", "-f", "png", "-o", str(png_path), str(svg_path)])
    if shutil.which("magick"):
        commands.append(["magick", str(svg_path), str(png_path)])
    if shutil.which("convert"):
        commands.append(["convert", str(svg_path), str(png_path)])

    failures: List[str] = []
    for command in commands:
        process = subprocess.run(command, check=False, capture_output=True, text=True)
        if process.returncode == 0:
            return
        failures.append(process.stderr.strip() or process.stdout.strip() or f"{command[0]} failed")

    if not commands:
        raise SystemExit("Failed to convert SVG to PNG: install sips, rsvg-convert, ImageMagick magick, or convert.")
    raise SystemExit(f"Failed to convert SVG to PNG: {' | '.join(failures)}")


def new_id() -> str:
    return str(uuid.uuid4())


def build_sheet_json(title: str, branches: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    root_id = new_id()
    attached = []
    for index, branch in enumerate(branches):
        color = MAIN_TOPIC_COLORS[index % len(MAIN_TOPIC_COLORS)]
        children = [
            {
                "id": new_id(),
                "title": item,
                "style": sub_topic_style(color),
            }
            for item in branch["items"]
        ]
        branch_node: Dict[str, Any] = {
            "id": new_id(),
            "title": branch["title"],
            "style": main_topic_style(color),
        }
        if children:
            branch_node["children"] = {"attached": children}
        attached.append(branch_node)

    sheet = {
        "id": new_id(),
        "revisionId": new_id(),
        "class": "sheet",
        "rootTopic": {
            "id": root_id,
            "class": "topic",
            "title": title,
            "structureClass": "org.xmind.ui.brace.right",
            "children": {"attached": attached},
            "style": root_topic_style(),
        },
        "title": "Brace Map",
        "topicOverlapping": "overlap",
        "arrangeableLayerOrder": [root_id],
        "zones": [],
        "extensions": [
            {
                "provider": "org.xmind.ui.skeleton.structure.style",
                "content": {"centralTopic": "org.xmind.ui.brace.right"},
            }
        ],
        "style": {
            "id": new_id(),
            "properties": {"svg:fill": CANVAS_FILL},
        },
        "theme": THEME_MAP,
    }
    return [sheet]


def write_xmind(path: Path, title: str, branches: Sequence[Dict[str, Any]], thumbnail_path: Path) -> None:
    ensure_parent(path)
    metadata = {
        "dataStructureVersion": "3",
        "creator": {"name": "Vana", "version": "26.02.04171"},
        "layoutEngineVersion": "5",
    }
    manifest = {
        "file-entries": {
            "content.json": {},
            "metadata.json": {},
            "Thumbnails/thumbnail.png": {},
        }
    }
    content = build_sheet_json(title, branches)
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_STORED) as archive:
        archive.writestr("content.json", json.dumps(content, ensure_ascii=False, separators=(",", ":")))
        archive.writestr("metadata.json", json.dumps(metadata, ensure_ascii=False, separators=(",", ":")))
        archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, separators=(",", ":")))
        archive.writestr("Thumbnails/thumbnail.png", thumbnail_path.read_bytes())


def attach_file(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    issue_key: str,
    file_path: Path,
) -> Dict[str, Any]:
    request_headers = dict(headers)
    request_headers["X-Atlassian-Token"] = "no-check"
    request_headers.pop("Content-Type", None)
    mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    with file_path.open("rb") as handle:
        response = requests.post(
            f"{base_url}/rest/api/2/issue/{issue_key}/attachments",
            headers=request_headers,
            auth=auth,
            files={"file": (file_path.name, handle, mime_type)},
            timeout=60,
        )
    if response.status_code >= 400:
        raise RuntimeError(
            f"Attachment upload failed for {file_path.name} with HTTP {response.status_code}: {response.text[:1500]}"
        )
    payload = response.json()
    if isinstance(payload, list) and payload:
        item = payload[0]
        return {
            "filename": item.get("filename"),
            "id": item.get("id"),
            "size": item.get("size"),
            "content": item.get("content"),
        }
    return {"filename": file_path.name}


def command_issue(args: argparse.Namespace) -> None:
    base_url, headers, auth = resolve_auth(SKILL_DIR, args.jira_base_url, args.jira_user, args.jira_password, args.jira_token)
    issue = fetch_issue(base_url, headers, auth, args.issue_key)
    print(json.dumps(issue_to_summary(issue), ensure_ascii=False, indent=2))


def command_init_outline(args: argparse.Namespace) -> None:
    base_url, headers, auth = resolve_auth(SKILL_DIR, args.jira_base_url, args.jira_user, args.jira_password, args.jira_token)
    issue = fetch_issue(base_url, headers, auth, args.issue_key)
    issue_summary = issue_to_summary(issue)
    template = derive_template(issue_summary["summary"], issue_summary["description"], args.template)
    case_hints = load_case_hints(Path(args.cases_file).expanduser().resolve()) if args.cases_file else None
    scaffold = make_outline_scaffold(issue_summary, template, case_hints)
    ascii_only = bool(args.ascii_only)
    title, branches = normalize_outline_output(scaffold["title"], scaffold["branches"], ascii_only)
    scaffold["title"] = title
    scaffold["branches"] = branches
    if args.out:
        output_path = Path(args.out).expanduser().resolve()
        write_json(output_path, scaffold)
        print(str(output_path))
        return
    print(json.dumps(scaffold, ensure_ascii=False, indent=2))


def command_build(args: argparse.Namespace) -> None:
    outline_path = Path(args.outline_file).expanduser().resolve()
    outline = load_outline(outline_path)
    title, branches = validate_outline(outline)
    ascii_only = bool(args.ascii_only)
    title, branches = normalize_outline_output(title, branches, ascii_only)

    issue_key = str(args.issue_key or outline.get("issue_key") or "").strip().upper()
    if args.title:
        title = args.title.strip()
        if ascii_only:
            title = to_ascii_text(title)

    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    file_stem = shorten_filename(title)
    svg_path = output_dir / f"{file_stem}.svg"
    png_path = output_dir / f"{file_stem}.png"
    xmind_path = output_dir / f"{file_stem}.xmind"

    render_svg(title, branches, svg_path)
    svg_to_png(svg_path, png_path)
    write_xmind(xmind_path, title, branches, png_path)

    uploads: List[Dict[str, Any]] = []
    deleted_attachments: List[Dict[str, Any]] = []
    final_labels: List[str] = []
    labels_added: List[str] = []
    attach_png = args.attach_png or args.attach_all
    attach_xmind = args.attach_xmind or args.attach_all
    if attach_png or attach_xmind:
        if not issue_key:
            raise SystemExit("Attachment upload requires `issue_key` in the outline file or `--issue-key`.")
        base_url, headers, auth = resolve_auth(
            SKILL_DIR,
            args.jira_base_url,
            args.jira_user,
            args.jira_password,
            args.jira_token,
        )
        if args.replace_existing:
            target_names: List[str] = []
            if attach_png:
                target_names.append(png_path.name)
            if attach_xmind:
                target_names.append(xmind_path.name)
            deleted_attachments = delete_matching_attachments(base_url, headers, auth, issue_key, target_names)
        if attach_png:
            uploads.append(attach_file(base_url, headers, auth, issue_key, png_path))
        if attach_xmind:
            uploads.append(attach_file(base_url, headers, auth, issue_key, xmind_path))
        issue = fetch_issue(base_url, headers, auth, issue_key)
        labels_added = [ALWAYS_TESTDESIGN_LABEL]
        status_label = testdesign_status_label((issue.get("fields") or {}).get("status"))
        if status_label:
            labels_added.append(status_label)
        final_labels = merge_issue_labels(base_url, headers, auth, issue, labels_added)

    if not args.keep_svg:
        svg_path.unlink(missing_ok=True)

    result = {
        "issue_key": issue_key or None,
        "title": title,
        "branch_count": len(branches),
        "ascii_only": ascii_only,
        "paths": {
            "outline": str(outline_path),
            "png": str(png_path),
            "xmind": str(xmind_path),
        },
        "deleted_attachments": deleted_attachments,
        "uploads": uploads,
        "labels_added": labels_added,
        "final_labels": final_labels,
        "warnings": [],
    }
    if len(branches) < 4 or len(branches) > 5:
        result["warnings"].append("The outline uses outside the preferred 4-5 main branches range.")
    if any(len(branch["items"]) > 5 for branch in branches):
        result["warnings"].append("At least one branch has more than 5 items and may look crowded.")
    print(json.dumps(result, ensure_ascii=False, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Create XMind-style QA test design workbooks, export PNG, and optionally attach the outputs to Jira."
    )
    parser.add_argument("--jira-base-url")
    parser.add_argument("--jira-user")
    parser.add_argument("--jira-password")
    parser.add_argument("--jira-token")

    subparsers = parser.add_subparsers(dest="command", required=True)

    issue_parser = subparsers.add_parser("issue", help="Fetch Jira issue summary and normalized description.")
    issue_parser.add_argument("--issue-key", required=True)

    outline_parser = subparsers.add_parser(
        "init-outline",
        help="Create a scaffold JSON outline for a Jira issue before rendering the final XMind map.",
    )
    outline_parser.add_argument("--issue-key", required=True)
    outline_parser.add_argument(
        "--template",
        choices=["auto", "tool", "ui", "bugfix", "general", "reporting", "workflow", "chatbot"],
        default="auto",
    )
    outline_parser.add_argument("--cases-file")
    outline_parser.add_argument("--out")
    outline_parser.add_argument("--keep-unicode", action="store_true")
    outline_parser.add_argument("--ascii-only", action="store_true")

    build_parser = subparsers.add_parser(
        "build",
        help="Render a JSON outline into .xmind and .png, then optionally attach the files to Jira.",
    )
    build_parser.add_argument("--outline-file", required=True)
    build_parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    build_parser.add_argument("--issue-key")
    build_parser.add_argument("--title")
    build_parser.add_argument("--attach-png", action="store_true")
    build_parser.add_argument("--attach-xmind", action="store_true")
    build_parser.add_argument("--attach-all", action="store_true")
    build_parser.add_argument("--replace-existing", action="store_true")
    build_parser.add_argument("--keep-unicode", action="store_true")
    build_parser.add_argument("--ascii-only", action="store_true")
    build_parser.add_argument("--keep-svg", action="store_true")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "issue":
        command_issue(args)
        return
    if args.command == "init-outline":
        command_init_outline(args)
        return
    if args.command == "build":
        command_build(args)
        return
    raise SystemExit(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    main()

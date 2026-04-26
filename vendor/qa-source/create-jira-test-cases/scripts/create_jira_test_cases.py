#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import requests


DEFAULT_BASE_URL = "https://jira.vexere.net"
DEFAULT_PROJECT_KEY = "AI"
DEFAULT_FOLDER_ROOT = "/Bao QC"
DEFAULT_RUN_ROOT = "/AI Chatbot"
DEFAULT_PRIORITY = "Normal"
DEFAULT_STATUS = "Draft"
TEST_CASE_FOLDER_TYPE = "TEST_CASE"
TEST_RUN_FOLDER_TYPE = "TEST_RUN"
ALWAYS_TESTCASE_LABEL = "AI_Testcases"
PRIORITY_ALIASES = {
    "": DEFAULT_PRIORITY,
    "medium": DEFAULT_PRIORITY,
    "mid": DEFAULT_PRIORITY,
    "normal": DEFAULT_PRIORITY,
    "trung bình": DEFAULT_PRIORITY,
    "trung binh": DEFAULT_PRIORITY,
}


def requests_json(method: str, url: str, **kwargs: Any) -> Any:
    response = requests.request(method, url, timeout=kwargs.pop("timeout", 30), **kwargs)
    if response.status_code >= 400:
        raise RuntimeError(f"{method} {url} failed with HTTP {response.status_code}: {response.text[:1500]}")
    if not response.text.strip():
        return {}
    return response.json()


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
    resolved_base = (
        base_url
        or os.getenv("JIRA_BASE_URL")
        or local.get("base_url")
        or DEFAULT_BASE_URL
    )
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


def normalize_priority(value: Any) -> str:
    text = str(value or "").strip()
    normalized = re.sub(r"\s+", " ", text).lower()
    return PRIORITY_ALIASES.get(normalized, text or DEFAULT_PRIORITY)


def testcase_status_label(status_name: str) -> Optional[str]:
    normalized = normalize_status_name(status_name)
    if normalized in {"to do", "todo", "in progress"}:
        return "TestCase1"
    if normalized == "ready to test":
        return "TestCase2"
    if normalized in {"testing", "done"}:
        return "TestCase3"
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


def derive_folder_name(issue_key: str, summary: str) -> str:
    numeric = issue_key.split("-")[-1]
    return f"{numeric}. {summary}".strip()


def sanitize_folder_name(folder_name: str) -> str:
    sanitized = re.sub(r"[\\/]+", " - ", str(folder_name or "").strip())
    sanitized = re.sub(r"\s{2,}", " ", sanitized)
    return sanitized.strip()


def build_folder_path(folder_root: str, folder_name: str) -> str:
    root = folder_root.rstrip("/")
    if not root.startswith("/"):
        root = "/" + root
    safe_folder_name = sanitize_folder_name(folder_name)
    return f"{root}/{safe_folder_name}".replace("//", "/")


def ensure_folder(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    project_key: str,
    folder_path: str,
    *,
    folder_type: str,
) -> Dict[str, Any]:
    try:
        return jira_json(
            "POST",
            base_url,
            "/rest/atm/1.0/folder",
            headers=headers,
            auth=auth,
            json_body={
                "projectKey": project_key,
                "name": folder_path,
                "type": folder_type,
            },
        )
    except RuntimeError as exc:
        text = str(exc)
        if "already exists" in text.lower():
            return {"existing": True, "name": folder_path}
        raise


def search_testcases_in_folder(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    folder_path: str,
) -> List[Dict[str, Any]]:
    return jira_json(
        "GET",
        base_url,
        "/rest/atm/1.0/testcase/search",
        headers=headers,
        auth=auth,
        params={"query": f'folder = "{folder_path}"'},
    )


def create_testrun(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    return jira_json(
        "POST",
        base_url,
        "/rest/atm/1.0/testrun",
        headers=headers,
        auth=auth,
        json_body=payload,
    )


def build_cycle_name(issue_key: str, summary: str) -> str:
    return f"[{issue_key}] {summary}".strip()


def parse_case_keys(raw_case_keys: Optional[str], case_keys_file: Optional[str]) -> List[str]:
    resolved: List[str] = []
    if raw_case_keys:
        resolved.extend(part.strip() for part in raw_case_keys.split(","))
    if case_keys_file:
        payload = json.loads(Path(case_keys_file).read_text(encoding="utf-8"))
        if not isinstance(payload, list):
            raise SystemExit("Case keys file must be a JSON array of testcase keys.")
        resolved.extend(str(item).strip() for item in payload)
    deduped: List[str] = []
    seen = set()
    for key in resolved:
        if not key:
            continue
        if key not in seen:
            seen.add(key)
            deduped.append(key)
    if not deduped:
        raise SystemExit("At least one testcase key is required. Use --case-keys or --case-keys-file.")
    return deduped


def load_cases_file(path: Path) -> List[Dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        cases = payload
    elif isinstance(payload, dict) and isinstance(payload.get("test_cases"), list):
        cases = payload["test_cases"]
    else:
        raise SystemExit("Case file must be a JSON array or an object with `test_cases`.")
    if not cases:
        raise SystemExit("No test cases found in cases file.")
    for case in cases:
        if not isinstance(case, dict):
            raise SystemExit("Each test case must be a JSON object.")
    return cases


def normalize_title(index: int, raw_title: str) -> str:
    title = raw_title.strip()
    if re.match(r"^\[TC[_-]\d{4}\]\s+", title):
        return title
    return f"[TC_{index:04d}] {title}"


def normalize_step_description(case: Dict[str, Any]) -> str:
    if isinstance(case.get("step"), str) and case["step"].strip():
        return case["step"].strip()
    steps = case.get("steps")
    if isinstance(steps, list) and steps:
        rendered = []
        for idx, step in enumerate(steps, start=1):
            rendered.append(f"{idx}. {str(step).strip()}")
        return "<br />".join(rendered)
    raise SystemExit("Each test case must contain `step` or `steps`.")


def normalize_structured_steps(case: Dict[str, Any]) -> Optional[List[Dict[str, str]]]:
    structured_steps = case.get("structured_steps")
    if structured_steps is None:
        return None
    if not isinstance(structured_steps, list) or not structured_steps:
        raise SystemExit("`structured_steps` must be a non-empty array when provided.")

    normalized: List[Dict[str, str]] = []
    for index, raw_step in enumerate(structured_steps, start=1):
        if not isinstance(raw_step, dict):
            raise SystemExit(f"`structured_steps[{index}]` must be an object.")
        description = str(raw_step.get("description") or "").strip()
        if not description:
            raise SystemExit(f"`structured_steps[{index}].description` is required.")
        normalized.append(
            {
                "description": description,
                "testData": str(raw_step.get("test_data") or "").strip(),
                "expectedResult": str(raw_step.get("expected_result") or "").strip(),
            }
        )
    return normalized


def build_test_script_steps(case: Dict[str, Any], test_data: str, expected_result: str) -> List[Dict[str, str]]:
    structured = normalize_structured_steps(case)
    if structured is not None:
        return structured

    if isinstance(case.get("step"), str) and case["step"].strip():
        return [
            {
                "description": case["step"].strip(),
                "testData": test_data,
                "expectedResult": expected_result,
            }
        ]

    raw_steps = case.get("steps")
    if isinstance(raw_steps, list) and raw_steps:
        normalized_steps = [str(step).strip() for step in raw_steps if str(step).strip()]
        if not normalized_steps:
            raise SystemExit("`steps` must contain at least one non-empty item.")
        rendered: List[Dict[str, str]] = []
        for index, description in enumerate(normalized_steps):
            rendered.append(
                {
                    "description": description,
                    # Zephyr stores test data / expected result per step. For legacy case-level
                    # fields, preserve them without flattening the step list into one blob.
                    "testData": test_data if index == 0 else "",
                    "expectedResult": expected_result if index == len(normalized_steps) - 1 else "",
                }
            )
        return rendered

    raise SystemExit("Each test case must contain `step`, `steps`, or `structured_steps`.")


def looks_like_multiline_bullets(value: str) -> bool:
    text = value.strip()
    if not text:
        return False
    return bool(re.search(r"(^|<br\s*/?>|\n)\s*[-*•]", text, flags=re.IGNORECASE))


def looks_like_numbered_quotes(value: str) -> bool:
    lines = [line.strip() for line in value.splitlines() if line.strip()]
    if not lines:
        return False
    return all(re.match(r'^\d+\.\s+".+"$', line) for line in lines)


def infer_case_mode(case: Dict[str, Any]) -> str:
    explicit = str(case.get("scenario_type") or case.get("case_mode") or "").strip().lower()
    if explicit:
        return explicit
    return "general"


def collect_case_warnings(case: Dict[str, Any], index: int) -> List[str]:
    warnings: List[str] = []
    for field in ["technique", "risk", "requirement_ref"]:
        if not str(case.get(field) or "").strip():
            warnings.append(f"Case #{index} is missing optional design metadata `{field}`.")

    coverage_tags = case.get("coverage_tags")
    if not isinstance(coverage_tags, list) or not any(str(item).strip() for item in coverage_tags):
        warnings.append(f"Case #{index} is missing optional design metadata `coverage_tags`.")

    expected_result = str(case.get("expected_result") or "").strip()
    if expected_result and not looks_like_multiline_bullets(expected_result):
        warnings.append(f"Case #{index} expected_result should usually use multiline bullets for Jira readability.")

    case_mode = infer_case_mode(case)
    test_data = str(case.get("test_data") or "").strip()
    if case_mode in {"chatbot", "tool"} and test_data and not looks_like_numbered_quotes(test_data):
        warnings.append(
            f"Case #{index} looks like `{case_mode}` flow but test_data is not in numbered quoted user-message lines."
        )
    return warnings


def build_testcase_payload(
    case: Dict[str, Any],
    *,
    project_key: str,
    folder_path: str,
    index: int,
) -> Dict[str, Any]:
    title = case.get("title")
    precondition = case.get("precondition")
    test_data = case.get("test_data")
    expected_result = case.get("expected_result")
    if not all(isinstance(value, str) and value.strip() for value in [title, precondition, test_data, expected_result]):
        raise SystemExit("Each case must have non-empty `title`, `precondition`, `test_data`, and `expected_result`.")
    return {
        "projectKey": project_key,
        "name": normalize_title(index, title),
        "priority": normalize_priority(case.get("priority")),
        "status": str(case.get("status") or DEFAULT_STATUS),
        "folder": folder_path,
        "objective": str(case.get("objective") or title).strip(),
        "precondition": precondition.strip(),
        "testScript": {
            "type": "STEP_BY_STEP",
            "steps": build_test_script_steps(case, test_data.strip(), expected_result.strip()),
        },
    }


def create_testcase(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    return jira_json(
        "POST",
        base_url,
        "/rest/atm/1.0/testcase",
        headers=headers,
        auth=auth,
        json_body=payload,
    )


def delete_testcase(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    testcase_key: str,
) -> None:
    jira_json(
        "DELETE",
        base_url,
        f"/rest/atm/1.0/testcase/{testcase_key}",
        headers=headers,
        auth=auth,
    )


def issue_command(args: argparse.Namespace, base_url: str, headers: Dict[str, str], auth: Optional[Tuple[str, str]]) -> None:
    issue = fetch_issue(base_url, headers, auth, args.issue_key)
    fields = issue["fields"]
    print(
        json.dumps(
            {
                "key": issue["key"],
                "summary": fields.get("summary"),
                "status": (fields.get("status") or {}).get("name"),
                "issue_type": (fields.get("issuetype") or {}).get("name"),
                "project_key": (fields.get("project") or {}).get("key"),
                "description": fields.get("description"),
                "derived_folder_name": derive_folder_name(issue["key"], fields.get("summary") or ""),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def ensure_folder_command(args: argparse.Namespace, base_url: str, headers: Dict[str, str], auth: Optional[Tuple[str, str]]) -> None:
    issue = fetch_issue(base_url, headers, auth, args.issue_key)
    summary = (issue["fields"].get("summary") or "").strip()
    folder_name = args.folder_name or derive_folder_name(args.issue_key, summary)
    folder_path = build_folder_path(args.folder_root, folder_name)
    response = ensure_folder(
        base_url,
        headers,
        auth,
        args.project_key,
        folder_path,
        folder_type=TEST_CASE_FOLDER_TYPE,
    )
    print(json.dumps({"folder_path": folder_path, "response": response}, ensure_ascii=False, indent=2))


def ensure_run_folder_command(args: argparse.Namespace, base_url: str, headers: Dict[str, str], auth: Optional[Tuple[str, str]]) -> None:
    issue = fetch_issue(base_url, headers, auth, args.issue_key)
    summary = (issue["fields"].get("summary") or "").strip()
    folder_name = args.folder_name or derive_folder_name(args.issue_key, summary)
    folder_path = build_folder_path(args.run_root, folder_name)
    response = ensure_folder(
        base_url,
        headers,
        auth,
        args.project_key,
        folder_path,
        folder_type=TEST_RUN_FOLDER_TYPE,
    )
    print(json.dumps({"folder_path": folder_path, "response": response}, ensure_ascii=False, indent=2))


def create_suite_command(args: argparse.Namespace, base_url: str, headers: Dict[str, str], auth: Optional[Tuple[str, str]]) -> None:
    issue = fetch_issue(base_url, headers, auth, args.issue_key)
    summary = (issue["fields"].get("summary") or "").strip()
    folder_name = args.folder_name or derive_folder_name(args.issue_key, summary)
    folder_path = build_folder_path(args.folder_root, folder_name)
    ensure_result = ensure_folder(
        base_url,
        headers,
        auth,
        args.project_key,
        folder_path,
        folder_type=TEST_CASE_FOLDER_TYPE,
    )
    existing = search_testcases_in_folder(base_url, headers, auth, folder_path)
    existing_names = {item.get("name") for item in existing}
    cases = load_cases_file(Path(args.cases_file))

    prepared: List[Dict[str, Any]] = []
    validation_warnings: List[Dict[str, Any]] = []
    for idx, case in enumerate(cases, start=1):
        prepared.append(build_testcase_payload(case, project_key=args.project_key, folder_path=folder_path, index=idx))
        warnings = collect_case_warnings(case, idx)
        if warnings:
            validation_warnings.append(
                {
                    "case_index": idx,
                    "title": normalize_title(idx, str(case.get("title") or "").strip() or f"Case {idx}"),
                    "warnings": warnings,
                }
            )

    if args.dry_run:
        print(
            json.dumps(
                {
                    "folder_path": folder_path,
                    "ensure_folder": ensure_result,
                    "existing_titles": sorted(name for name in existing_names if name),
                    "prepared_cases": prepared,
                    "validation_warnings": validation_warnings,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return

    created: List[Dict[str, Any]] = []
    skipped: List[str] = []
    for payload in prepared:
        if payload["name"] in existing_names:
            skipped.append(payload["name"])
            continue
        result = create_testcase(base_url, headers, auth, payload)
        created.append({"key": result.get("key"), "name": payload["name"]})

    print(
        json.dumps(
            {
                "issue_key": args.issue_key,
                "folder_path": folder_path,
                "created": created,
                "skipped": skipped,
                "validation_warnings": validation_warnings,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def create_cycle_command(args: argparse.Namespace, base_url: str, headers: Dict[str, str], auth: Optional[Tuple[str, str]]) -> None:
    issue = fetch_issue(base_url, headers, auth, args.issue_key)
    summary = (issue["fields"].get("summary") or "").strip()
    folder_name = args.folder_name or derive_folder_name(args.issue_key, summary)
    folder_path = build_folder_path(args.run_root, folder_name)
    ensure_result = ensure_folder(
        base_url,
        headers,
        auth,
        args.project_key,
        folder_path,
        folder_type=TEST_RUN_FOLDER_TYPE,
    )
    case_keys = parse_case_keys(args.case_keys, args.case_keys_file)
    cycle_name = args.cycle_name or build_cycle_name(args.issue_key, summary)
    payload = {
        "projectKey": args.project_key,
        "name": cycle_name,
        "folder": folder_path,
        "issueKey": args.issue_key,
        "items": [{"testCaseKey": key} for key in case_keys],
    }
    if args.dry_run:
        print(
            json.dumps(
                {
                    "issue_key": args.issue_key,
                    "folder_path": folder_path,
                    "ensure_folder": ensure_result,
                    "payload": payload,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return
    result = create_testrun(base_url, headers, auth, payload)
    labels_to_add = [ALWAYS_TESTCASE_LABEL]
    status_label = testcase_status_label((issue.get("fields") or {}).get("status"))
    if status_label:
        labels_to_add.append(status_label)
    merged_labels = merge_issue_labels(base_url, headers, auth, issue, labels_to_add)
    print(
        json.dumps(
            {
                "issue_key": args.issue_key,
                "folder_path": folder_path,
                "cycle": {
                    "key": result.get("key"),
                    "name": result.get("name"),
                    "folder": result.get("folder"),
                    "issueKey": result.get("issueKey"),
                    "testCaseCount": result.get("testCaseCount"),
                },
                "labels_added": labels_to_add,
                "final_labels": merged_labels,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def delete_suite_command(args: argparse.Namespace, base_url: str, headers: Dict[str, str], auth: Optional[Tuple[str, str]]) -> None:
    folder_path = args.folder_path
    if not folder_path:
        if not args.issue_key:
            raise SystemExit("Provide --folder-path or --issue-key to resolve the folder path.")
        issue = fetch_issue(base_url, headers, auth, args.issue_key)
        summary = (issue["fields"].get("summary") or "").strip()
        folder_name = args.folder_name or derive_folder_name(args.issue_key, summary)
        folder_path = build_folder_path(args.folder_root, folder_name)

    existing = search_testcases_in_folder(base_url, headers, auth, folder_path)
    targets = [
        {"key": str(item.get("key") or "").strip(), "name": item.get("name")}
        for item in existing
        if str(item.get("key") or "").strip()
    ]

    if args.case_keys:
        requested = {part.strip() for part in args.case_keys.split(",") if part.strip()}
        targets = [item for item in targets if item["key"] in requested]

    if args.dry_run:
        print(
            json.dumps(
                {
                    "folder_path": folder_path,
                    "matched": targets,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return

    deleted: List[Dict[str, Any]] = []
    for item in targets:
        delete_testcase(base_url, headers, auth, item["key"])
        deleted.append(item)

    print(
        json.dumps(
            {
                "folder_path": folder_path,
                "deleted": deleted,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Create Jira Zephyr Scale folders, test cases, and Sprint test cycles")
    parser.add_argument("--jira-base-url")
    parser.add_argument("--jira-user")
    parser.add_argument("--jira-password")
    parser.add_argument("--jira-token")

    subparsers = parser.add_subparsers(dest="command", required=True)

    issue_parser = subparsers.add_parser("issue", help="Fetch Jira issue scope and derived folder name")
    issue_parser.add_argument("--issue-key", required=True)

    folder_parser = subparsers.add_parser("ensure-folder", help="Create the Zephyr folder under Bao QC")
    folder_parser.add_argument("--issue-key", required=True)
    folder_parser.add_argument("--project-key", default=DEFAULT_PROJECT_KEY)
    folder_parser.add_argument("--folder-root", default=DEFAULT_FOLDER_ROOT)
    folder_parser.add_argument("--folder-name")

    run_folder_parser = subparsers.add_parser("ensure-run-folder", help="Create the Sprint test-run folder under AI Chatbot")
    run_folder_parser.add_argument("--issue-key", required=True)
    run_folder_parser.add_argument("--project-key", default=DEFAULT_PROJECT_KEY)
    run_folder_parser.add_argument("--run-root", default=DEFAULT_RUN_ROOT)
    run_folder_parser.add_argument("--folder-name")

    create_parser = subparsers.add_parser("create-suite", help="Create a Zephyr test-case suite from JSON file")
    create_parser.add_argument("--issue-key", required=True)
    create_parser.add_argument("--project-key", default=DEFAULT_PROJECT_KEY)
    create_parser.add_argument("--folder-root", default=DEFAULT_FOLDER_ROOT)
    create_parser.add_argument("--folder-name")
    create_parser.add_argument("--cases-file", required=True)
    create_parser.add_argument("--dry-run", action="store_true")

    cycle_parser = subparsers.add_parser("create-cycle", help="Create a Zephyr test cycle under a Sprint folder and link it to the issue")
    cycle_parser.add_argument("--issue-key", required=True)
    cycle_parser.add_argument("--project-key", default=DEFAULT_PROJECT_KEY)
    cycle_parser.add_argument("--run-root", default=DEFAULT_RUN_ROOT)
    cycle_parser.add_argument("--folder-name")
    cycle_parser.add_argument("--cycle-name")
    cycle_parser.add_argument("--case-keys")
    cycle_parser.add_argument("--case-keys-file")
    cycle_parser.add_argument("--dry-run", action="store_true")

    delete_parser = subparsers.add_parser(
        "delete-suite",
        help="Delete testcases from a Zephyr folder when an old suite has been superseded",
    )
    delete_parser.add_argument("--issue-key")
    delete_parser.add_argument("--project-key", default=DEFAULT_PROJECT_KEY)
    delete_parser.add_argument("--folder-root", default=DEFAULT_FOLDER_ROOT)
    delete_parser.add_argument("--folder-name")
    delete_parser.add_argument("--folder-path")
    delete_parser.add_argument("--case-keys")
    delete_parser.add_argument("--dry-run", action="store_true")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    skill_dir = Path(__file__).resolve().parent.parent
    base_url, headers, auth = resolve_auth(
        skill_dir,
        args.jira_base_url,
        args.jira_user,
        args.jira_password,
        args.jira_token,
    )

    if args.command == "issue":
        issue_command(args, base_url, headers, auth)
    elif args.command == "ensure-folder":
        ensure_folder_command(args, base_url, headers, auth)
    elif args.command == "ensure-run-folder":
        ensure_run_folder_command(args, base_url, headers, auth)
    elif args.command == "create-suite":
        create_suite_command(args, base_url, headers, auth)
    elif args.command == "create-cycle":
        create_cycle_command(args, base_url, headers, auth)
    elif args.command == "delete-suite":
        delete_suite_command(args, base_url, headers, auth)
    else:
        raise SystemExit(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    main()

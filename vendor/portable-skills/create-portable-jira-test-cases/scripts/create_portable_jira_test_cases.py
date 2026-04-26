#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import requests


DEFAULT_CONFIG_NAME = ".qa-automation.json"
DEFAULT_SOURCE_ROOT = "/Users/gumball.bi/Vexere/knowledge_base/omniagent/.agent/skills"
SOURCE_SKILL_NAME = "create-jira-test-cases"
SOURCE_SCRIPT_REL = Path(SOURCE_SKILL_NAME) / "scripts" / "create_jira_test_cases.py"
DEFAULT_FOLDER_ROOT = "/Test Cases"
DEFAULT_RUN_ROOT = "/Test Runs"
SOURCE_AUTO_LABELS = {"AI_Testcases", "TestCase1", "TestCase2", "TestCase3"}


def load_json_object(path: Path) -> Dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit(f"Expected JSON object in {path}")
    return payload


def discover_config_path(explicit: Optional[str]) -> Optional[Path]:
    candidates: List[Path] = []
    if explicit:
        candidates.append(Path(explicit).expanduser())
    env_path = os.getenv("QA_AUTOMATION_CONFIG")
    if env_path:
        candidates.append(Path(env_path).expanduser())
    candidates.append(Path.cwd() / DEFAULT_CONFIG_NAME)

    seen: set[str] = set()
    for candidate in candidates:
        resolved = candidate.resolve()
        if str(resolved) in seen:
            continue
        seen.add(str(resolved))
        if resolved.exists():
            return resolved
    return None


def resolve_path(raw: Optional[str], *, base_dir: Optional[Path] = None) -> Optional[Path]:
    if not raw:
        return None
    path = Path(raw).expanduser()
    if not path.is_absolute() and base_dir is not None:
        path = (base_dir / path).resolve()
    return path.resolve()


def config_section(config: Dict[str, Any], key: str) -> Dict[str, Any]:
    section = config.get(key) or {}
    if not isinstance(section, dict):
        raise SystemExit(f"`{key}` in config must be an object.")
    return section


def pick_first(*values: Any) -> Optional[str]:
    for value in values:
        text = str(value or "").strip()
        if text:
            return text
    return None


def load_source_skill_local_config(source_root: Path) -> Dict[str, Any]:
    local_path = source_root / SOURCE_SKILL_NAME / ".jira.local.json"
    if not local_path.exists():
        return {}
    return load_json_object(local_path)


def build_subprocess_env(
    *,
    base_url: Optional[str],
    user: Optional[str],
    password: Optional[str],
    token: Optional[str],
) -> Dict[str, str]:
    env = os.environ.copy()
    if base_url:
        env["JIRA_BASE_URL"] = base_url
    if user:
        env["JIRA_USER"] = user
    if password:
        env["JIRA_PASSWORD"] = password
    if token:
        env["JIRA_TOKEN"] = token
    return env


def resolve_jira_settings(
    args: argparse.Namespace,
    config: Dict[str, Any],
    source_local: Dict[str, Any],
) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    jira = config_section(config, "jira")
    base_url = pick_first(args.jira_base_url, os.getenv("JIRA_BASE_URL"), jira.get("base_url"), source_local.get("base_url"))
    user = pick_first(args.jira_user, os.getenv("JIRA_USER"), jira.get("user"), source_local.get("user"))
    password = pick_first(args.jira_password, os.getenv("JIRA_PASSWORD"), jira.get("password"), source_local.get("password"))
    token = pick_first(args.jira_token, os.getenv("JIRA_TOKEN"), jira.get("token"), source_local.get("token"))
    return base_url, user, password, token


def requests_json(method: str, url: str, **kwargs: Any) -> Any:
    response = requests.request(method, url, timeout=kwargs.pop("timeout", 60), **kwargs)
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
        f"{base_url.rstrip('/')}{path}",
        headers=request_headers,
        auth=auth,
        json=json_body,
        params=params,
    )


def resolve_wrapper_auth(
    base_url: Optional[str],
    user: Optional[str],
    password: Optional[str],
    token: Optional[str],
) -> Tuple[str, Dict[str, str], Optional[Tuple[str, str]]]:
    resolved_base = base_url or ""
    headers = {"Accept": "application/json"}
    auth = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    elif user and password:
        auth = (user, password)
    else:
        raise SystemExit(
            "Missing Jira credentials for wrapper operations. Provide auth via CLI, env, config, "
            "or the source skill's .jira.local.json."
        )
    if not resolved_base:
        raise SystemExit("Missing Jira base URL for wrapper operations.")
    return resolved_base, headers, auth


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


def update_issue_labels(
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    issue_key: str,
    labels: Sequence[str],
) -> List[str]:
    deduped = dedupe_labels(labels)
    jira_json(
        "PUT",
        base_url,
        f"/rest/api/2/issue/{issue_key}",
        headers=headers,
        auth=auth,
        json_body={"fields": {"labels": deduped}},
    )
    return deduped


def normalize_status_name(value: Any) -> str:
    text = str(((value or {}).get("name") if isinstance(value, dict) else value) or "").strip().lower()
    return re.sub(r"\s+", " ", text)


def dedupe_labels(labels: Sequence[str]) -> List[str]:
    merged: List[str] = []
    seen = set()
    for label in labels:
        text = str(label or "").strip()
        if not text or text in seen:
            continue
        seen.add(text)
        merged.append(text)
    return merged


def label_policy(section: Dict[str, Any]) -> Dict[str, Any]:
    policy = section.get("label_policy") or {}
    if not isinstance(policy, dict):
        raise SystemExit("`jira_test_cases.label_policy` must be an object.")
    mode = str(policy.get("mode") or "passthrough").strip().lower()
    if mode not in {"passthrough", "none", "custom"}:
        raise SystemExit("`jira_test_cases.label_policy.mode` must be `passthrough`, `none`, or `custom`.")
    always_labels = [str(item).strip() for item in policy.get("always_labels") or [] if str(item).strip()]
    raw_status = policy.get("status_labels") or {}
    if not isinstance(raw_status, dict):
        raise SystemExit("`jira_test_cases.label_policy.status_labels` must be an object.")
    status_labels = {normalize_status_name(key): str(value).strip() for key, value in raw_status.items() if str(value).strip()}
    return {
        "mode": mode,
        "always_labels": always_labels,
        "status_labels": status_labels,
    }


def resolve_custom_labels(policy: Dict[str, Any], status_name: Any) -> List[str]:
    labels = list(policy["always_labels"])
    mapped = policy["status_labels"].get(normalize_status_name(status_name))
    if mapped:
        labels.append(mapped)
    return dedupe_labels(labels)


def compute_reconciled_labels(after_issue: Dict[str, Any], policy: Dict[str, Any]) -> Optional[List[str]]:
    mode = policy["mode"]
    if mode == "passthrough":
        return None

    fields = after_issue.get("fields") or {}
    after_labels = [str(item).strip() for item in fields.get("labels") or [] if str(item).strip()]
    configured_labels = set(policy["always_labels"]) | set(policy["status_labels"].values())
    base_labels = [label for label in after_labels if label not in SOURCE_AUTO_LABELS and label not in configured_labels]

    if mode == "none":
        return dedupe_labels(base_labels)
    return dedupe_labels(base_labels + resolve_custom_labels(policy, fields.get("status")))


def resolve_source_root(args: argparse.Namespace, config: Dict[str, Any], config_path: Optional[Path]) -> Path:
    raw = pick_first(args.source_root, os.getenv("OMNIAGENT_SKILL_SOURCE_ROOT"), config.get("source_root"), DEFAULT_SOURCE_ROOT)
    resolved = resolve_path(raw, base_dir=config_path.parent if config_path else None)
    if resolved is None:
        raise SystemExit("Could not resolve source_root.")
    return resolved


def resolve_project_key(explicit: Optional[str], section: Dict[str, Any], issue: Optional[Dict[str, Any]]) -> str:
    key = pick_first(explicit, section.get("project_key"), ((issue or {}).get("fields") or {}).get("project", {}).get("key"))
    if not key:
        raise SystemExit("Missing project key. Provide --project-key or set jira_test_cases.project_key in config.")
    return key


def build_source_command(
    args: argparse.Namespace,
    *,
    section: Dict[str, Any],
    issue: Optional[Dict[str, Any]],
    source_script: Path,
) -> List[str]:
    command = [sys.executable, str(source_script), args.command]

    if args.command == "issue":
        command.extend(["--issue-key", args.issue_key])
        return command

    project_key = resolve_project_key(getattr(args, "project_key", None), section, issue)
    folder_root = pick_first(getattr(args, "folder_root", None), section.get("folder_root"), DEFAULT_FOLDER_ROOT)
    run_root = pick_first(getattr(args, "run_root", None), section.get("run_root"), DEFAULT_RUN_ROOT)

    if args.command == "ensure-folder":
        command.extend(["--issue-key", args.issue_key, "--project-key", project_key, "--folder-root", str(folder_root)])
        if args.folder_name:
            command.extend(["--folder-name", args.folder_name])
        return command

    if args.command == "ensure-run-folder":
        command.extend(["--issue-key", args.issue_key, "--project-key", project_key, "--run-root", str(run_root)])
        if args.folder_name:
            command.extend(["--folder-name", args.folder_name])
        return command

    if args.command == "create-suite":
        cases_file = str(Path(args.cases_file).expanduser().resolve())
        command.extend(
            [
                "--issue-key",
                args.issue_key,
                "--project-key",
                project_key,
                "--folder-root",
                str(folder_root),
                "--cases-file",
                cases_file,
            ]
        )
        if args.folder_name:
            command.extend(["--folder-name", args.folder_name])
        if args.dry_run:
            command.append("--dry-run")
        return command

    if args.command == "create-cycle":
        command.extend(["--issue-key", args.issue_key, "--project-key", project_key, "--run-root", str(run_root)])
        if args.folder_name:
            command.extend(["--folder-name", args.folder_name])
        if args.cycle_name:
            command.extend(["--cycle-name", args.cycle_name])
        if args.case_keys:
            command.extend(["--case-keys", args.case_keys])
        if args.case_keys_file:
            command.extend(["--case-keys-file", str(Path(args.case_keys_file).expanduser().resolve())])
        if args.dry_run:
            command.append("--dry-run")
        return command

    if args.command == "delete-suite":
        command.extend(["--project-key", project_key, "--folder-root", str(folder_root)])
        if args.issue_key:
            command.extend(["--issue-key", args.issue_key])
        if args.folder_name:
            command.extend(["--folder-name", args.folder_name])
        if args.folder_path:
            command.extend(["--folder-path", args.folder_path])
        if args.case_keys:
            command.extend(["--case-keys", args.case_keys])
        if args.dry_run:
            command.append("--dry-run")
        return command

    raise SystemExit(f"Unsupported command: {args.command}")


def run_source_command(command: List[str], env: Dict[str, str]) -> Tuple[int, str, str]:
    result = subprocess.run(command, capture_output=True, text=True, env=env)
    return result.returncode, result.stdout, result.stderr


def maybe_reconcile_labels(
    *,
    args: argparse.Namespace,
    policy: Dict[str, Any],
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    stdout: str,
) -> str:
    if args.command != "create-cycle" or args.dry_run or policy["mode"] == "passthrough":
        return stdout

    payload = json.loads(stdout)
    after_issue = fetch_issue(base_url, headers, auth, args.issue_key)
    final_labels = compute_reconciled_labels(after_issue, policy)
    if final_labels is None:
        return stdout
    saved = update_issue_labels(base_url, headers, auth, args.issue_key, final_labels)
    if isinstance(payload, dict):
        payload["portable_label_policy"] = {
            "mode": policy["mode"],
            "final_labels": saved,
        }
        return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    return stdout


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Portable wrapper around OmniAgent Zephyr testcase automation with repo-specific config overrides."
    )
    parser.add_argument("--config-file")
    parser.add_argument("--source-root")
    parser.add_argument("--jira-base-url")
    parser.add_argument("--jira-user")
    parser.add_argument("--jira-password")
    parser.add_argument("--jira-token")

    subparsers = parser.add_subparsers(dest="command", required=True)

    issue_parser = subparsers.add_parser("issue", help="Fetch Jira issue summary from the portable wrapper.")
    issue_parser.add_argument("--issue-key", required=True)

    folder_parser = subparsers.add_parser("ensure-folder", help="Ensure testcase folder using project config defaults.")
    folder_parser.add_argument("--issue-key", required=True)
    folder_parser.add_argument("--project-key")
    folder_parser.add_argument("--folder-root")
    folder_parser.add_argument("--folder-name")

    run_folder_parser = subparsers.add_parser("ensure-run-folder", help="Ensure test-run folder using project config defaults.")
    run_folder_parser.add_argument("--issue-key", required=True)
    run_folder_parser.add_argument("--project-key")
    run_folder_parser.add_argument("--run-root")
    run_folder_parser.add_argument("--folder-name")

    create_suite_parser = subparsers.add_parser("create-suite", help="Create testcase suite from JSON with portable defaults.")
    create_suite_parser.add_argument("--issue-key", required=True)
    create_suite_parser.add_argument("--project-key")
    create_suite_parser.add_argument("--folder-root")
    create_suite_parser.add_argument("--folder-name")
    create_suite_parser.add_argument("--cases-file", required=True)
    create_suite_parser.add_argument("--dry-run", action="store_true")

    cycle_parser = subparsers.add_parser("create-cycle", help="Create test cycle and reconcile labels using project config.")
    cycle_parser.add_argument("--issue-key", required=True)
    cycle_parser.add_argument("--project-key")
    cycle_parser.add_argument("--run-root")
    cycle_parser.add_argument("--folder-name")
    cycle_parser.add_argument("--cycle-name")
    cycle_parser.add_argument("--case-keys")
    cycle_parser.add_argument("--case-keys-file")
    cycle_parser.add_argument("--dry-run", action="store_true")

    delete_parser = subparsers.add_parser("delete-suite", help="Delete testcase suite using portable defaults.")
    delete_parser.add_argument("--issue-key")
    delete_parser.add_argument("--project-key")
    delete_parser.add_argument("--folder-root")
    delete_parser.add_argument("--folder-name")
    delete_parser.add_argument("--folder-path")
    delete_parser.add_argument("--case-keys")
    delete_parser.add_argument("--dry-run", action="store_true")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    config_path = discover_config_path(args.config_file)
    config = load_json_object(config_path) if config_path else {}
    section = config_section(config, "jira_test_cases")

    source_root = resolve_source_root(args, config, config_path)
    source_script = source_root / SOURCE_SCRIPT_REL
    if not source_script.exists():
        raise SystemExit(
            f"Source script not found: {source_script}. Update `source_root` in config or set OMNIAGENT_SKILL_SOURCE_ROOT."
        )

    source_local = load_source_skill_local_config(source_root)
    base_url, user, password, token = resolve_jira_settings(args, config, source_local)

    need_issue = False
    if args.command in {"ensure-folder", "ensure-run-folder", "create-suite", "create-cycle"}:
        need_issue = not bool(getattr(args, "project_key", None) or section.get("project_key"))
    if args.command == "create-cycle" and not args.dry_run:
        need_issue = True

    issue: Optional[Dict[str, Any]] = None
    auth_bundle: Optional[Tuple[str, Dict[str, str], Optional[Tuple[str, str]]]] = None
    if need_issue:
        resolved_base, headers, auth = resolve_wrapper_auth(base_url, user, password, token)
        auth_bundle = (resolved_base, headers, auth)
        issue = fetch_issue(resolved_base, headers, auth, args.issue_key)

    env = build_subprocess_env(base_url=base_url, user=user, password=password, token=token)
    command = build_source_command(args, section=section, issue=issue, source_script=source_script)
    returncode, stdout, stderr = run_source_command(command, env)

    if returncode != 0:
        if stdout:
            sys.stdout.write(stdout)
        if stderr:
            sys.stderr.write(stderr)
        raise SystemExit(returncode)

    if stdout and args.command == "create-cycle" and not args.dry_run:
        if auth_bundle is None:
            resolved_base, headers, auth = resolve_wrapper_auth(base_url, user, password, token)
            auth_bundle = (resolved_base, headers, auth)
        policy = label_policy(section)
        stdout = maybe_reconcile_labels(
            args=args,
            policy=policy,
            base_url=auth_bundle[0],
            headers=auth_bundle[1],
            auth=auth_bundle[2],
            stdout=stdout,
        )

    if stdout:
        sys.stdout.write(stdout)
    if stderr:
        sys.stderr.write(stderr)


if __name__ == "__main__":
    main()

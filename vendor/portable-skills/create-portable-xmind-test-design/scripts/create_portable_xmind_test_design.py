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
SOURCE_SKILL_NAME = "create-xmind-test-design"
SOURCE_SCRIPT_REL = Path(SOURCE_SKILL_NAME) / "scripts" / "create_xmind_test_design.py"
DEFAULT_OUTPUT_DIR = Path("qa") / "xmind-test-design"
SOURCE_AUTO_LABELS = {"AI_testdesign", "TestDesign1", "TestDesign2", "TestDesign3"}


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


def label_policy(section: Dict[str, Any]) -> Dict[str, Any]:
    policy = section.get("label_policy") or {}
    if not isinstance(policy, dict):
        raise SystemExit("`xmind_test_design.label_policy` must be an object.")
    mode = str(policy.get("mode") or "passthrough").strip().lower()
    if mode not in {"passthrough", "none", "custom"}:
        raise SystemExit("`xmind_test_design.label_policy.mode` must be `passthrough`, `none`, or `custom`.")
    always_labels = [str(item).strip() for item in policy.get("always_labels") or [] if str(item).strip()]
    raw_status = policy.get("status_labels") or {}
    if not isinstance(raw_status, dict):
        raise SystemExit("`xmind_test_design.label_policy.status_labels` must be an object.")
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


def resolve_output_dir(args: argparse.Namespace, section: Dict[str, Any], config_path: Optional[Path]) -> Path:
    if args.output_dir:
        return Path(args.output_dir).expanduser().resolve()
    raw = section.get("output_dir")
    if raw:
        resolved = resolve_path(str(raw), base_dir=config_path.parent if config_path else Path.cwd())
        if resolved is not None:
            return resolved
    return (Path.cwd() / DEFAULT_OUTPUT_DIR).resolve()


def load_outline_issue_key(path: Path) -> str:
    payload = load_json_object(path)
    return str(payload.get("issue_key") or "").strip().upper()


def build_source_command(
    args: argparse.Namespace,
    *,
    section: Dict[str, Any],
    config_path: Optional[Path],
    source_script: Path,
) -> Tuple[List[str], bool]:
    command = [sys.executable, str(source_script), args.command]
    attach_any = False

    if args.command == "issue":
        command.extend(["--issue-key", args.issue_key])
        return command, attach_any

    if args.command == "init-outline":
        template = str(args.template or section.get("default_template") or "auto").strip()
        command.extend(["--issue-key", args.issue_key, "--template", template])
        if args.cases_file:
            command.extend(["--cases-file", str(Path(args.cases_file).expanduser().resolve())])
        if args.out:
            command.extend(["--out", str(Path(args.out).expanduser().resolve())])
        if args.ascii_only:
            command.append("--ascii-only")
        return command, attach_any

    if args.command == "build":
        outline_file = Path(args.outline_file).expanduser().resolve()
        command.extend(["--outline-file", str(outline_file)])
        command.extend(["--output-dir", str(resolve_output_dir(args, section, config_path))])
        if args.issue_key:
            command.extend(["--issue-key", args.issue_key])
        if args.title:
            command.extend(["--title", args.title])

        attach_all = bool(args.attach_all or section.get("attach_all"))
        attach_png = bool(args.attach_png or section.get("attach_png"))
        attach_xmind = bool(args.attach_xmind or section.get("attach_xmind"))
        replace_existing = bool(args.replace_existing or section.get("replace_existing"))

        if attach_all:
            command.append("--attach-all")
        else:
            if attach_png:
                command.append("--attach-png")
            if attach_xmind:
                command.append("--attach-xmind")
        if replace_existing:
            command.append("--replace-existing")
        if args.ascii_only:
            command.append("--ascii-only")
        if args.keep_svg:
            command.append("--keep-svg")

        attach_any = attach_all or attach_png or attach_xmind
        return command, attach_any

    raise SystemExit(f"Unsupported command: {args.command}")


def run_source_command(command: List[str], env: Dict[str, str]) -> Tuple[int, str, str]:
    result = subprocess.run(command, capture_output=True, text=True, env=env)
    return result.returncode, result.stdout, result.stderr


def maybe_reconcile_labels(
    *,
    issue_key: str,
    policy: Dict[str, Any],
    base_url: str,
    headers: Dict[str, str],
    auth: Optional[Tuple[str, str]],
    stdout: str,
) -> str:
    if policy["mode"] == "passthrough":
        return stdout

    payload = json.loads(stdout)
    after_issue = fetch_issue(base_url, headers, auth, issue_key)
    final_labels = compute_reconciled_labels(after_issue, policy)
    if final_labels is None:
        return stdout
    saved = update_issue_labels(base_url, headers, auth, issue_key, final_labels)
    if isinstance(payload, dict):
        payload["portable_label_policy"] = {
            "mode": policy["mode"],
            "final_labels": saved,
        }
        return json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    return stdout


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Portable wrapper around OmniAgent XMind test-design automation with repo-specific config overrides."
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

    outline_parser = subparsers.add_parser("init-outline", help="Create outline scaffold with portable defaults.")
    outline_parser.add_argument("--issue-key", required=True)
    outline_parser.add_argument(
        "--template",
        choices=["auto", "tool", "ui", "bugfix", "general", "reporting", "workflow", "chatbot"],
    )
    outline_parser.add_argument("--cases-file")
    outline_parser.add_argument("--out")
    outline_parser.add_argument("--ascii-only", action="store_true")

    build_parser = subparsers.add_parser("build", help="Build XMind and PNG artifacts with portable defaults.")
    build_parser.add_argument("--outline-file", required=True)
    build_parser.add_argument("--output-dir")
    build_parser.add_argument("--issue-key")
    build_parser.add_argument("--title")
    build_parser.add_argument("--attach-png", action="store_true")
    build_parser.add_argument("--attach-xmind", action="store_true")
    build_parser.add_argument("--attach-all", action="store_true")
    build_parser.add_argument("--replace-existing", action="store_true")
    build_parser.add_argument("--ascii-only", action="store_true")
    build_parser.add_argument("--keep-svg", action="store_true")

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    config_path = discover_config_path(args.config_file)
    config = load_json_object(config_path) if config_path else {}
    section = config_section(config, "xmind_test_design")

    source_root = resolve_source_root(args, config, config_path)
    source_script = source_root / SOURCE_SCRIPT_REL
    if not source_script.exists():
        raise SystemExit(
            f"Source script not found: {source_script}. Update `source_root` in config or set OMNIAGENT_SKILL_SOURCE_ROOT."
        )

    source_local = load_source_skill_local_config(source_root)
    base_url, user, password, token = resolve_jira_settings(args, config, source_local)
    env = build_subprocess_env(base_url=base_url, user=user, password=password, token=token)

    command, attach_any = build_source_command(args, section=section, config_path=config_path, source_script=source_script)
    returncode, stdout, stderr = run_source_command(command, env)

    if returncode != 0:
        if stdout:
            sys.stdout.write(stdout)
        if stderr:
            sys.stderr.write(stderr)
        raise SystemExit(returncode)

    if stdout and args.command == "build" and attach_any:
        policy = label_policy(section)
        if policy["mode"] != "passthrough":
            issue_key = str(args.issue_key or load_outline_issue_key(Path(args.outline_file).expanduser().resolve()) or "").strip().upper()
            if not issue_key:
                raise SystemExit("Label reconciliation requires issue_key in the outline or via --issue-key.")
            resolved_base, headers, auth = resolve_wrapper_auth(base_url, user, password, token)
            stdout = maybe_reconcile_labels(
                issue_key=issue_key,
                policy=policy,
                base_url=resolved_base,
                headers=headers,
                auth=auth,
                stdout=stdout,
            )

    if stdout:
        sys.stdout.write(stdout)
    if stderr:
        sys.stderr.write(stderr)


if __name__ == "__main__":
    main()

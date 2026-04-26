---
name: create-portable-jira-test-cases
description: Create Jira Zephyr Scale test-case folders, test cases, and test cycles across different repos or projects by providing a portable project config. Use when the existing create-jira-test-cases flow should be reused outside OmniAgent without modifying the original skill.
---

# Create Portable Jira Test Cases

Use this skill when:

- you want the same Zephyr testcase workflow in another repo
- the Jira project, folder roots, or label policy differ by project
- you do not want to modify the original OmniAgent `create-jira-test-cases` skill

This skill is a global wrapper. It keeps the improved testcase logic from OmniAgent, but moves project-specific parts into a config file.

## What To Provide

Put a repo-level config file at:

```text
.qa-automation.json
```

or pass it explicitly with `--config-file`.

Reference sample:

- [minimum config](../_shared-portable-qa/qa-automation.minimum.json)
- [full config](../_shared-portable-qa/qa-automation.full.json)
- [example config](../_shared-portable-qa/qa-automation.example.json)

Minimum runnable shape:

```json
{
  "source_root": "/Users/gumball.bi/Vexere/knowledge_base/omniagent/.agent/skills",
  "jira": {
    "base_url": "https://jira.example.com"
  },
  "jira_test_cases": {
    "project_key": "AI",
    "folder_root": "/Bao QC",
    "run_root": "/AI Chatbot",
    "label_policy": {
      "mode": "custom",
      "always_labels": ["AI_Testcases"],
      "status_labels": {
        "to do": "TestCase1",
        "in progress": "TestCase1",
        "ready to test": "TestCase2",
        "testing": "TestCase3",
        "done": "TestCase3"
      }
    }
  }
}
```

Use the `full` sample when you also want label policy defaults and a fuller project convention contract.

Notes:

- `source_root` points to the repo that contains the original OmniAgent skill scripts.
- `label_policy.mode` supports:
  - `passthrough`: keep source skill labels as-is
  - `none`: remove source skill auto-labels after the run
  - `custom`: replace source skill auto-labels with your project labels
- Jira auth can come from:
  - CLI flags
  - env vars `JIRA_BASE_URL`, `JIRA_USER`, `JIRA_PASSWORD`, `JIRA_TOKEN`
  - `jira` section in `.qa-automation.json`
  - the source skill's own `.jira.local.json`

## Commands

Fetch Jira issue scope:

```bash
python3 ~/.codex/skills/create-portable-jira-test-cases/scripts/create_portable_jira_test_cases.py \
  issue \
  --issue-key AI-707
```

Create testcase suite from a local JSON file:

```bash
python3 ~/.codex/skills/create-portable-jira-test-cases/scripts/create_portable_jira_test_cases.py \
  create-suite \
  --issue-key AI-707 \
  --cases-file /abs/path/ai_707_cases.json
```

Create the matching test cycle with project-specific label handling:

```bash
python3 ~/.codex/skills/create-portable-jira-test-cases/scripts/create_portable_jira_test_cases.py \
  create-cycle \
  --issue-key AI-707 \
  --case-keys AI-T2004,AI-T2005
```

## Behavior

- project-specific defaults come from `.qa-automation.json`
- CLI flags still override config values
- the wrapper delegates to the original OmniAgent skill script
- the original skill is not modified
- if `label_policy.mode` is not `passthrough`, the wrapper reconciles issue labels after cycle creation so other projects do not inherit OmniAgent-only labels

## When This Is Enough

This wrapper is enough when:

- the improved testcase design logic should stay centralized in one source repo
- multiple repos on the same machine need to reuse it
- each repo only needs to supply its own Jira/project conventions

If later you want full machine-independent portability, the next step is to vendor the source scripts or publish them as a dedicated plugin/package instead of pointing at `source_root`.

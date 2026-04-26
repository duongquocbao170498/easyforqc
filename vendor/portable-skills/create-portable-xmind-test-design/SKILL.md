---
name: create-portable-xmind-test-design
description: Create Jira issue test-design mindmaps in XMind and PNG across different repos or projects by providing a portable project config. Use when the existing create-xmind-test-design flow should be reused outside OmniAgent without modifying the original skill.
---

# Create Portable XMind Test Design

Use this skill when:

- you want the same Jira-to-XMind test-design flow in another repo
- output folder, attachment behavior, or label policy differ by project
- you do not want to modify the original OmniAgent `create-xmind-test-design` skill

This skill is a global wrapper. It keeps the improved OmniAgent XMind generation flow, but makes project-specific behavior configurable.

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
  "xmind_test_design": {
    "output_dir": "./qa/xmind-test-design",
    "attach_all": true,
    "replace_existing": true,
    "default_template": "auto",
    "label_policy": {
      "mode": "custom",
      "always_labels": ["QA_testdesign"],
      "status_labels": {
        "to do": "TestDesign1",
        "in progress": "TestDesign1",
        "ready to test": "TestDesign2",
        "testing": "TestDesign3",
        "done": "TestDesign3"
      }
    }
  }
}
```

Use the `full` sample when you also want label policy defaults, attachment defaults, and richer project conventions.

Notes:

- `source_root` points to the repo that contains the original OmniAgent skill scripts.
- `output_dir` can be relative to the repo config location.
- `label_policy.mode` supports:
  - `passthrough`: keep source skill labels as-is
  - `none`: remove source skill auto-labels after upload
  - `custom`: replace source skill auto-labels with your project labels
- Jira auth can come from:
  - CLI flags
  - env vars `JIRA_BASE_URL`, `JIRA_USER`, `JIRA_PASSWORD`, `JIRA_TOKEN`
  - `jira` section in `.qa-automation.json`
  - the source skill's own `.jira.local.json`

## Commands

Fetch Jira issue scope:

```bash
python3 ~/.codex/skills/create-portable-xmind-test-design/scripts/create_portable_xmind_test_design.py \
  issue \
  --issue-key AI-707
```

Create outline scaffold:

```bash
python3 ~/.codex/skills/create-portable-xmind-test-design/scripts/create_portable_xmind_test_design.py \
  init-outline \
  --issue-key AI-707 \
  --out /abs/path/ai_707_outline.json
```

Render and upload:

```bash
python3 ~/.codex/skills/create-portable-xmind-test-design/scripts/create_portable_xmind_test_design.py \
  build \
  --outline-file /abs/path/ai_707_outline.json
```

## Behavior

- project-specific defaults come from `.qa-automation.json`
- CLI flags still override config values
- the wrapper delegates to the original OmniAgent skill script
- the original skill is not modified
- if `label_policy.mode` is not `passthrough`, the wrapper reconciles issue labels after attachment upload so other projects do not inherit OmniAgent-only labels

## When This Is Enough

This wrapper is enough when:

- the improved XMind rendering flow should stay centralized in one source repo
- multiple repos on the same machine need to reuse it
- each repo only needs to supply its own Jira/project conventions

If later you want full machine-independent portability, the next step is to vendor the source scripts or publish them as a dedicated plugin/package instead of pointing at `source_root`.

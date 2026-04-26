---
public_confluence_url: not_public
created_at: '2026-04-20'
updated_at: '2026-04-24'
name: create-xmind-test-design
description: Create a Jira task test-design mindmap in XMind format, export the same map to PNG, and attach the outputs back to the Jira issue. Use when the user wants a compact 4-5 branch QA design that covers a task broadly but stays easy to review inside Jira.
version: 1.3.0
category: automation
---

# Create XMind Test Design

Use this skill when the user wants you to:

- create a test design mindmap for a Jira task
- keep the map compact with only 4-5 main branches
- save the output as `.xmind`
- export the same design as `.png`
- attach the generated files back to the Jira issue

Before drafting the map, read:

- [../_shared-test-design/task-archetype-matrix.md](../_shared-test-design/task-archetype-matrix.md) to classify the task
- [../_shared-test-design/test-design-techniques.md](../_shared-test-design/test-design-techniques.md) to choose the right test-design lens

## Output Standard

The final map should stay compact and reviewable:

- 4-5 main branches only
- each branch should usually contain 3-5 concrete bullets
- avoid generic filler like `Main flow`, `Validation`, `Regression` if the Jira task gives enough context for stronger branch names
- keep Vietnamese text with full diacritics for root title, branch titles, bullets, and filenames whenever the task source is in Vietnamese
- always include regression coverage somewhere in the map
- always include one explicit `Out of scope` branch and merge nearby branches to stay within 4-5 total branches

## Persistent User Preference

For future Jira test-design tasks, keep these defaults unless the user says otherwise:

- preserve Vietnamese diacritics in final `.xmind` and `.png` titles, branch labels, bullets, and filenames
- when revising an already-uploaded design for the same Jira issue, delete the old same-name PNG and XMind attachments before uploading the new revision
- always include an explicit `Out of scope` branch instead of leaving scope exclusions implicit
- build the test design from the Jira `description` first, because it is the primary source of scope and acceptance intent
- if reusable test cases already exist, use them as supporting input to refine branch coverage, edge cases, guardrails, and regression checks
- when description and existing test cases differ, align the main structure to the Jira description first, then use test cases to expand or sharpen the design
- when mentioning tools in the final test design, prefer explicit tool names such as `get_bms_order_details_tool` instead of ordinal labels like `Tool 6` or `Tool 7`

## Source Priority

Use sources in this order when creating a test design:

1. Jira issue summary and description
2. Acceptance criteria and explicit scope notes inside the issue
3. Existing local test cases for the same task, if available
4. Related evidence such as known bug patterns or nearby task variants only when needed

This means:

- the root title and main branch structure should come from the Jira issue itself
- existing test cases are not the primary source of scope, but they are strong evidence for concrete scenarios, negative paths, retries, and regression coverage
- if the Jira issue is inaccessible, fall back to existing test cases and clearly treat the result as inferred from those artifacts

When local testcase JSON already exists, use it as supporting evidence for:

- concrete edge cases
- regression hotspots
- state transitions
- fail-safe / fallback coverage
- naming sharper branch bullets

The default visual style matches the provided brace-style sample:

- central topic on the left
- branch groups stacked on the right
- one `.xmind` file
- one `.png` file with the same structure

## Coverage Rule

Do not stop at happy path. The map should cover the task broadly within 4-5 branches.

First identify the task archetype and choose explicit techniques. Do not build branches as a generic bucket list.

Useful defaults:

- reporting / dashboard / sort task:
  - `Decision table`
  - `Regression`
  - `Boundary / null-value handling`
  - `State transition` when source status can change live
- workflow / routing task:
  - `State transition`
  - `Decision table`
  - `Retry / recovery`
- chatbot / orchestration task:
  - `Use-case flow`
  - `Tool choice and data grounding`
  - `Fallback / handoff`
  - `State / retry regression`

Pick the branch set that fits the ticket best. Common patterns:

- Tool or API task:
  - main flow
  - input mapping and validation
  - output and state changes
  - fallback or missing data
  - regression
- UI task:
  - main user flow
  - validation and UI states
  - permission or data conditions
  - error or empty states
  - regression
- Bug-fix task:
  - primary fix path
  - negative path
  - retry or duplicate handling
  - fallback or recovery
  - regression
- Reporting / dashboard / sort task:
  - priority rule and grouping
  - displayed data and row binding
  - refresh / realtime / pagination
  - fallback or empty data
  - regression

Always keep one explicit `Out of scope` branch.

To stay within 4-5 branches:

- merge retry, fail-safe, or regression into a nearby branch when needed
- do not drop `Out of scope` even if the ticket scope seems obvious

## Auth Rule

Do not hardcode Jira credentials in repo files.

The helper script supports:

- explicit CLI flags
- environment variables:
  - `JIRA_BASE_URL`
  - `JIRA_USER`
  - `JIRA_PASSWORD`
  - `JIRA_TOKEN`
- local untracked file:
  - `.agent/skills/create-xmind-test-design/.jira.local.json`

Expected local file shape:

```json
{
  "base_url": "https://jira.vexere.net",
  "user": "name@example.com",
  "password": "secret"
}
```

or:

```json
{
  "base_url": "https://jira.vexere.net",
  "token": "..."
}
```

## Workflow

1. Read the Jira issue first.
2. Build the outline deliberately instead of rendering the first scaffold as-is.
3. Classify the task archetype and choose the right test-design techniques.
4. Keep only 4-5 main branches.
5. Make each bullet concrete and task-specific.
6. Render the outline into `.xmind` and `.png`.
7. Attach at least the `.png` back to the Jira task.
8. Attach the `.xmind` too unless the user only wants the preview image.
9. After attachments are uploaded, merge labels into the Jira task:
   - always add `AI_testdesign`
   - add `TestDesign1` when the task status at that moment is `To do` or `In Progress`
   - add `TestDesign2` when the task status at that moment is `Ready To Test`
   - add `TestDesign3` when the task status at that moment is `Testing` or `Done`
   - keep existing labels and append the new test-design labels instead of overwriting unrelated ones

## Helper Script

Main helper:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-xmind-test-design/scripts/create_xmind_test_design.py \
  issue \
  --issue-key AI-607
```

Create a scaffold outline:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-xmind-test-design/scripts/create_xmind_test_design.py \
  init-outline \
  --issue-key AI-607 \
  --out /abs/path/ai_607_outline.json
```

Create a scaffold and feed existing local testcase JSON as supporting context:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-xmind-test-design/scripts/create_xmind_test_design.py \
  init-outline \
  --issue-key AI-607 \
  --cases-file /abs/path/ai_607_test_cases.json \
  --out /abs/path/ai_607_outline.json
```

Render the final map and attach both files:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-xmind-test-design/scripts/create_xmind_test_design.py \
  build \
  --outline-file /abs/path/ai_607_outline.json \
  --attach-all
```

Render without upload:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-xmind-test-design/scripts/create_xmind_test_design.py \
  build \
  --outline-file /abs/path/ai_607_outline.json
```

Replace old same-name attachments on Jira before uploading the revision:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-xmind-test-design/scripts/create_xmind_test_design.py \
  build \
  --outline-file /abs/path/ai_607_outline.json \
  --attach-all \
  --replace-existing
```

Force ASCII only when a downstream tool cannot handle Unicode:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-xmind-test-design/scripts/create_xmind_test_design.py \
  build \
  --outline-file /abs/path/ai_607_outline.json \
  --ascii-only
```

Default output directory:

```text
qa/xmind-test-design/
```

## Recommended Agent Behavior

Use the scaffold only as a starting point. Replace the placeholder bullets before rendering.

Strong default sequence:

1. Run `issue` to read the ticket.
2. Classify the task archetype and choose the right techniques.
3. Use the Jira description to define the main QA scope and branch structure.
4. Check whether existing test cases already exist for the same task and use them to refine scenario coverage.
5. Run `init-outline`; pass `--cases-file` when local testcase JSON already exists.
6. Edit the outline JSON so the branches are task-specific and keep the required `Out of scope` branch.
7. Record any unresolved behavior as an open question in the outline JSON metadata instead of silently guessing.
8. Run `build --attach-all`; if you are revising an existing Jira upload, add `--replace-existing`.
9. Report the saved paths and uploaded attachments.

## Outline JSON Shape

```json
{
  "issue_key": "AI-607",
  "title": "[AI-607] [Tool] Improve ...",
  "branches": [
    {
      "title": "Read fee config from VCMS",
      "items": [
        "Tool reads the correct config for the current business case",
        "No hardcoded fee is used when config exists",
        "Result changes when config changes"
      ]
    }
  ]
}
```

The renderer will fail if placeholder bullets are still present. That is intentional.

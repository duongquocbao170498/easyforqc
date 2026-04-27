---
public_confluence_url: not_public
created_at: '2026-04-20'
updated_at: '2026-04-24'
name: create-jira-test-cases
description: Create Jira Zephyr Scale test-case folders under Bao QC, then create the matching Sprint test-cycle folder, cycle, and issue linkage for AI tasks. Use when the user wants a new task audited into a reusable QA suite with strong coverage, consistent TC naming, preconditions, steps, test data, expected results, and direct import into Jira.
version: 1.2.0
category: automation
---

# Create Jira Test Cases

Use this skill when the user wants you to:

- read a Jira task and design a strong QA suite
- create a Zephyr Scale folder under `Bao QC`
- import test cases directly into Jira
- create the matching Sprint test-cycle folder under `AI Chatbot`
- create the test cycle and add all created test cases into it
- link the created test cycle back to the Jira task
- keep a strict test-case format for reuse

Before drafting cases, read:

- [../_shared-test-design/task-archetype-matrix.md](../_shared-test-design/task-archetype-matrix.md) to classify the task
- [../_shared-test-design/test-design-techniques.md](../_shared-test-design/test-design-techniques.md) to choose the right techniques

## Scope

This skill targets:

- Jira: `https://jira.vexere.net`
- Project key: usually `AI`
- Test management: Zephyr Scale (`/rest/atm/1.0/...`)
- Folder root: `/Bao QC`

## Output Standard

Every test case must include:

- `Title`
  - always starts with `[TC_0001] ...`
- `Precondition`
- `Steps`
  - use 3-4 clear tester actions for the scenario, like the existing `ai_703`, `ai_704`, and `ai_707` suites
  - each step is one Zephyr Test Player row; do not merge all actions into one paragraph
- `Test Data`
  - for chatbot/tool flows, this must be the real user messages
  - for UI/reporting/integration flows, this must be a concrete dataset or named variant, not generic placeholder text
- `Expected Result`
  - write multiline bullet points so Jira/Zephyr is readable

Preferred local JSON fields for stronger reusable design:

- required:
  - `title`
  - `precondition`
  - `test_data`
  - `expected_result`
  - one of:
    - `step`
    - `steps`
    - `structured_steps`
- recommended:
  - `objective`
  - `priority`
  - `technique`
  - `risk`
  - `requirement_ref`
  - `coverage_tags`
  - `scenario_type`

Use `structured_steps` when per-step test data and expected result matter:

```json
{
  "structured_steps": [
    {
      "description": "Mở dashboard tổng quan",
      "test_data": "Dữ liệu seed có 3 agent Online/Busy/Offline",
      "expected_result": "- Card tải thành công"
    },
    {
      "description": "Quan sát thứ tự danh sách agent",
      "test_data": "",
      "expected_result": "- Online đứng trước Busy và Offline"
    }
  ]
}
```

## Persistent User Preference

For future Jira QA tasks that may later sync into NocoDB:

- keep Jira as `1 testcase = 1 scenario`
- write testcase structure in the same style as the existing OmniAgent suites such as `ai_703_test_cases.json`, `ai_704_test_cases.json`, and `ai_707_test_cases_v2.json`: strong scenario title, concrete precondition, 3-4 action steps, realistic test data, and bullet expected results
- use those suites as writing examples only; the actual content must be derived from the current Jira task, comments, acceptance criteria, and relevant docs
- preserve Vietnamese text with full diacritics in testcase title, precondition, step, test data, and expected result when the source task is in Vietnamese
- keep `Test Data` in Jira as the full ordered user conversation for that scenario
- render `Test Data` as numbered lines:
  - `1. "..."`  
  - `2. "..."`  
  - `3. "..."`
- each numbered line must contain exactly one user message, not multiple messages merged into one line
- render `Expected Result` in Jira as multiline bullet points, not a semicolon-separated sentence
- write strong scenario titles because the downstream NocoDB dataset may derive step identifiers from the Jira testcase title

When the user also wants NocoDB sync via `sync-jira-test-cases-to-nocodb`, preserve enough structure in the local case JSON so the downstream sync can expand the scenario into step-based dataset rows.

## Folder Naming Rule

When the source ticket is like `AI-662` and summary is:

`[Payment] Route payment success callback back to the original chatbot conversation after BMS payment link flow`

create the folder as:

`/Bao QC/662. [Payment] Route payment success callback back to the original chatbot conversation after BMS payment link flow`

Place the folder under `Bao QC`. The Zephyr folder create API currently appends new folders at the end, which matches the expected workflow.

If the Jira summary contains `/` or `\`, replace those path separators with `-` in the folder name so Zephyr does not create unintended nested subfolders.

## Test Cycle Naming Rule

When the user also wants Sprint execution coverage, create:

- test-run folder:
  - `/AI Chatbot/Quý <quarter> - <year>/Sprint <number>/<ticket-folder-name>`
- test cycle name:
  - `[AI-662][Payment] Route payment success callback back to the original chatbot conversation after BMS payment link flow`

For the `AI-662` example used above, the matching test-run folder is:

`/AI Chatbot/Quý 2 - 2026/Sprint 21/662. [Payment] Route payment success callback back to the original chatbot conversation after BMS payment link flow`

Rules:

- use the same `<ticket-folder-name>` for both Bao QC and Sprint execution folders
- if the Jira summary contains `/` or `\`, replace them with `-` in the folder path segment before creating the Zephyr folder
- create the test-run folder under the exact Sprint the user requested
- create exactly one new test cycle for the ticket unless the user asks otherwise
- add all created test cases into that cycle
- set `issueKey` to the Jira task so the cycle is linked back to the ticket

## Coverage Rule

Do not stop at happy path.

First classify the task archetype, then pick explicit techniques. Do not write a flat bag of scenarios without a design rationale.

For each suite, choose:

- `1` primary technique to prove the main business rule
- `1-2` supporting techniques for regression risk
- `1` fail-safe angle when the task touches external data, async updates, or operational dashboards

Typical examples:

- report / dashboard / sort task:
  - `Decision table`
  - `Regression`
  - `Boundary / null-value handling`
  - `State transition` if data can change live
- tool / callback / mapping task:
  - `Integration contract / field mapping`
  - `Decision table`
  - `Retry / idempotency`
  - `Fallback / partial failure`
- workflow / routing task:
  - `State transition`
  - `Decision table`
  - `Permission / role matrix`
  - `Misrouting regression`

Design the suite to cover broadly:

- happy path
- validation
- negative path
- edge case
- fallback and fail-safe behavior
- duplicate or retry behavior
- race or ambiguity risks when applicable
- regression risks based on known bugs

For orchestration or toolchain tasks, explicitly cover:

- state carry-forward
- missing required fields
- wrong mapping
- duplicate events
- cross-context routing mistakes
- empty responses from downstream systems

For UI reporting / dashboard tasks, explicitly cover:

- primary grouping or sort rule
- empty or null values
- refresh stability
- pagination
- realtime or post-refresh movement when source state changes
- row binding so displayed metrics still match the correct entity after reorder

If any important rule is unclear, record it as an open question in the local draft instead of silently guessing.

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
  - `.agent/skills/create-jira-test-cases/.jira.local.json`

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

### End-to-End Default Workflow

1. Read the Jira issue first.
2. Extract the ticket summary and functional scope.
3. Design a QA suite with strong coverage.
   - identify the task archetype first
   - choose explicit techniques
   - write any unresolved assumptions as open questions in the local draft
4. Build the folder path under `Bao QC`.
5. Create the folder in Zephyr Scale.
6. Create the test cases in that folder.
7. Skip duplicate test-case titles already present in the folder.
8. If a previous suite for the same ticket has been superseded:
   - identify the obsolete folder path or obsolete testcase keys first
   - keep the new suite as the source of truth
   - delete the old testcase set so the ticket does not end up with two competing suites
9. If the user asks for Sprint execution setup:
   - build the Sprint test-run folder under `/AI Chatbot/.../Sprint XX/...`
   - create the folder with folder type `TEST_RUN`
   - create one new test cycle with the exact `[AI-XXX]...` naming rule
   - add all created test cases into the cycle
   - set `issueKey` on the cycle to link it back to the Jira ticket
   - after the test cycle has been created and linked, merge labels into the Jira task:
     - always add `AI_Testcases`
     - add `TestCase1` when the task status at that moment is `To do` or `In Progress`
     - add `TestCase2` when the task status at that moment is `Ready To Test`
     - add `TestCase3` when the task status at that moment is `Testing` or `Done`
   - keep existing labels and append the new testcase labels instead of overwriting unrelated ones
10. If the user also wants the suite mirrored into `AI Automation Test` on NocoDB:
   - hand off to `sync-jira-test-cases-to-nocodb`
   - use the created Zephyr test cycle as the source of truth for testcase membership
   - prepare the NocoDB metadata file so all automation fields are explicit
11. Report back:
   - folder path
   - created test keys
   - test-run folder path if created
   - test cycle key and name if created
   - skipped duplicates
   - deleted obsolete testcase keys if cleanup was performed

### Persistent User Preference

Unless the user says otherwise, follow this pattern for future Jira QA tasks:

1. Create test cases under `Bao QC`
2. Use the ticket summary to derive the folder name
3. Create the Sprint test-cycle folder under `AI Chatbot`
4. Create one test cycle for the task
5. Add all task test cases into that cycle
6. Link the cycle back to the Jira issue via `issueKey`
7. If requested, sync the same cases into NocoDB through `sync-jira-test-cases-to-nocodb`
8. Keep Jira `Test Data` ready for step-based NocoDB expansion:
   - one quoted user message per numbered line
   - scenario title stable and descriptive
   - `Expected Result` already formatted as multiline bullets

## Helper Script

Main helper:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-jira-test-cases/scripts/create_jira_test_cases.py \
  issue \
  --issue-key AI-662
```

Create a folder from the Jira issue summary:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-jira-test-cases/scripts/create_jira_test_cases.py \
  ensure-folder \
  --issue-key AI-662 \
  --project-key AI
```

Import a full suite into Jira:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-jira-test-cases/scripts/create_jira_test_cases.py \
  create-suite \
  --issue-key AI-662 \
  --project-key AI \
  --cases-file /abs/path/ai_662_test_cases.json
```

Dry run:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-jira-test-cases/scripts/create_jira_test_cases.py \
  create-suite \
  --issue-key AI-662 \
  --project-key AI \
  --cases-file /abs/path/ai_662_test_cases.json \
  --dry-run
```

The importer now supports true multi-step Zephyr payloads:

- `step`: one Jira step
- `steps`: multiple Jira steps with shared case-level test data / expected result preserved without flattening the whole case into one blob
- `structured_steps`: multiple Jira steps with per-step `description`, `test_data`, and `expected_result`

During dry run, review `validation_warnings` before import. Warnings do not block creation, but they usually indicate weak structure or missing design metadata.

Delete an obsolete suite from a wrong or superseded folder:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-jira-test-cases/scripts/create_jira_test_cases.py \
  delete-suite \
  --folder-path "/Bao QC/707. Sort list agent trong báo cáo tổng quan theo status online-> busy-> offline"
```

Dry run the cleanup first:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-jira-test-cases/scripts/create_jira_test_cases.py \
  delete-suite \
  --folder-path "/Bao QC/707. Sort list agent trong báo cáo tổng quan theo status online-> busy-> offline" \
  --dry-run
```

Create the Sprint test-run folder:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-jira-test-cases/scripts/create_jira_test_cases.py \
  ensure-run-folder \
  --issue-key AI-662 \
  --project-key AI \
  --run-root "/AI Chatbot/Quý 2 - 2026/Sprint 21"
```

Create the test cycle and attach test cases:

```bash
python3 knowledge_base/omniagent/.agent/skills/create-jira-test-cases/scripts/create_jira_test_cases.py \
  create-cycle \
  --issue-key AI-662 \
  --project-key AI \
  --run-root "/AI Chatbot/Quý 2 - 2026/Sprint 21" \
  --case-keys AI-T1853,AI-T1854,AI-T1855
```

## Case File Contract

The helper accepts either:

- a JSON array of test cases
- or a JSON object with `test_cases`

Each case may contain:

- `title`
- `precondition`
- `objective`
- `priority`
- `status`
- `steps`
  - list of strings
- or `step`
  - string
- `test_data`
- `expected_result`

Example:

```json
{
  "test_cases": [
    {
      "title": "Payment success callback route đúng về conversation đã gửi link",
      "precondition": "Có conversation chatbot đã gửi payment link hợp lệ.",
      "objective": "Kiểm tra happy path callback route đúng về hội thoại gốc.",
      "steps": [
        "Mở conversation đã gửi payment link.",
        "Thực hiện thanh toán thành công qua payment link.",
        "Quan sát callback route về chatbot."
      ],
      "test_data": "User message trước đó: \"Em gửi anh link thanh toán nhé.\"",
      "expected_result": "Callback được map đúng về conversation đã gửi link trước đó."
    }
  ]
}
```

## Important Zephyr Findings

- Folder create endpoint:
  - `POST /rest/atm/1.0/folder`
- Folder payload:
  - `projectKey`
  - `name`
  - `type`
- Allowed folder type for test-case folders:
  - `TEST_CASE`
- Allowed folder type for test-cycle folders:
  - `TEST_RUN`
- Folder `name` must be the full path and start with `/`
- Test case create endpoint:
  - `POST /rest/atm/1.0/testcase`
- Test case fetch endpoint:
  - `GET /rest/atm/1.0/testcase/{KEY}`
- Test case update endpoint:
  - `PUT /rest/atm/1.0/testcase/{KEY}`
- Test cycle create endpoint:
  - `POST /rest/atm/1.0/testrun`
- Test cycle fetch endpoint:
  - `GET /rest/atm/1.0/testrun/{KEY}`
- Test cycle search endpoint:
  - `GET /rest/atm/1.0/testrun/search`

When updating test cases, do not send internal `id` fields inside `testScript` or steps.

## Related Skills

- `manage-omniagent-test-cases`
- `sync-jira-test-cases-to-nocodb`
- `create-omniagent-test-cases`
- `manage-omniagent-repo-sync`

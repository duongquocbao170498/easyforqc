---
name: chatwoot-test-uat
description: OmniAgent repo-local UAT Chatwoot test runner. Use this repo copy, not the system-wide `chatwoot-test-local`, when testing OmniAgent UAT flows through the local `POST /webhook/chatwoot` path with repo-managed suites, `~/.skills/config.yml` credentials under `chatwoot-test-uat`, YAML run reports, and an HTML viewer.
---

# Chatwoot Test UAT

## Overview

Use this skill when Codex needs a higher-trust local chatbot test path than `POST /chat/completions`.

This skill:

1. uses a planner to generate a reusable Chatwoot test suite as YAML
2. runs that suite case by case through the local `POST /webhook/chatwoot` ingress
3. polls real public outgoing replies from the linked Chatwoot conversation
4. can also run an adaptive multi-turn loop where Codex CLI reads each live bot reply and chooses the next user turn
5. can build a suite from Jira Zephyr testcase `Test Data` when QA already has formal test cases
6. writes a YAML run report and a sibling HTML viewer

In this repo, the skill lives under `.agent/skills/chatwoot-test-uat/`.

Use this repo-local UAT skill instead of the system-wide skill at `${CODEX_HOME:-$HOME/.codex}/skills/chatwoot-test-local/` when working inside the OmniAgent repo.

## Workflow

1. Confirm the local chatbot server is running on `http://localhost:3000/health`.
2. Configure Chatwoot keys in `~/.skills/config.yml` once per machine, or pass CLI overrides for one-off runs.
3. Start from a goal file or use the bundled example goal in `assets/goals/`.
4. Choose the suite source:
   - free-form goal file: run `scripts/plan_chatwoot_suite.py`
   - Jira Zephyr test cases: run `scripts/build_suite_from_jira_cases.py`
5. Run `scripts/plan_chatwoot_suite.py` for free-form goals.
   It uses planner backend `codex-cli` by default and writes a suite `.yml` under `assets/suites/generated/` unless you override `--output-file`.
6. Review the generated suite YAML before execution when the ask is high-stakes.
7. For replay-style verification, run `scripts/run_chatwoot_suite.py`.
   The runner:
   - uses realistic Chatwoot UI mode by creating a fresh conversation in an `Api inbox` only
   - persists the user message into Chatwoot first so the Chatwoot UI shows both sides of the chat
   - fails fast in realistic mode when no suitable `Api inbox` is available, instead of creating contacts on Telegram/Zalo-style inboxes
   - polls public outgoing Chatwoot replies until each step settles or times out
8. For adaptive multi-turn QA, run `scripts/interactive_chatwoot_loop.py`.
   It:
   - uses the first `steps[].prompt` or `opening_prompt` as the opener
   - reads the real assistant reply from Chatwoot after each turn
   - asks an AI planner to produce the next user turn from the live transcript
   - stops on payment link, hard failure, or max turn budget
9. Review the YAML output and the HTML report under `assets/output/YYYY-MM-DD-<suite-name>/`.
10. If you only need a quick starting point, use the bundled default suite at `assets/suites/default_suite.yml`.

## Team Config

The runner reads Chatwoot credentials from `~/.skills/config.yml` under the `chatwoot-test-uat` section. CLI args still override this file, and Docker probing remains the final fallback for local app settings.

Create the file if it does not exist:

```bash
mkdir -p ~/.skills
$EDITOR ~/.skills/config.yml
```

Template:

```yaml
chatwoot-test-uat:
  CHATWOOT_API_KEY: "<chatwoot-api-key>"
  USER_CHATWOOT_API_KEY: "<user-chatwoot-api-key>"
```

Optional values when the local Docker app cannot provide them:

```yaml
chatwoot-test-uat:
  CHATWOOT_API_KEY: "<chatwoot-api-key>"
  USER_CHATWOOT_API_KEY: "<user-chatwoot-api-key>"
  CHATWOOT_API_BASE: "http://localhost:3000"
  CHATWOOT_ACCOUNT_ID: 1
  WEBHOOK_URL: "http://localhost:3000/webhook/chatwoot"
```

Key meaning:

- `CHATWOOT_API_KEY`: required main Chatwoot API token for creating contacts/conversations, sending messages, and polling replies.
- `USER_CHATWOOT_API_KEY`: optional user/agent token preferred for user-scoped operations such as resetting labels; if omitted, the runner falls back to `CHATWOOT_API_KEY`.

Do not commit real key values into this repo.

## Scripts

Plan a suite:

```bash
python3 .agent/skills/chatwoot-test-uat/scripts/plan_chatwoot_suite.py \
  --goal-file .agent/skills/chatwoot-test-uat/assets/goals/lien-hung-booking-regression.md \
  --planner-reasoning-effort medium
```

Build a suite from Jira Zephyr testcase `Test Data`:

```bash
python3 .agent/skills/chatwoot-test-uat/scripts/build_suite_from_jira_cases.py \
  --test-run-key AI-C298 \
  --mode adaptive \
  --ui-inbox-id 3062 \
  --inbox-id SOURCE_BUSINESS_INBOX_ID \
  --captain-assistant-id 80
```

Use `--mode fixed` when every Jira `Test Data` line should be sent exactly as scripted. Use `--mode adaptive` when Jira `Test Data` is the ordered scenario intent but the next user turn should adapt to the real bot reply.

In realistic Chatwoot UI mode, `--ui-inbox-id` should be the UAT Api inbox used to create visible synthetic conversations. `--inbox-id` can remain the source business inbox used for assistant metadata when that distinction matters.

Run a suite:

```bash
python3 .agent/skills/chatwoot-test-uat/scripts/run_chatwoot_suite.py \
  --suite-file .agent/skills/chatwoot-test-uat/assets/suites/default_suite.yml \
  --inbox-id 11 \
  --chat-ui-mode realistic \
  --captain-assistant-id 80
```

Adaptive multi-turn mode with Codex CLI:

```bash
python3 .agent/skills/chatwoot-test-uat/scripts/interactive_chatwoot_loop.py \
  --suite-file .agent/skills/chatwoot-test-uat/assets/suites/default_suite.yml \
  --max-user-turns 15 \
  --chat-ui-mode realistic \
  --planner-backend codex-cli \
  --planner-model gpt-5.4-mini \
  --planner-guidance-file .agent/skills/chatwoot-test-uat/references/codex-planner-v2-guidance.md
```

Adaptive multi-turn mode with an OpenAI-compatible planner:

```bash
CHATWOOT_PLANNER_OPENAI_BASE_URL="https://api.openai.com/v1" \
CHATWOOT_PLANNER_OPENAI_API_KEY="<api-key>" \
CHATWOOT_PLANNER_OPENAI_MODEL="gpt-5.4-mini" \
python3 .agent/skills/chatwoot-test-uat/scripts/interactive_chatwoot_loop.py \
  --suite-file .agent/skills/chatwoot-test-uat/assets/suites/default_suite.yml \
  --max-user-turns 15 \
  --chat-ui-mode realistic \
  --planner-backend openai-compatible \
  --planner-guidance-file .agent/skills/chatwoot-test-uat/references/codex-planner-v2-guidance.md
```

Render HTML again from a raw run file:

```bash
python3 .agent/skills/chatwoot-test-uat/scripts/render_chatwoot_report_html.py \
  --raw-file "/absolute/path/to/run-raw.json"
```

Render Langfuse tool-call drill-down HTML from a raw run file:

```bash
python3 .agent/skills/chatwoot-test-uat/scripts/render_langfuse_tool_calls_html.py \
  --raw-file "/absolute/path/to/run-raw.json"
```

## Planner Notes

- Planner backend defaults to `codex-cli`.
- The planner writes a suite YAML before any live execution happens.
- `scripts/build_suite_from_jira_cases.py` is the deterministic bridge for formal Jira/Zephyr regressions: it reads the first non-empty Jira step `Test Data`, splits numbered quoted user-message lines, and writes the same Chatwoot suite YAML format used by the runners.
- Planner now exposes `--planner-reasoning-effort`; use `medium` by default for faster suite generation.
- Planner outputs are stored inside the skill by default at `assets/suites/generated/YYYY-MM-DD-<goal-stem>/`.
- Use `--planner-guidance-file` to override the bundled guidance text.
- Use `--planner-model` to switch Codex models.
- Planner schema now allows optional `opening_prompt` and `metadata` on each case so adaptive runtime planning can use richer case context.

## Runner Notes

- Default webhook URL: `http://localhost:3000/webhook/chatwoot`
- Default chat UI mode is `realistic`.
- Always prefer the Chatwoot-visible test path: persist each synthetic user turn as a real public incoming Chatwoot message first, so the Chatwoot UI shows both user and assistant messages. For an existing/pinned conversation, reuse that conversation and call the same persist-incoming path before processing the bot turn.
- Do not switch a test to `webhook-only`, direct webhook replay, or any mode where user turns are invisible in Chatwoot unless the user explicitly confirms that change for the current run.
- When rerunning a suite against an existing Chatwoot conversation, reset the conversation labels to exactly `ai` before the first test message unless the user explicitly asks for additional labels. This clears stale labels such as `handoff` from prior runs.
- Default per-turn reply timeout is `300` seconds, and the runner clamps any lower suite value back up to `300` so each turn is monitored for at least 5 minutes unless the case reaches a terminal state earlier.
- In realistic mode, the runner requires an `Api inbox` for the visible Chatwoot conversation so incoming user messages appear in the UI and bot replies are not marked as failed by external channels like Telegram.
- For freshly created conversations, the runner now updates the Chatwoot conversation itself to carry the planned labels such as `ai` and assigns the conversation to the requested assignee such as `Bot` before sending the opener.
- Use `--ui-inbox-id` when you want to pin a specific `Api inbox` for the visible test conversation.
- In realistic mode, `defaults.inbox_id` can still point at the source business inbox for metadata, but the actual Chatwoot contact/conversation creation path will use an `Api inbox` only.
- In realistic mode, the Chatwoot transport contact is created without reusing suite `contact.phone` or `contact.email`, avoiding E.164 validation failures and `email already taken` collisions across reruns.
- The runner resolves config in this order: CLI args, `~/.skills/config.yml`, then Docker `server` probing.
- If host config does not expose Chatwoot settings, the runner automatically probes the running Docker `server` container to load:
  - `CHATWOOT_API_BASE`
  - `CHATWOOT_API_KEY`
  - `USER_CHATWOOT_API_KEY`
  - default `account_id`
- If the planned suite leaves `defaults.inbox_id` or `defaults.captain_assistant_id` as `null`, inject them at run time with `--inbox-id` and `--captain-assistant-id`.
- A case succeeds only when its step expectations pass. The runner does not blindly continue on mismatched replies.
- Each run writes:
  - `<timestamp>-<suite>.yml`
  - `<timestamp>-<suite>-raw.json`
  - `<timestamp>-<suite>.html`
  - each turn now preserves `langfuse_trace_id` and derived `view_log_url` in report output when Chatwoot messages include trace metadata
- `contains_any` matching is now normalized and case-insensitive, so common aliases like `BĐ` and `Bưu điện` do not fail as exact-string mismatches anymore.
- For Chatwoot environments with broken local CA chains, set `CHATWOOT_TEST_INSECURE_SSL=1` to skip HTTPS certificate verification for Chatwoot API polling only.
- Realistic mode injects `captain_assistant_id` into the persisted incoming message metadata and lets the local app process that Chatwoot-visible message path before falling back to direct webhook replay.
- While waiting for a turn reply, the runner now emits periodic polling updates and keeps refreshing the partial report output.
- If the conversation enters label `handoff` while a turn is still waiting, the runner records `completed_reason=handoff_detected`, preserves any assistant replies already observed for that turn, stops that case immediately, and moves on to the next case.
- Generated reports now track `handoff` as a separate terminal status, distinct from both `success` and `failure`.
- The HTML viewer now includes client-side filters for `success`, `failure`, and `handoff`, plus per-case full turn transcripts showing each user message and bot reply.

## Adaptive Loop Notes

- Default planner backend is `codex-cli`, mirroring `chat-completion-local`.
- Adaptive mode prefers live multi-turn decisions over fixed scripted `steps`.
- `openai-compatible` uses the configured model/API key to read each bot reply and choose the next user message, which is the default path when this skill is launched from EasyForQC.
- Heuristic planning is only for explicit fallback/debug runs. AI planner failures now stop the case with `failure:planner_ai_failed` instead of silently sending a rule-based follow-up.
- If a case defines `opening_prompt`, adaptive mode uses it first; otherwise it uses the first scripted step prompt as the opener.
- Adaptive mode still reuses the same suite YAML and output/report structure.
- For suites generated from Jira `Test Data`, adaptive mode treats `metadata.planned_user_turns` as ordered user intents, not exact lines that must be replayed. The planner must read the bot reply, choose options that are actually available, and still preserve the scenario intent such as changing trip time, changing seat, confirming passenger details, or asking for payment link.
- For Tiến Oanh route-span booking QA, use `references/route-span-trace-guidance.md` with `interactive_chatwoot_loop.py` so the synthetic user chooses the next option from the real bot reply. This guidance covers morning-to-evening changes, unavailable-seat fallback, user-driven seat changes, pickup/dropoff selection from bot suggestions, passenger/contact confirmation, and the final payment-link follow-up.
- Route-span adaptive cases should not stop when the bot only returns a ticket code or says the booking is created. They should ask `Gửi mình link thanh toán booking này luôn nhé.` and stop only after a payment URL is returned.
- A ready route-span adaptive suite is stored at `assets/suites/generated/2026-05-07-route-span-trace-adaptive/suite.yml`.

## References

- `references/planner-guidance.md` - guidance for suite generation
- `references/codex-planner-v2-guidance.md` - guidance for adaptive Codex CLI runtime planning
- `references/route-span-trace-guidance.md` - trace-grounded guidance for Tiến Oanh route-span adaptive booking tests
- `references/suite-format.md` - suite YAML shape
- `references/api-format.md` - Chatwoot webhook and polling assumptions

## Files

- `scripts/plan_chatwoot_suite.py` - planner-first suite generator
- `scripts/build_suite_from_jira_cases.py` - deterministic Jira Zephyr `Test Data` to Chatwoot suite YAML bridge
- `scripts/run_chatwoot_suite.py` - case-by-case Chatwoot webhook runner
- `scripts/interactive_chatwoot_loop.py` - adaptive multi-turn Chatwoot runner with Codex CLI planner
- `scripts/render_chatwoot_report_html.py` - HTML viewer generator
- `scripts/render_langfuse_tool_calls_html.py` - HTML drill-down viewer for conversation -> turn -> tool call -> input/output
- `scripts/chatwoot_runner_core.py` - shared runtime helpers
- `scripts/path_config.py` - skill-local path helpers
- `assets/goals/lien-hung-booking-regression.md` - example planning goal
- `assets/suites/default_suite.yml` - ready-to-run starter suite
- `assets/suites/generated/` - planner-generated suites kept inside the skill for later aggregation
- `assets/suites/generated/2026-05-07-route-span-trace-adaptive/suite.yml` - ready-to-run Tiến Oanh route-span adaptive suite
- `assets/output/` - generated YAML, raw JSON, and HTML reports

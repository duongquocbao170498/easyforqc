# Task Archetype Matrix

Map the Jira task to the closest archetype, then choose techniques and coverage dimensions from the same row.

## UI Reporting / Dashboard / Default Sort

- Primary techniques:
  - `Decision table`
  - `Regression`
- Supporting techniques:
  - `Boundary value analysis`
  - `State transition`
- Must-cover dimensions:
  - grouping / ordering rule
  - empty or null values
  - refresh and reload stability
  - pagination
  - row binding / displayed data integrity
  - realtime updates if applicable

## Tool / API / Mapping / Callback

- Primary techniques:
  - `Integration contract / field mapping`
  - `Decision table`
- Supporting techniques:
  - `Retry / idempotency / duplicate event`
  - `Fallback / partial failure / recovery`
- Must-cover dimensions:
  - required fields
  - wrong mapping
  - duplicate event
  - state carry-forward
  - empty downstream response
  - race or ordering issues

## Workflow / Routing / Assignment

- Primary techniques:
  - `State transition`
  - `Decision table`
- Supporting techniques:
  - `Permission / role matrix`
  - `Risk-based regression`
- Must-cover dimensions:
  - state carry-forward
  - branching decisions
  - misrouting
  - retries / duplicate actions
  - fallback when data is incomplete

## Chatbot / Tool-Orchestrated Conversation

- Primary techniques:
  - `Use-case / scenario flow`
  - `Integration contract / field mapping`
- Supporting techniques:
  - `State transition`
  - `Fallback / partial failure / recovery`
- Must-cover dimensions:
  - multi-turn context carry-forward
  - correct tool choice
  - missing required info
  - ambiguous user input
  - handoff boundary
  - regression vs known bad cases

## Bug Fix

- Primary techniques:
  - `Error guessing / bug-history based`
  - `Regression`
- Supporting techniques:
  - reuse the original failure shape
  - add one nearby negative variant
- Must-cover dimensions:
  - original failure reproduction
  - corrected behavior
  - non-target nearby behavior
  - retry / duplicate if historically relevant

## Design Gate

Before finalizing Jira test cases or XMind branches, verify that the chosen suite answers:

1. What is the primary business rule being proven?
2. What data shape or state transition is most likely to break?
3. What nearby surface would regress even if the primary path passes?
4. What assumption is still unclear and should be marked as an open question instead of silently guessed?

# Test Design Techniques

Use these techniques deliberately. Do not list them mechanically; pick the smallest set that exposes the real risk of the task.

## Core Techniques

- `Use-case / scenario flow`
  - Use when the feature is primarily a user journey, business flow, or end-to-end operational path.
- `Decision table`
  - Use when output depends on combinations of inputs, flags, statuses, or business rules.
- `Equivalence partitioning`
  - Use to split large input spaces into representative valid and invalid groups.
- `Boundary value analysis`
  - Use when thresholds, counts, limits, page sizes, date cutoffs, or min/max values matter.
- `State transition`
  - Use when the same entity can move through statuses or stages and behavior depends on current state.
- `Pairwise / combinatorial`
  - Use when there are many independent dimensions and exhaustive coverage is too expensive.
- `Risk-based regression`
  - Use to cover neighboring surfaces likely to break from the change, not the whole product.
- `Error guessing / bug-history based`
  - Use when there are known fragile areas, previous regressions, or operational failure patterns.

## OmniAgent / Operations-Oriented Techniques

- `Integration contract / field mapping`
  - Use for payload mapping, callback routing, tool inputs/outputs, and UI-to-backend binding.
- `Retry / idempotency / duplicate event`
  - Use for callback, payment, webhook, and async workflows where the same event may arrive more than once.
- `Fallback / partial failure / recovery`
  - Use when downstream data can be empty, delayed, malformed, or unavailable.
- `Permission / role matrix`
  - Use when behavior depends on actor, team, inbox, or access level.
- `Realtime / refresh / pagination stability`
  - Use for dashboards, tables, counts, live updates, and list ordering.

## Selection Rule

For each task, choose:

1. `1` primary technique that proves the main business rule
2. `1-2` supporting techniques for the most likely regressions
3. `1` fail-safe technique if the task touches external data, async behavior, or operational dashboards

## Design Metadata

When drafting reusable local JSON before import, prefer these optional fields:

- `technique`
- `risk`
- `requirement_ref`
- `coverage_tags`
- `scenario_type`
- `structured_steps`

These fields improve reasoning and review even if the current importer ignores some of them for Jira payload construction.

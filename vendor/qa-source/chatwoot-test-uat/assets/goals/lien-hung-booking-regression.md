# Goal

Plan a local Chatwoot near-E2E regression suite for Liên Hưng booking flows on UAT.

## Scope

- operator: Liên Hưng
- company_id: 808
- environment: UAT-style local backend
- transport under test: local `/webhook/chatwoot` plus real Chatwoot outbound polling

## Priority flows

1. Booking from Nha Trang to Trà Vinh with pickup at Agribank CN Cam Lâm
2. Booking with VVIP seat request
3. Booking flow that must capture passenger name and phone before completion

## Expectations

- planner should create a reusable suite YAML with multiple cases
- suite should include exact step expectations, not just vague goals
- final success criteria should prefer ticket code or booking code evidence
- suite should be safe to run repeatedly on fresh Chatwoot conversations

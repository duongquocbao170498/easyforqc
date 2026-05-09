# Goal

Plan a local Chatwoot near-E2E regression suite based on the traced Liên Hưng booking conversation that produced ticket code `M0KV6F`.

## Scope

- operator: Liên Hưng
- company_id: 808
- environment: UAT-style local backend through `/webhook/chatwoot`
- source Chatwoot conversation: `https://uat-omniagent.vexere.net/app/accounts/3/conversations/27806`
- trace anchor: booking flow reconstructed from `23/04/2026` local-time conversation, where `ngày mai` resolved to `24/04/2026`

## Grounded Trace Facts

- route: `Nha Trang -> Trà Vinh`
- Chatwoot routing config for this traced conversation:
  - `account_id=3`
  - `inbox_id=3049`
  - `captain_assistant_id=80`
- departure date in the traced flow: `24/04/2026`
- matching trip:
  - `base_trip_id=12419`
  - `trip_id=10726922`
  - departure time `17:00`
- traced valid stop on this trip: `Bưu điện Cam Lâm`
- traced concrete pickup point selected by the user: `Agribank CN Cam Lâm`
- traced destination endpoint: `Bến xe Duyên Hải`
- traced seat ask: `1 vé VVIP`
- traced fare signal: `401000`
- traced created booking signals:
  - `booking_code=1Z7E5B2`
  - `ticket_code=M0KV6F`

## Suite Design Requirements

- create a reusable suite with `3` or `4` cases
- every case must begin with trip discovery, not with a one-shot booking request
- every case must cover a path from:
  - ask for available trip
  - narrow to the traced route and date
  - handle pickup or stop-point choice
  - complete booking
  - request payment link
- every case must end on a concrete payment success signal:
  - payment link URL preferred
  - booking code or ticket code may appear before that, but final user intent should continue to payment
- use realistic Vietnamese prompts only
- avoid collapsing the whole flow into one or two prompts
- prefer `5` to `8` steps per case

## Required Coverage

1. Exact golden path based on the traced conversation

- ask: `đi Nha Trang đi Trà Vinh ngày mai có chuyến nào ko em`
- confirm the correct trip
- ask whether `Bưu điện Cam Lâm` is a valid stop
- ask for the list of pickup points at `BĐ Cam Lâm`
- choose `Agribank CN Cam Lâm`
- ask for `1 vé VVIP`
- provide passenger name and phone
- ask for the payment link

2. Basic booking path with fewer clarification turns

- still start from trip discovery
- then move to pickup choice and booking
- end by explicitly asking for a payment link

3. Contact-capture path

- start from trip discovery
- do not provide passenger contact immediately
- expect the bot to request name and phone before completion
- once contact is provided, continue until payment link is returned

## Step Expectation Rules

- step expectations should be concrete but not brittle
- use `contains_any` to validate route, pickup, VVIP, contact-capture, or payment wording
- use `regex_any` to validate:
  - booking code or ticket code
  - payment link URL
- for final steps, prefer expecting a payment link URL
- if a case asks for passenger contact, the final contact prompt must match the case contact exactly

## Notes

- this suite is intentionally grounded in the traced business flow, not a generic booking scenario
- it is acceptable if the suite uses explicit date `24/04/2026` instead of relative dates, because the goal is trace-faithful regression coverage

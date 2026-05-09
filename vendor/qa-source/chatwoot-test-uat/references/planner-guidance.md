# Planner Guidance

Generate a reusable Chatwoot local test suite.

Rules:

- output must conform to the schema given by the planner script
- create focused, executable cases
- each case should be safe to run repeatedly on a fresh Chatwoot conversation
- each step must include a realistic user prompt
- include `contains_any` and `regex_any` only when they materially help validate success
- do not create filler cases
- prefer 3 to 8 cases unless the goal explicitly asks for more
- final success criteria should look for ticket code, booking code, payment link, or another concrete business signal
- for booking flows, make the last user turn provide the passenger contact if the bot is expected to need it

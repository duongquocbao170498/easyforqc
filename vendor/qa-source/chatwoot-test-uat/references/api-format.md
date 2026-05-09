# API Format

Ingress under test:

- local chatbot webhook: `POST http://localhost:3000/webhook/chatwoot`

Webhook payload assumptions:

- `message_type` must be `incoming`
- `conversation.id`, `conversation.labels`, `conversation.meta.assignee.name`, `conversation.contact_inbox.contact_id`, `inbox.id`, and `account.id` should be present
- `captain_assistant_id` is optional but recommended for deterministic routing

Chatwoot APIs used by the runner:

- create contact
- create conversation
- list conversation messages

Reply polling behavior:

- only public outgoing messages count as bot replies
- private notes and incoming customer messages are ignored
- once the first new reply appears, the runner waits for a short quiet period before closing the step

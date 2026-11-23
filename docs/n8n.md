# n8n hooks

The API works on its own. n8n (self-hosted, EU) is optional and adds moderation
and ops alerts. Nothing leaves your own servers.

## Incoming: new reports

Set `N8N_WEBHOOK_URL` and `N8N_WEBHOOK_SECRET`. Every new report is POSTed:

```json
{
  "event": "report.created",
  "report": {
    "id": "uuid", "type": "situation", "category": "inbraakpoging",
    "severity": 80, "lat": 52.3612, "lon": 4.9271,
    "created_at": "...", "expires_at": "...",
    "note": "only moderation sees this", "status": "approved", "confidence": 0.5
  }
}
```

Header: `Authorization: Bearer <N8N_WEBHOOK_SECRET>`. Check it in the Webhook node.
The reporter id is never sent. Coordinates are already fuzzed.

## Outgoing: moderation API

All calls need `Authorization: Bearer <ADMIN_TOKEN>`.

| Call | Use |
| --- | --- |
| `GET /api/admin/reports?status=pending` | Reports waiting for review (3 flags, or reporter with removed reports) |
| `POST /api/admin/reports/:id` `{ "status": "approved" \| "removed", "confidence": 0.8 }` | Decide. Approving a pending report sends the pushes. |

## Suggested workflows

1. **Abuse scoring**: Webhook, then a Code node that checks the note for names,
   descriptions of people or slurs. Remove with the admin call. Golden rule 2: no
   person-labeling.
2. **Review queue**: Schedule every 10 minutes, `GET pending`, send each to the
   ops Telegram chat with approve and remove buttons.
3. **Ops alert**: Webhook, IF severity >= 67, Telegram message to ops.

Web Push is sent by the API itself (VAPID keys in its env), so n8n does not need them.

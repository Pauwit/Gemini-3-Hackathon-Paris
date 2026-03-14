# Gmail Search Skills

## Commands
- `gws gmail search --query "<query>" --limit <n>` — search emails
- `gws gmail get --id <messageId>` — get full email

## Query Format
Gmail search operators: from:, to:, subject:, after:, before:, label:

## Output
{ "messages": [{ "id": string, "subject": string, "from": string, "date": string, "snippet": string, "body": string }] }

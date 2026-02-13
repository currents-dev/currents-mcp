# Slack Notification for n8n-trigger Channel

## Status: ⚠️ Credentials Required

The Slack notification could not be sent automatically because the n8n webhook URL or Slack API credentials are not configured as environment variables or secrets.

## Required Configuration

Add one of the following to Cursor Dashboard (Cloud Agents > Secrets):
- `N8N_WEBHOOK_URL` - n8n webhook endpoint
- `SLACK_WEBHOOK_URL` - Slack incoming webhook URL
- `SLACK_BOT_TOKEN` - Slack bot token with chat:write permissions

## Notification Content

**Channel**: `n8n-trigger`

**Message**:
```
🎉 Currents MCP API Parity Complete

✅ PR Created: https://github.com/currents-dev/currents-mcp/pull/58
🔗 Branch: cursor/currents-mcp-parity-7x4m9k

📊 Summary:
• 27/27 API endpoints verified (100% coverage)
• All parameters and request bodies match OpenAPI spec
• Tests passing: 35/35
• Build successful

📄 Full verification report: PARITY_VERIFICATION.md
```

## Alternative: Manual Notification

If you have access to the Slack workspace, you can manually post this message to the #n8n-trigger channel.

## Webhook Example (if credentials were available)

```bash
curl -X POST $N8N_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "pr_url": "https://github.com/currents-dev/currents-mcp/pull/58",
    "branch": "cursor/currents-mcp-parity-7x4m9k",
    "coverage": "100%",
    "endpoints": 27,
    "tests_passed": 35,
    "conversation_url": "N/A - running in Cloud Agent"
  }'
```

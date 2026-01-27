# Currents MCP Server

![Unit Tests](https://github.com/currents-dev/currents-mcp/actions/workflows/test.yml/badge.svg)

This is a MCP server that allows you to provide test results context to your AI agents by connecting them to Currents. Useful for asking AI to fix or optimize tests failing in CI.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=currents&config=eyJjb21tYW5kIjoibnB4IC15IEBjdXJyZW50cy9tY3AiLCJlbnYiOnsiQ1VSUkVOVFNfQVBJX0tFWSI6InlvdXItYXBpLWtleSJ9fQ%3D%3D)

## Tools

| Tool                                  | Description                                                                |
| ------------------------------------- | -------------------------------------------------------------------------- |
| `currents-get-projects`               | Retrieves a list of all projects available.                                |
| `currents-get-runs`                   | Retrieves a list the latest runs for a specific project.                   |
| `currents-get-run-details`            | Retrieves details of a specific test run.                                  |
| `currents-get-spec-instances`         | Retrieves debugging data a specific execution of a test spec file.         |
| `currents-get-spec-files-performance` | Retrieves spec file historical performance metrics for a specific project. |
| `currents-get-tests-performance`      | Retrieves test historical performance metrics for a specific project.      |
| `currents-get-tests-signatures`       | Retrieves a test signature by its spec file name and test name.            |
| `currents-get-test-results`           | Retrieves debugging data from test results of a test by its signature.     |
| `currents-list-webhooks`              | List all webhooks configured for a project.                                |
| `currents-create-webhook`             | Create a new webhook to receive notifications on run events.               |
| `currents-get-webhook`                | Get details of a specific webhook by ID.                                   |
| `currents-update-webhook`             | Update an existing webhook's URL, headers, events, or label.               |
| `currents-delete-webhook`             | Delete a webhook.                                                          |

## Setup

### API Key

Get a Currents API key by following the [instructions here](https://docs.currents.dev/resources/api/api-keys).

### Usage with Cursor

1. Go to Cursor Settings > MCP > Enable
2. Add the following to your `mcp.json`.

```json
{
  "mcpServers": {
    "currents": {
      "command": "npx",
      "args": ["-y", "@currents/mcp"],
      "env": {
        "CURRENTS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude

Run this command to add Currents MCP to Claude Code

```bash
claude mcp add --transport stdio currents --env CURRENTS_API_KEY=<KEY> -- npx -y @currents/mcp
```

Add the following to enable Currents MCP on Claude Desktop (edit `claude_desktop_config.json` file):

```json
{
  "mcpServers": {
    "currents": {
      "command": "npx",
      "args": ["-y", "@currents/mcp"],
      "env": {
        "CURRENTS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### ⚠️ Notice

By connecting AI tools (e.g., via MCP) to Currents, you are granting them access to your API key, test results and CI metadata. It is your responsibility to vet any AI agents or services you use, and to ensure they handle your data securely.

## References

- [Currents](https://currents.dev)
- [Currents Documentation](https://docs.currents.dev)
- [Contribution Guide](https://github.com/currents-dev/currents-mcp/blob/main/CONTRIBUTE.md)
- [Releasing and Publishing](https://github.com/currents-dev/currents-mcp/blob/main/RELEASE.md)
- [License](https://github.com/currents-dev/currents-mcp/blob/main/LICENSE.md)

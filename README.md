# Currents MCP Server

![Unit Tests](https://github.com/currents-dev/currents-mcp/actions/workflows/test.yml/badge.svg)

This is a MCP server that allows you to provide test results context to your AI agents by connecting them to Currents. Useful for asking AI to fix or optimize tests failing in CI.

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=currents&config=eyJjb21tYW5kIjoibnB4IC15IEBjdXJyZW50cy9tY3AiLCJlbnYiOnsiQ1VSUkVOVFNfQVBJX0tFWSI6InlvdXItYXBpLWtleSJ9fQ%3D%3D)

## Tools

| Tool                                  | Description                                                                                                                              |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `currents-get-projects`               | Retrieves projects available in the Currents platform.                                                                                   |
| `currents-get-project`                | Get a single project by ID.                                                                                                              |
| `currents-get-project-insights`       | Get aggregated run and test metrics for a project within a date range.                                                                   |
| `currents-get-runs`                   | Retrieves a list of runs for a specific project with optional filtering.                                                                 |
| `currents-get-run-details`            | Retrieves details of a specific test run.                                                                                                |
| `currents-find-run`                   | Find a run by query parameters.                                                                                                          |
| `currents-cancel-run`                 | Cancel a run in progress.                                                                                                                |
| `currents-reset-run`                  | Reset failed spec files in a run to allow re-execution.                                                                                  |
| `currents-delete-run`                 | Delete a run and all associated data.                                                                                                    |
| `currents-cancel-run-github-ci`       | Cancel a run by GitHub Actions workflow run ID and attempt number.                                                                       |
| `currents-get-spec-instance`          | Retrieves debugging data from a specific execution of a test spec file by instanceId.                                                    |
| `currents-get-spec-files-performance` | Retrieves spec files performance metrics for a specific project within a date range.                                                     |
| `currents-get-tests-performance`      | Retrieves aggregated test metrics for a specific project within a date range.                                                            |
| `currents-get-tests-signatures`       | Generates a unique test signature based on project, spec file path, and test title.                                                      |
| `currents-get-test-results`           | Retrieves historical test execution results for a specific test signature.                                                               |
| `currents-list-actions`               | List all actions for a project with optional filtering.                                                                                  |
| `currents-create-action`              | Create a new action for a project.                                                                                                       |
| `currents-get-action`                 | Get a single action by ID.                                                                                                               |
| `currents-update-action`              | Update an existing action.                                                                                                               |
| `currents-delete-action`              | Delete (archive) an action.                                                                                                              |
| `currents-enable-action`              | Enable a disabled action.                                                                                                                |
| `currents-disable-action`             | Disable an active action.                                                                                                                |
| `currents-list-webhooks`              | List all webhooks for a project.                                                                                                         |
| `currents-create-webhook`             | Create a new webhook for a project.                                                                                                      |
| `currents-get-webhook`                | Get a single webhook by ID.                                                                                                              |
| `currents-update-webhook`             | Update an existing webhook.                                                                                                              |
| `currents-delete-webhook`             | Delete a webhook.                                                                                                                        |

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

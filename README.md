# Currents MCP Server

![Unit Tests](https://github.com/currents-dev/currents-mcp/actions/workflows/test.yml/badge.svg)

Give your AI coding agents full visibility into your CI test results. The Currents MCP Server connects tools like Cursor and Claude directly to your [Currents](https://currents.dev) dashboard, so agents can diagnose flaky tests, pinpoint failures, and act on real execution data -- without leaving your editor.

- Query runs, spec files, and individual test results from CI
- Surface error trends and performance metrics across your test suite
- Manage quarantine rules, webhooks, and project settings programmatically
- Let agents fix what's broken using actual test output, not guesswork

[![Install MCP Server](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=currents&config=eyJjb21tYW5kIjoibnB4IC15IEBjdXJyZW50cy9tY3AiLCJlbnYiOnsiQ1VSUkVOVFNfQVBJX0tFWSI6InlvdXItYXBpLWtleSJ9fQ%3D%3D)

## Tools

| Tool                                    | Description                                                                               |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `currents-list-actions`                 | List all actions for a project with optional filtering.                                   |
| `currents-create-action`                | Create a new action for a project.                                                        |
| `currents-get-action`                   | Get a single action by ID.                                                                |
| `currents-update-action`                | Update an existing action.                                                                |
| `currents-delete-action`                | Delete (archive) an action.                                                               |
| `currents-enable-action`                | Enable a disabled action.                                                                 |
| `currents-disable-action`               | Disable an active action.                                                                 |
| `currents-list-affected-tests`          | List tests affected by actions (quarantine, skip, tag) for a project within a date range. |
| `currents-get-affected-test-executions` | Get execution details for a specific affected test (by signature) within a date range.    |
| `currents-get-affected-executions`      | List test executions where a specific action/rule was applied, within a date range.       |
| `currents-get-projects`                 | Retrieves projects available in the Currents platform.                                    |
| `currents-get-project`                  | Get a single project by ID.                                                               |
| `currents-get-project-insights`         | Get aggregated run and test metrics for a project within a date range.                    |
| `currents-list-pull-requests`           | List pull-request cards for a project (runs grouped by meta.pr.id).                       |
| `currents-list-project-terms`           | List cursor-paginated project terms for one type (tag, branch, authorName, etc.).         |
| `currents-create-jira-issue`            | Create a Jira issue from a run test using the organization Jira integration.              |
| `currents-link-jira-issue`              | Link an existing Jira issue to a run test using the organization Jira integration.        |
| `currents-list-jira-projects`           | List Jira projects available for the organization integration.                            |
| `currents-list-jira-issue-types`        | List Jira issue types and custom fields for a Jira project.                               |
| `currents-get-runs`                     | Retrieves a list of runs for a specific project with optional filtering.                  |
| `currents-get-run-details`              | Retrieves details of a specific test run.                                                 |
| `currents-find-run`                     | Find a run by query parameters.                                                           |
| `currents-cancel-run`                   | Cancel a run in progress.                                                                 |
| `currents-reset-run`                    | Reset failed spec files in a run to allow re-execution.                                   |
| `currents-delete-run`                   | Delete a run and all associated data.                                                     |
| `currents-cancel-run-github-ci`         | Cancel a run by GitHub Actions workflow run ID and attempt number.                        |
| `currents-get-spec-instance`            | Retrieves debugging data from a specific execution of a test spec file by instanceId.     |
| `currents-get-spec-files-performance`   | Retrieves spec files performance metrics for a specific project within a date range.      |
| `currents-get-tests-performance`        | Retrieves aggregated test metrics for a specific project within a date range.             |
| `currents-get-tests-signatures`         | Generates a unique test signature based on project, spec file path, and test title.       |
| `currents-get-test-results`             | Retrieves historical test execution results for a specific test signature.                |
| `currents-get-context`                  | Get test failure context for AI debugging at run, instance, or test level.                |
| `currents-get-errors-explorer`          | Get aggregated error metrics for a project within a date range.                           |
| `currents-list-webhooks`                | List all webhooks for a project.                                                          |
| `currents-create-webhook`               | Create a new webhook for a project.                                                       |
| `currents-get-webhook`                  | Get a single webhook by ID.                                                               |
| `currents-update-webhook`               | Update an existing webhook.                                                               |
| `currents-delete-webhook`               | Delete a webhook.                                                                         |

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

### Remote (hosted) MCP endpoint

In addition to the local stdio transport above, the same server can run as a hosted
Streamable HTTP endpoint (e.g. `https://mcp.currents.dev/mcp`) for use with remote
connectors such as the Claude web/mobile apps.

The hosted server performs **no authentication of its own**. Each request must carry
your Currents API key as a Bearer token, which is passed through to the Currents API:

```
Authorization: Bearer <your-currents-api-key>
```

Example client config (remote connector):

```json
{
  "mcpServers": {
    "currents": {
      "url": "https://mcp.currents.dev/mcp",
      "headers": {
        "Authorization": "Bearer your-api-key"
      }
    }
  }
}
```

Running the HTTP server yourself:

```bash
# from the mcp-server package
npm run build && PORT=3000 npm run start:http
# or via Docker (serves /mcp, exposes the configured PORT)
docker build -t currents-mcp . && docker run -p 3000:3000 currents-mcp
```

The Node server speaks plain HTTP; TLS and the public domain terminate at the
reverse proxy / load balancer in front of the container. A `GET /healthz` endpoint
is provided for liveness checks.

### ⚠️ Notice

By connecting AI tools (e.g., via MCP) to Currents, you are granting them access to your API key, test results and CI metadata. It is your responsibility to vet any AI agents or services you use, and to ensure they handle your data securely.

## References

- [Currents](https://currents.dev)
- [Currents Documentation](https://docs.currents.dev)
- [Contribution Guide](https://github.com/currents-dev/currents-mcp/blob/main/CONTRIBUTE.md)
- [Releasing and Publishing](https://github.com/currents-dev/currents-mcp/blob/main/RELEASE.md)
- [License](https://github.com/currents-dev/currents-mcp/blob/main/LICENSE.md)

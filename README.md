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

## Setup

### API Key

Get a Currents API key by following the [instructions here](https://docs.currents.dev/resources/api/api-keys).

### Usage with Cursor Editor

1. Go to Cursor Settings > MCP > Enable
2. Add the following to your `mcp.json`.

### NPX

```
{
  "mcpServers": {
    "currents": {
      "command": "npx",
      "args": [
        "-y",
        "@currents/mcp"
      ],
      "env": {
        "CURRENTS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Usage with Claude Desktop

Add the following to your `claude_desktop_config.json`:

#### NPX

```
{
  "mcpServers": {
    "currents": {
      "command": "npx",
      "args": [
        "-y",
        "@currents/mcp"
      ],
      "env": {
        "CURRENTS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### ⚠️ Notice

By connecting AI tools (e.g., via MCP) to Currents, you are granting them access to your API key, test results and CI metadata. It is your responsibility to vet any AI agents or services you use, and to ensure they handle your data securely.

## How to Contribute

We welcome contributions of all kinds—bug fixes, features, and documentation updates!

### Quick Start

1. Fork this repository and clone your fork:
   ```bash
   git clone https://github.com/<your-username>/currents-mcp.git
   cd currents-mcp
   ```
2. Install dependencies:
   ```bash
   cd mcp-server
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```
4. Run tests:
   ```bash
   npm test
   ```
   See [TESTING.md](./mcp-server/TESTING.md) for more details on testing.
5. Run locally (stdio):
   ```bash
   npm start
   ```
   You should see: `Currents MCP Server running on stdio`.

### Local Development with a Client (optional)

To test with a local MCP client (e.g., Cursor or Claude Desktop), point the client to your built server:

- Command: `node`
- Args: `./mcp-server/build/index.js`
- Env: set `CURRENTS_API_KEY` to a valid key

Example snippet for a client config:

```json
{
  "mcpServers": {
    "currents": {
      "command": "node",
      "args": ["./mcp-server/build/index.js"],
      "env": {
        "CURRENTS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Test tools locally

To test the tools locally without any LLM, you can use the following command:

```bash
 npm run build
```

then run the tools script:

```bash
 node scripts/call-tools.js
```

### Making Changes

- Create a feature branch:
  ```bash
  git checkout -b feat/short-description
  ```
- Make changes under `mcp-server/src/`, then rebuild and re-run:
  ```bash
  npm run build && npm start
  ```
- Write tests for your changes in `*.test.ts` files alongside your code
- Run tests to ensure everything works:
  ```bash
  npm test
  ```
- Keep changes focused and documented (add comments/types where helpful).

### Commit and PR Guidelines

- Write clear commit messages (e.g., “fix: handle missing env vars” or “feat: add get-run tool filters”).
- Push your branch and open a Pull Request:
  ```bash
  git push origin feat/short-description
  ```
- In your PR, describe the motivation, approach, and any trade-offs. Link related issues if applicable.

### Reporting Issues

- Before creating a new issue, please search existing issues to avoid duplicates.
- When filing a bug report, include steps to reproduce, expected vs. actual behavior, and environment details (OS, Node.js version).

### License

By contributing, you agree that your contributions will be licensed under the ISC license (as specified in the package metadata).

# How to Contribute

We welcome contributions of all kinds—bug fixes, features, and documentation updates!

## Quick Start

- Fork this repository and clone your fork:

```bash
  git clone https://github.com/<your-username>/currents-mcp.git
  cd currents-mcp
```

- Install dependencies:

```bash
cd mcp-server
npm install
```

- Build the project:

```bash
npm run build
```

- Run tests:

```bash
npm test
```

See [TESTING.md](./mcp-server/TESTING.md) for more details on testing.

- Run locally (stdio):

```bash
npm start
```

You should see: `Currents MCP Server running on stdio`.

## Local Development with a Client (optional)

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

## Test tools locally

To test the tools locally without any LLM, you can use the following command:

```bash
 npm run build
```

then run the tools script:

```bash
node scripts/call-tools.js
```

## Making Changes

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

## Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/) for automatic version bumping:

```plain
feat: add new tool for fetching test artifacts
fix: handle missing API key gracefully
docs: update setup instructions
chore: update dependencies
refactor: simplify request handling

feat!: redesign API response format
BREAKING CHANGE: response structure has changed
```

- In your PR, describe the motivation, approach, and any trade-offs. Link related issues if applicable.

## Reporting Issues

- Before creating a new issue, please search existing issues to avoid duplicates.
- When filing a bug report, include steps to reproduce, expected vs. actual behavior, and environment details (OS, Node.js version).

## License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 license (as specified in the package metadata).

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/currents-dev-currents-mcp-badge.png)](https://mseep.ai/app/currents-dev-currents-mcp)

# Currents MCP Server
[![smithery badge](https://smithery.ai/badge/@currents-dev/currents-mcp)](https://smithery.ai/server/@currents-dev/currents-mcp)

This is a MCP server that allows you to provide test results context to your AI agents by connecting them to Currents. Useful for asking AI to fix or optimize tests failing in CI.

## Tools

1. `get-api-config`

- Get the API key and URL used to make requests to Currents API

2. `get-run`

- Get the run information by its ID

3. `get-spec-file-attempts-and-errors`

- Get the instance information about attempts and errors by its ID 

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

#### Installing via Smithery

To install Currents Test Results Context Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@currents-dev/currents-mcp):

```bash
npx -y @smithery/cli install @currents-dev/currents-mcp --client claude
```

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

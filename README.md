# Currents MCP Server

This is a MCP server that allows you to use Currents API.

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
Add the following to your `claude_desktop_config.json`:

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

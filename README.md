# Currents MCP Server

This is a MCP server that allows you to use Currents API.

## Tools

1. `get-api-config`

- Get the API key and URL used to make requests to Currents API

2. `get-run`

- Get the run information by its ID

3. `get-instance`

- Get the instance information by its ID

1. Clone the project
2. Run `npm install`
3. Run `npm run build`
4. Check the MCP in Cursor's settings

   <img width="554" alt="image" src="https://github.com/user-attachments/assets/2142f958-12d4-469d-9d45-85ed0c05fd09" />

## Setup

### Api Key

Get a Currents API key by following the [instructions here](https://docs.currents.dev/resources/api/api-keys)

### Usage with Cursor Editor

Go to Cursor Settings > MCP > Enable


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
        "./build/index.js" // This will change to currents-mcp when we publish the package
      ],
      "env": { // This is the current way for setting env variables (see [google maps](https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps#npx) example. See [slack](https://github.com/modelcontextprotocol/servers/tree/main/src/slack#npx) example)
        "CURRENTS_API_KEY": "your-api-key",
        "CURRENTS_API_URL": "https://api-staging.currents.dev/v1" // will disappear by default using production url
      }
    }
  }
}
```

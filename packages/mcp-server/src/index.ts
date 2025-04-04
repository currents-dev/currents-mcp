#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CURRENTS_API_KEY, CURRENTS_API_URL } from "./lib/env.js";
import { makeCurrentsRequest } from "./lib/request.js";
import { InstanceData, RunResponse } from "./types.js";

if (CURRENTS_API_KEY === "") {
  console.error("CURRENTS_API_KEY env variable is not set.");
}

// Create server instance
const server = new McpServer({
  name: "currents",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register Currents tools
server.tool(
  "get-run",
  "Get run details for a defined run ID",
  {
    runId: z.string(),
  },
  async ({ runId }) => {
    const runData = await makeCurrentsRequest<RunResponse>(`/runs/${runId}`);

    if (!runData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve run data",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(runData, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get-spec-file-attempts-and-errors",
  "Get spec file attempts and errors",
  {
    instanceId: z.string(),
  },
  async ({ instanceId }) => {
    const instanceData = await makeCurrentsRequest<InstanceData>(
      `/instances/${instanceId}`
    );

    if (!instanceData) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to retrieve spec file attempts and errors data",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(instanceData, null, 2),
        },
      ],
    };
  }
);

server.tool(
  "get-api-config",
  "Get Currents API config currently used for Currents API requests",
  () => {
    return {
      content: [
        {
          type: "text",
          text: `${CURRENTS_API_KEY.slice(0, 2)}${"*".repeat(
            CURRENTS_API_KEY.length - 6
          )}${CURRENTS_API_KEY.slice(-4)}`,
        },
        {
          type: "text",
          text: CURRENTS_API_URL,
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Currents MCP Server running on stdio");
  await new Promise(() => {});
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});

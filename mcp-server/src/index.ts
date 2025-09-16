#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CURRENTS_API_KEY } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { getProjectsTool } from "./tools/projects/get-projects.js";
import { getRunDetailsTool } from "./tools/runs/runs.js";
import { getSpecFilesPerformanceTool } from "./tools/specs/get-spec-files-performance.js";
import { getSpecInstancesTool } from "./tools/specs/get-spec-instances.js";
import { getTestResultsTool } from "./tools/tests/get-test-results.js";
import { getTestsPerformanceTool } from "./tools/tests/get-tests-performance.js";
import { getTestSignatureTool } from "./tools/tests/get-tests-signature.js";

if (CURRENTS_API_KEY === "") {
  logger.error("CURRENTS_API_KEY env variable is not set.");
}

const server = new McpServer({
  name: "currents",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "currents-get-projects",
  "Retrieves a list of all projects available in the Currents platform. This is a prerequisite for using any other tools that require project-specific information.",
  getProjectsTool.schema,
  getProjectsTool.handler
);

server.tool(
  "currents-get-run-details",
  "Retrieves details of a specific test run. Requires a user-provided runId.",
  getRunDetailsTool.schema,
  getRunDetailsTool.handler
);

server.tool(
  "currents-get-spec-instance",
  "Retrieves debugging data from a specific execution of a test spec file by instanceId.",
  getSpecInstancesTool.schema,
  getSpecInstancesTool.handler
);

server.tool(
  "currents-get-spec-files-performance",
  "Retrieves spec files performance metrics for a specific project. Supports ordering by one of: 'flaky', 'failing', 'slowest', or 'mostExecuted'. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
  getSpecFilesPerformanceTool.schema,
  getSpecFilesPerformanceTool.handler
);

server.tool(
  "currents-get-tests-performance",
  "Retrieves test performance metrics for a specific project. Supports ordering by one of: 'flaky', 'failing', 'slowest', or 'mostExecuted'. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
  getTestsPerformanceTool.schema,
  getTestsPerformanceTool.handler
);

server.tool(
  "currents-get-tests-signatures",
  "Retrieves a test signature by its spec file name and test name. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
  getTestSignatureTool.schema,
  getTestSignatureTool.handler
);

server.tool(
  "currents-get-test-results",
  "Retrieves debugging data from test results of a test by its signature. Requires the test signature. If the signature is not known, first call 'currents-get-test-signature'.",
  getTestResultsTool.schema,
  getTestResultsTool.handler
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.debug("🚀 Currents MCP Server is live");
  await new Promise(() => {});
}

main().catch((error) => {
  logger.error("Fatal error in main():", error);
  process.exit(1);
});

#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CURRENTS_API_KEY } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { getProjectsTool } from "./tools/projects/get-projects.js";
import { getRunDetailsTool } from "./tools/runs/get-run.js";
import { getSpecFilesPerformanceTool } from "./tools/specs/get-spec-files-performance.js";
import { getSpecInstancesTool } from "./tools/specs/get-spec-instances.js";
import { getTestResultsTool } from "./tools/tests/get-test-results.js";
import { getTestsPerformanceTool } from "./tools/tests/get-tests-performance.js";
import { getTestSignatureTool } from "./tools/tests/get-tests-signature.js";
import { getRunsTool } from "./tools/runs/get-runs.js";

if (CURRENTS_API_KEY === "") {
  logger.error("CURRENTS_API_KEY env variable is not set.");
}

const server = new McpServer({
  name: "currents",
  version: "1.0.0",
});

server.tool(
  "currents-get-projects",
  "Retrieves a list of all projects available in the Currents platform. This is a prerequisite for using any other tools that require project-specific information.",
  getProjectsTool.schema,
  getProjectsTool.handler
);

server.tool(
  "currents-get-runs",
  "Retrieves a list of runs for a specific project with optional filtering. Supports filtering by branch, tags (with AND/OR operators), status (PASSED/FAILED/RUNNING/FAILING), completion state, date range, commit author, and search by ciBuildId or commit message. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
  getRunsTool.schema,
  getRunsTool.handler
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
  "Retrieves spec files performance metrics for a specific project within a date range. Supports ordering by avgDuration, failedExecutions, failureRate, flakeRate, flakyExecutions, fullyReported, overallExecutions, suiteSize, timeoutExecutions, or timeoutRate. Supports filtering by tags, branches, groups, and authors. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
  getSpecFilesPerformanceTool.schema,
  getSpecFilesPerformanceTool.handler
);

server.tool(
  "currents-get-tests-performance",
  "Retrieves aggregated test metrics for a specific project within a date range. Supports ordering by failures, passes, flakiness, duration, executions, title, and various delta metrics. Supports filtering by spec name, test title, tags, branches, groups, authors, minimum executions, and test state. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
  getTestsPerformanceTool.schema,
  getTestsPerformanceTool.handler
);

server.tool(
  "currents-get-tests-signatures",
  "Generates a unique test signature based on project, spec file path, and test title. The test title can be a string or array of strings (for nested describe blocks). Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
  getTestSignatureTool.schema,
  getTestSignatureTool.handler
);

server.tool(
  "currents-get-test-results",
  "Retrieves historical test execution results for a specific test signature. Supports filtering by date range, branch, tags, git author, test status (passed/failed/pending/skipped), and run group. Requires the test signature. If the signature is not known, first call 'currents-get-test-signature'.",
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

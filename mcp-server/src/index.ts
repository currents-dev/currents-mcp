#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CURRENTS_API_KEY } from "./lib/env.js";
import { logger } from "./lib/logger.js";

// Actions tools
import { listActionsTool } from "./tools/actions/list-actions.js";
import { getActionTool } from "./tools/actions/get-action.js";
import { createActionTool } from "./tools/actions/create-action.js";
import { updateActionTool } from "./tools/actions/update-action.js";
import { deleteActionTool } from "./tools/actions/delete-action.js";
import { enableActionTool } from "./tools/actions/enable-action.js";
import { disableActionTool } from "./tools/actions/disable-action.js";

// Projects tools
import { getProjectsTool } from "./tools/projects/get-projects.js";
import { getProjectTool } from "./tools/projects/get-project.js";
import { getProjectInsightsTool } from "./tools/projects/get-project-insights.js";

// Runs tools
import { getRunsTool } from "./tools/runs/get-runs.js";
import { getRunDetailsTool } from "./tools/runs/get-run.js";
import { findRunTool } from "./tools/runs/find-run.js";
import { deleteRunTool } from "./tools/runs/delete-run.js";
import { cancelRunTool } from "./tools/runs/cancel-run.js";
import { resetRunTool } from "./tools/runs/reset-run.js";
import { cancelRunGithubCITool } from "./tools/runs/cancel-run-github-ci.js";

// Specs tools
import { getSpecFilesPerformanceTool } from "./tools/specs/get-spec-files-performance.js";
import { getSpecInstancesTool } from "./tools/specs/get-spec-instances.js";

// Tests tools
import { getTestResultsTool } from "./tools/tests/get-test-results.js";
import { getTestsPerformanceTool } from "./tools/tests/get-tests-performance.js";
import { getTestSignatureTool } from "./tools/tests/get-tests-signature.js";

if (CURRENTS_API_KEY === "") {
  logger.error("CURRENTS_API_KEY env variable is not set.");
}

const server = new McpServer({
  name: "currents",
  version: "1.0.0",
});

// Actions API
server.tool(
  "currents-list-actions",
  "Retrieves a list of test actions (rules) for a project. Actions can skip, quarantine, or tag tests automatically based on conditions. Supports filtering by status (active/disabled/archived/expired) and searching by name. Requires a projectId.",
  listActionsTool.schema,
  listActionsTool.handler
);

server.tool(
  "currents-get-action",
  "Retrieves details of a specific action by actionId. The actionId is globally unique, so projectId is not required.",
  getActionTool.schema,
  getActionTool.handler
);

server.tool(
  "currents-create-action",
  "Creates a new action (rule) for a project. Actions can automatically skip, quarantine, or tag tests that match specified conditions based on test title, file path, git branch, error messages, etc. Requires projectId, name, action array, and matcher object.",
  createActionTool.schema,
  createActionTool.handler
);

server.tool(
  "currents-update-action",
  "Updates an existing action. The actionId is globally unique, so projectId is not required. All fields are optional - only provided fields will be updated.",
  updateActionTool.schema,
  updateActionTool.handler
);

server.tool(
  "currents-delete-action",
  "Deletes (archives) an action. The actionId is globally unique, so projectId is not required. This is a soft delete.",
  deleteActionTool.schema,
  deleteActionTool.handler
);

server.tool(
  "currents-enable-action",
  "Enables a disabled action. The actionId is globally unique, so projectId is not required.",
  enableActionTool.schema,
  enableActionTool.handler
);

server.tool(
  "currents-disable-action",
  "Disables an active action. The actionId is globally unique, so projectId is not required.",
  disableActionTool.schema,
  disableActionTool.handler
);

// Projects API
server.tool(
  "currents-get-projects",
  "Retrieves a list of all projects available in the Currents platform with optional pagination. Supports limit, starting_after, and ending_before parameters for cursor-based pagination. This is a prerequisite for using any other tools that require project-specific information.",
  getProjectsTool.schema,
  getProjectsTool.handler
);

server.tool(
  "currents-get-project",
  "Retrieves details of a specific project by projectId. Returns project information including name, creation date, fail-fast settings, inactivity timeout, and default branch.",
  getProjectTool.schema,
  getProjectTool.handler
);

server.tool(
  "currents-get-project-insights",
  "Retrieves aggregated run and test metrics for a project within a date range. Returns overall and timeline metrics including run counts, test counts, success rates, and duration statistics. Supports filtering by tags, branches, groups, and authors. Requires projectId, date_start, and date_end.",
  getProjectInsightsTool.schema,
  getProjectInsightsTool.handler
);

// Runs API
server.tool(
  "currents-get-runs",
  "Retrieves a list of runs for a specific project with optional filtering and pagination. Supports filtering by branch, tags (with AND/OR operators), status (PASSED/FAILED/RUNNING/FAILING), completion state, date range, commit author, and search by ciBuildId or commit message. Requires a projectId.",
  getRunsTool.schema,
  getRunsTool.handler
);

server.tool(
  "currents-get-run-details",
  "Retrieves details of a specific test run by runId. Returns comprehensive run information including specs, groups, test counts, status, duration, timeout, and cancellation details.",
  getRunDetailsTool.schema,
  getRunDetailsTool.handler
);

server.tool(
  "currents-find-run",
  "Finds a run by query parameters. Returns the most recent completed run matching the criteria. Can search by projectId, ciBuildId, branch, tags, and optionally include Playwright last run information.",
  findRunTool.schema,
  findRunTool.handler
);

server.tool(
  "currents-delete-run",
  "Deletes a run and all associated data. Requires a runId. This is a permanent operation.",
  deleteRunTool.schema,
  deleteRunTool.handler
);

server.tool(
  "currents-cancel-run",
  "Cancels a run that is currently in progress. Requires a runId.",
  cancelRunTool.schema,
  cancelRunTool.handler
);

server.tool(
  "currents-reset-run",
  "Resets failed spec files in a run to allow re-execution. Requires runId and machineId(s) to reset. Optionally supports batched orchestration.",
  resetRunTool.schema,
  resetRunTool.handler
);

server.tool(
  "currents-cancel-run-github-ci",
  "Cancels a run by GitHub Actions workflow run ID and attempt number. Optionally accepts projectId and ciBuildId to scope the cancellation.",
  cancelRunGithubCITool.schema,
  cancelRunGithubCITool.handler
);

// Instances API
server.tool(
  "currents-get-spec-instance",
  "Retrieves debugging data from a specific execution of a test spec file by instanceId. Returns detailed test results, stats, and execution information.",
  getSpecInstancesTool.schema,
  getSpecInstancesTool.handler
);

// Spec Files API
server.tool(
  "currents-get-spec-files-performance",
  "Retrieves spec files performance metrics for a specific project within a date range. Supports ordering by avgDuration, failedExecutions, failureRate, flakeRate, flakyExecutions, fullyReported, overallExecutions, suiteSize, timeoutExecutions, or timeoutRate. Supports filtering by tags, branches, groups, authors, and spec name. Uses page-based pagination.",
  getSpecFilesPerformanceTool.schema,
  getSpecFilesPerformanceTool.handler
);

// Tests Explorer API
server.tool(
  "currents-get-tests-performance",
  "Retrieves aggregated test metrics for a specific project within a date range (Tests Explorer). Supports ordering by failures, passes, flakiness, duration, executions, title, and various delta metrics. Supports filtering by spec name, test title, tags, branches, groups, authors, minimum executions, and test state. Uses page-based pagination.",
  getTestsPerformanceTool.schema,
  getTestsPerformanceTool.handler
);

// Test Results API
server.tool(
  "currents-get-test-results",
  "Retrieves historical test execution results for a specific test signature with cursor-based pagination. Supports filtering by date range, branch, tags, git author, test status (passed/failed/pending/skipped), and run group. Requires the test signature.",
  getTestResultsTool.schema,
  getTestResultsTool.handler
);

// Signature API
server.tool(
  "currents-get-tests-signatures",
  "Generates a unique test signature based on project, spec file path, and test title. The test title can be a string or array of strings (for nested describe blocks). Requires projectId, specFilePath, and testTitle.",
  getTestSignatureTool.schema,
  getTestSignatureTool.handler
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

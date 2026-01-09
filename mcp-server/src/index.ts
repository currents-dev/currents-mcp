#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CURRENTS_API_KEY } from "./lib/env.js";
import { logger } from "./lib/logger.js";
// Actions API
import { listActionsTool } from "./tools/actions/list-actions.js";
import { createActionTool } from "./tools/actions/create-action.js";
import { getActionTool } from "./tools/actions/get-action.js";
import { updateActionTool } from "./tools/actions/update-action.js";
import { deleteActionTool } from "./tools/actions/delete-action.js";
import { enableActionTool } from "./tools/actions/enable-action.js";
import { disableActionTool } from "./tools/actions/disable-action.js";
// Projects API
import { getProjectsTool } from "./tools/projects/get-projects.js";
import { getProjectTool } from "./tools/projects/get-project.js";
import { getProjectInsightsTool } from "./tools/projects/get-project-insights.js";
// Runs API
import { getRunsTool } from "./tools/runs/get-runs.js";
import { getRunDetailsTool } from "./tools/runs/get-run.js";
import { deleteRunTool } from "./tools/runs/delete-run.js";
import { updateRunTool } from "./tools/runs/update-run.js";
import { cancelRunTool } from "./tools/runs/cancel-run.js";
import { resetRunTool } from "./tools/runs/reset-run.js";
import { findRunTool } from "./tools/runs/find-run.js";
import { cancelCiGithubTool } from "./tools/runs/cancel-ci-github.js";
// Specs/Instances API
import { getSpecFilesPerformanceTool } from "./tools/specs/get-spec-files-performance.js";
import { getSpecInstancesTool } from "./tools/specs/get-spec-instances.js";
// Tests API
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
  "Retrieves a list of all actions (test rules) for a project. Actions automatically modify test behavior based on matchers - they can skip tests, quarantine flaky tests, or tag tests. Supports filtering by status (active/disabled/archived/expired) and search by name. Requires a projectId.",
  listActionsTool.schema,
  listActionsTool.handler
);

server.tool(
  "currents-create-action",
  "Creates a new action (test rule) for a project. Actions can skip tests, quarantine flaky tests, or tag tests based on matchers (title, file, tag, branch, author, group). Requires a projectId, name, type (skip/quarantine/tag), and matcher configuration.",
  createActionTool.schema,
  createActionTool.handler
);

server.tool(
  "currents-get-action",
  "Retrieves details of a specific action by ID. The actionId is globally unique, so projectId is not required.",
  getActionTool.schema,
  getActionTool.handler
);

server.tool(
  "currents-update-action",
  "Updates an existing action. Can modify name, type, matcher configuration, tags, reason, or expiration date. The actionId is globally unique, so projectId is not required.",
  updateActionTool.schema,
  updateActionTool.handler
);

server.tool(
  "currents-delete-action",
  "Deletes (archives) an action. The action will no longer be applied to tests. The actionId is globally unique, so projectId is not required.",
  deleteActionTool.schema,
  deleteActionTool.handler
);

server.tool(
  "currents-enable-action",
  "Enables a previously disabled action. The action will start being applied to matching tests again. The actionId is globally unique, so projectId is not required.",
  enableActionTool.schema,
  enableActionTool.handler
);

server.tool(
  "currents-disable-action",
  "Disables an active action. The action will temporarily stop being applied to tests without being deleted. The actionId is globally unique, so projectId is not required.",
  disableActionTool.schema,
  disableActionTool.handler
);

// Projects API
server.tool(
  "currents-get-projects",
  "Retrieves a list of all projects available in the Currents platform. This is a prerequisite for using any other tools that require project-specific information.",
  getProjectsTool.schema,
  getProjectsTool.handler
);

server.tool(
  "currents-get-project",
  "Retrieves details of a specific project by ID. Returns project configuration, settings, and metadata.",
  getProjectTool.schema,
  getProjectTool.handler
);

server.tool(
  "currents-get-project-insights",
  "Retrieves aggregated run and test metrics for a project within a date range. Provides histogram data with configurable time resolution (1h/1d/1w). Supports filtering by tags, branches, groups, and authors. Requires projectId, date_start, and date_end.",
  getProjectInsightsTool.schema,
  getProjectInsightsTool.handler
);

// Runs API
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
  "currents-delete-run",
  "Deletes a specific run. This permanently removes the run and all associated data. Requires a runId.",
  deleteRunTool.schema,
  deleteRunTool.handler
);

server.tool(
  "currents-update-run",
  "Updates a run's metadata, including tags and CI information (ciBuildId, branch, message, author). Requires a runId.",
  updateRunTool.schema,
  updateRunTool.handler
);

server.tool(
  "currents-cancel-run",
  "Cancels a running test run. This stops all in-progress spec executions. Requires a runId.",
  cancelRunTool.schema,
  cancelRunTool.handler
);

server.tool(
  "currents-reset-run",
  "Resets failed specs in a run, allowing them to be re-executed. Requires a runId.",
  resetRunTool.schema,
  resetRunTool.handler
);

server.tool(
  "currents-find-run",
  "Finds a run by CI build ID within a specific project. Useful for looking up runs from external CI systems. Requires projectId and ciBuildId.",
  findRunTool.schema,
  findRunTool.handler
);

server.tool(
  "currents-cancel-ci-github",
  "Cancels a GitHub Actions workflow run. Requires GitHub repository owner, repo name, and GitHub Actions run ID.",
  cancelCiGithubTool.schema,
  cancelCiGithubTool.handler
);

// Specs/Instances API
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

// Tests API
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

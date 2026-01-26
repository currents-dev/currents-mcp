#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CURRENTS_API_KEY } from "./lib/env.js";
import { logger } from "./lib/logger.js";
// Actions tools
import { listActionsTool } from "./tools/actions/list-actions.js";
import { createActionTool } from "./tools/actions/create-action.js";
import { getActionTool } from "./tools/actions/get-action.js";
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
import { cancelRunTool } from "./tools/runs/cancel-run.js";
import { resetRunTool } from "./tools/runs/reset-run.js";
import { deleteRunTool } from "./tools/runs/delete-run.js";
import { cancelRunByGithubCITool } from "./tools/runs/cancel-run-github-ci.js";
// Specs tools
import { getSpecFilesPerformanceTool } from "./tools/specs/get-spec-files-performance.js";
import { getSpecInstancesTool } from "./tools/specs/get-spec-instances.js";
// Tests tools
import { getTestResultsTool } from "./tools/tests/get-test-results.js";
import { getTestsPerformanceTool } from "./tools/tests/get-tests-performance.js";
import { getTestSignatureTool } from "./tools/tests/get-tests-signature.js";
// Webhooks tools
import { listWebhooksTool } from "./tools/webhooks/list-webhooks.js";
import { createWebhookTool } from "./tools/webhooks/create-webhook.js";
import { getWebhookTool } from "./tools/webhooks/get-webhook.js";
import { updateWebhookTool } from "./tools/webhooks/update-webhook.js";
import { deleteWebhookTool } from "./tools/webhooks/delete-webhook.js";

if (CURRENTS_API_KEY === "") {
  logger.error("CURRENTS_API_KEY env variable is not set.");
}

const server = new McpServer({
  name: "currents",
  version: "1.0.0",
});

// Actions API tools
server.tool(
  "currents-list-actions",
  "List all actions for a project with optional filtering. Actions are rules that automatically modify test behavior (skip, quarantine, tag). Supports filtering by status (active/disabled/archived/expired) and search by name. Requires a projectId.",
  listActionsTool.schema,
  listActionsTool.handler
);

server.tool(
  "currents-create-action",
  "Create a new action for a project. Actions define rules that automatically skip, quarantine, or tag tests based on conditions like test title, file path, git branch, etc. Requires projectId, name, action array, and matcher object.",
  createActionTool.schema,
  createActionTool.handler
);

server.tool(
  "currents-get-action",
  "Get a single action by ID. The actionId is globally unique, so projectId is not required. Returns full action details including matcher conditions and current status.",
  getActionTool.schema,
  getActionTool.handler
);

server.tool(
  "currents-update-action",
  "Update an existing action. The actionId is globally unique. You can update name, description, action array, matcher, or expiration date. All fields are optional.",
  updateActionTool.schema,
  updateActionTool.handler
);

server.tool(
  "currents-delete-action",
  "Delete (archive) an action. This is a soft delete - the action will be marked as archived but not permanently removed. The actionId is globally unique.",
  deleteActionTool.schema,
  deleteActionTool.handler
);

server.tool(
  "currents-enable-action",
  "Enable a disabled action. Changes the action status from disabled to active, making it apply to matching tests again. The actionId is globally unique.",
  enableActionTool.schema,
  enableActionTool.handler
);

server.tool(
  "currents-disable-action",
  "Disable an active action. Changes the action status to disabled, temporarily preventing it from applying to tests. The actionId is globally unique.",
  disableActionTool.schema,
  disableActionTool.handler
);

// Projects API tools
server.tool(
  "currents-get-projects",
  "Retrieves projects available in the Currents platform. Supports cursor-based pagination with limit, starting_after, ending_before parameters, or set fetchAll=true for automatic pagination. This is a prerequisite for using any other tools that require project-specific information.",
  getProjectsTool.schema,
  getProjectsTool.handler
);

server.tool(
  "currents-get-project",
  "Get a single project by ID. Returns project details including name, creation date, failFast setting, inactivity timeout, and default branch name.",
  getProjectTool.schema,
  getProjectTool.handler
);

server.tool(
  "currents-get-project-insights",
  "Get aggregated run and test metrics for a project within a date range. Returns overall metrics and timeline data with configurable resolution (1h/1d/1w). Supports filtering by tags, branches, groups, and authors. Requires projectId, date_start, and date_end.",
  getProjectInsightsTool.schema,
  getProjectInsightsTool.handler
);

// Runs API tools
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
  "currents-find-run",
  "Find a run by query parameters. Returns the most recent completed run matching the criteria. Can search by ciBuildId (exact match) or by branch/tags. Supports pwLastRun flag for Playwright last run info. Requires projectId.",
  findRunTool.schema,
  findRunTool.handler
);

server.tool(
  "currents-cancel-run",
  "Cancel a run in progress. This will stop the run and mark it as cancelled. Requires runId.",
  cancelRunTool.schema,
  cancelRunTool.handler
);

server.tool(
  "currents-reset-run",
  "Reset failed spec files in a run to allow re-execution. Requires runId and machineId array (1-63 machine IDs). Optionally supports batched orchestration.",
  resetRunTool.schema,
  resetRunTool.handler
);

server.tool(
  "currents-delete-run",
  "Delete a run and all associated data. This is a permanent deletion. Requires runId.",
  deleteRunTool.schema,
  deleteRunTool.handler
);

server.tool(
  "currents-cancel-run-github-ci",
  "Cancel a run by GitHub Actions workflow run ID and attempt number. Optionally scope by projectId or ciBuildId. Requires githubRunId and githubRunAttempt.",
  cancelRunByGithubCITool.schema,
  cancelRunByGithubCITool.handler
);

// Specs API tools
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

// Tests API tools
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

// Webhooks API tools
server.tool(
  "currents-list-webhooks",
  "List all webhooks for a project. Webhooks allow you to receive HTTP POST notifications when certain events occur in your test runs: RUN_FINISH (run completed), RUN_START (run started), RUN_TIMEOUT (run timed out), RUN_CANCELED (run was cancelled). Requires a projectId.",
  listWebhooksTool.schema,
  listWebhooksTool.handler
);

server.tool(
  "currents-create-webhook",
  "Create a new webhook for a project. Specify the URL to receive POST notifications, optional custom headers (as JSON string), events to trigger on (RUN_FINISH, RUN_START, RUN_TIMEOUT, RUN_CANCELED), and an optional label. Requires projectId and url.",
  createWebhookTool.schema,
  createWebhookTool.handler
);

server.tool(
  "currents-get-webhook",
  "Get a single webhook by ID. The hookId is a UUID. Returns full webhook details including url, headers, events, label, and timestamps.",
  getWebhookTool.schema,
  getWebhookTool.handler
);

server.tool(
  "currents-update-webhook",
  "Update an existing webhook. You can update the url, headers (as JSON string), hookEvents array, or label. All fields are optional. The hookId is a UUID.",
  updateWebhookTool.schema,
  updateWebhookTool.handler
);

server.tool(
  "currents-delete-webhook",
  "Delete a webhook. This permanently removes the webhook. The hookId is a UUID.",
  deleteWebhookTool.schema,
  deleteWebhookTool.handler
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

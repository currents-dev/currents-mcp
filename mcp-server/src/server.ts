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
import { listAffectedTestsTool } from "./tools/actions/list-affected-tests.js";
import { getAffectedTestExecutionsTool } from "./tools/actions/get-affected-test-executions.js";
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
// Errors tools
import { getErrorsExplorerTool } from "./tools/errors/get-errors-explorer.js";
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
server.registerTool(
  "currents-list-actions",
  {
    description: "List all actions for a project with optional filtering. Actions are rules that automatically modify test behavior (skip, quarantine, tag). Supports filtering by status (active/disabled/archived/expired) and search by name. Requires a projectId.",
    inputSchema: listActionsTool.schema,
  },
  listActionsTool.handler
);

server.registerTool(
  "currents-create-action",
  {
    description: "Create a new action for a project. Actions define rules that automatically skip, quarantine, or tag tests based on conditions like test title, file path, git branch, etc. Requires projectId, name, action array, and matcher object.",
    inputSchema: createActionTool.schema,
  },
  createActionTool.handler
);

server.registerTool(
  "currents-get-action",
  {
    description: "Get a single action by ID. The actionId is globally unique, so projectId is not required. Returns full action details including matcher conditions and current status.",
    inputSchema: getActionTool.schema,
  },
  getActionTool.handler
);

server.registerTool(
  "currents-update-action",
  {
    description: "Update an existing action. The actionId is globally unique. You can update name, description, action array, matcher, or expiration date. All fields are optional.",
    inputSchema: updateActionTool.schema,
  },
  updateActionTool.handler
);

server.registerTool(
  "currents-delete-action",
  {
    description: "Delete (archive) an action. This is a soft delete - the action will be marked as archived but not permanently removed. The actionId is globally unique.",
    inputSchema: deleteActionTool.schema,
  },
  deleteActionTool.handler
);

server.registerTool(
  "currents-enable-action",
  {
    description: "Enable a disabled action. Changes the action status from disabled to active, making it apply to matching tests again. The actionId is globally unique.",
    inputSchema: enableActionTool.schema,
  },
  enableActionTool.handler
);

server.registerTool(
  "currents-disable-action",
  {
    description: "Disable an active action. Changes the action status to disabled, temporarily preventing it from applying to tests. The actionId is globally unique.",
    inputSchema: disableActionTool.schema,
  },
  disableActionTool.handler
);

server.registerTool(
  "currents-list-affected-tests",
  {
    description: "List tests affected by actions (quarantine, skip, tag) for a project within a date range. Returns aggregated data grouped by test signature. Supports filtering by action types, action ID, status, and search. Requires projectId, date_start, and date_end. (Preview endpoint: fields and path may change.)",
    inputSchema: listAffectedTestsTool.schema,
  },
  listAffectedTestsTool.handler
);

server.registerTool(
  "currents-get-affected-test-executions",
  {
    description: "Get execution details for a specific test affected by actions within a date range. Returns individual test execution records with action info. Requires projectId, signature, date_start, and date_end. (Preview endpoint: fields and path may change.)",
    inputSchema: getAffectedTestExecutionsTool.schema,
  },
  getAffectedTestExecutionsTool.handler
);

// Projects API tools
server.registerTool(
  "currents-get-projects",
  {
    description: "Retrieves projects available in the Currents platform. Supports cursor-based pagination with limit, starting_after, ending_before parameters, or set fetchAll=true for automatic pagination. This is a prerequisite for using any other tools that require project-specific information.",
    inputSchema: getProjectsTool.schema,
  },
  getProjectsTool.handler
);

server.registerTool(
  "currents-get-project",
  {
    description: "Get a single project by ID. Returns project details including name, creation date, failFast setting, inactivity timeout, and default branch name.",
    inputSchema: getProjectTool.schema,
  },
  getProjectTool.handler
);

server.registerTool(
  "currents-get-project-insights",
  {
    description: "Get aggregated run and test metrics for a project within a date range. Returns overall metrics and timeline data with configurable resolution (1h/1d/1w). Supports filtering by tags, branches, groups, and authors. Requires projectId, date_start, and date_end.",
    inputSchema: getProjectInsightsTool.schema,
  },
  getProjectInsightsTool.handler
);

// Runs API tools
server.registerTool(
  "currents-get-runs",
  {
    description: "Retrieves a list of runs for a specific project with optional filtering. Supports filtering by branch, tags (with AND/OR operators), status (PASSED/FAILED/RUNNING/FAILING), completion state, date range, commit author, and search by ciBuildId or commit message. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
    inputSchema: getRunsTool.schema,
  },
  getRunsTool.handler
);

server.registerTool(
  "currents-get-run-details",
  {
    description: "Retrieves details of a specific test run. Requires a user-provided runId.",
    inputSchema: getRunDetailsTool.schema,
  },
  getRunDetailsTool.handler
);

server.registerTool(
  "currents-find-run",
  {
    description: "Find a run by query parameters. Returns the most recent completed run matching the criteria. Can search by ciBuildId (exact match) or by branch/tags. Supports pwLastRun flag for Playwright last run info. Requires projectId.",
    inputSchema: findRunTool.schema,
  },
  findRunTool.handler
);

server.registerTool(
  "currents-cancel-run",
  {
    description: "Cancel a run in progress. This will stop the run and mark it as cancelled. Requires runId.",
    inputSchema: cancelRunTool.schema,
  },
  cancelRunTool.handler
);

server.registerTool(
  "currents-reset-run",
  {
    description: "Reset failed spec files in a run to allow re-execution. Requires runId and machineId array (1-63 machine IDs). Optionally supports batched orchestration.",
    inputSchema: resetRunTool.schema,
  },
  resetRunTool.handler
);

server.registerTool(
  "currents-delete-run",
  {
    description: "Delete a run and all associated data. This is a permanent deletion. Requires runId.",
    inputSchema: deleteRunTool.schema,
  },
  deleteRunTool.handler
);

server.registerTool(
  "currents-cancel-run-github-ci",
  {
    description: "Cancel a run by GitHub Actions workflow run ID and attempt number. Optionally scope by projectId or ciBuildId. Requires githubRunId and githubRunAttempt.",
    inputSchema: cancelRunByGithubCITool.schema,
  },
  cancelRunByGithubCITool.handler
);

// Specs API tools
server.registerTool(
  "currents-get-spec-instance",
  {
    description: "Retrieves debugging data from a specific execution of a test spec file by instanceId.",
    inputSchema: getSpecInstancesTool.schema,
  },
  getSpecInstancesTool.handler
);

server.registerTool(
  "currents-get-spec-files-performance",
  {
    description: "Retrieves spec files performance metrics for a specific project within a date range. Supports ordering by avgDuration, failedExecutions, failureRate, flakeRate, flakyExecutions, fullyReported, overallExecutions, suiteSize, timeoutExecutions, or timeoutRate. Supports filtering by tags, branches, groups, and authors. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
    inputSchema: getSpecFilesPerformanceTool.schema,
  },
  getSpecFilesPerformanceTool.handler
);

// Tests API tools
server.registerTool(
  "currents-get-tests-performance",
  {
    description: "Retrieves aggregated test metrics for a specific project within a date range. Supports ordering by failures, passes, flakiness, duration, executions, title, and various delta metrics. Supports filtering by spec name, test title, tags, branches, groups, authors, minimum executions, test state, and annotations. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
    inputSchema: getTestsPerformanceTool.schema,
  },
  getTestsPerformanceTool.handler
);

server.registerTool(
  "currents-get-tests-signatures",
  {
    description: "Generates a unique test signature based on project, spec file path, and test title. The test title can be a string or array of strings (for nested describe blocks). Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
    inputSchema: getTestSignatureTool.schema,
  },
  getTestSignatureTool.handler
);

server.registerTool(
  "currents-get-test-results",
  {
    description: "Retrieves historical test execution results for a specific test signature. Supports filtering by date range, branch, tags, git author, test status (passed/failed/pending/skipped), run group, flaky status, and annotations. Requires the test signature. If the signature is not known, first call 'currents-get-tests-signatures'.",
    inputSchema: getTestResultsTool.schema,
  },
  getTestResultsTool.handler
);

// Errors API tools
server.registerTool(
  "currents-get-errors-explorer",
  {
    description: "Get aggregated error metrics for a project within a date range. Supports filtering by error_target, error_message, error_category, error_action, tags, branches, authors, and groups. Supports grouping by target, action, category, or message. Returns error counts, affected tests and branches, with timeline data. Requires projectId, date_start, and date_end.",
    inputSchema: getErrorsExplorerTool.schema,
  },
  getErrorsExplorerTool.handler
);

// Webhooks API tools
server.registerTool(
  "currents-list-webhooks",
  {
    description: "List all webhooks for a project. Webhooks allow you to receive HTTP POST notifications when certain events occur in your test runs: RUN_FINISH (run completed), RUN_START (run started), RUN_TIMEOUT (run timed out), RUN_CANCELED (run was cancelled). Requires a projectId.",
    inputSchema: listWebhooksTool.schema,
  },
  listWebhooksTool.handler
);

server.registerTool(
  "currents-create-webhook",
  {
    description: "Create a new webhook for a project. Specify the URL to receive POST notifications, optional custom headers (as JSON string), events to trigger on (RUN_FINISH, RUN_START, RUN_TIMEOUT, RUN_CANCELED), and an optional label. Requires projectId and url.",
    inputSchema: createWebhookTool.schema,
  },
  createWebhookTool.handler
);

server.registerTool(
  "currents-get-webhook",
  {
    description: "Get a single webhook by ID. The hookId is a UUID. Returns full webhook details including url, headers, events, label, and timestamps.",
    inputSchema: getWebhookTool.schema,
  },
  getWebhookTool.handler
);

server.registerTool(
  "currents-update-webhook",
  {
    description: "Update an existing webhook. You can update the url, headers (as JSON string), hookEvents array, or label. All fields are optional. The hookId is a UUID.",
    inputSchema: updateWebhookTool.schema,
  },
  updateWebhookTool.handler
);

server.registerTool(
  "currents-delete-webhook",
  {
    description: "Delete a webhook. This permanently removes the webhook. The hookId is a UUID.",
    inputSchema: deleteWebhookTool.schema,
  },
  deleteWebhookTool.handler
);

/** Starts the MCP server over stdio (used by the CLI and programmatic embedders). */
export async function startMcpServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.debug("🚀 Currents MCP Server is live");
  await new Promise(() => {});
}

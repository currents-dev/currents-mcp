import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getLogoDataUri, MCP_SERVER_VERSION } from './host/assets';
import { registerSkills } from './skills';
// Actions tools
import { createActionTool } from './tools/actions/create-action';
import { deleteActionTool } from './tools/actions/delete-action';
import { disableActionTool } from './tools/actions/disable-action';
import { enableActionTool } from './tools/actions/enable-action';
import { getActionTool } from './tools/actions/get-action';
import { getAffectedTestExecutionsByActionTool } from './tools/actions/get-affected-test-executions-by-action';
import { getAffectedTestExecutionsTool } from './tools/actions/get-affected-test-executions';
import { listActionsTool } from './tools/actions/list-actions';
import { listAffectedTestsTool } from './tools/actions/list-affected-tests';
import { updateActionTool } from './tools/actions/update-action';
// Context tools
import { getContextTool } from './tools/context/get-context';
// Integrations tools
import { createJiraIssueFromRunTestTool } from './tools/integrations/create-jira-issue';
import { linkJiraIssueFromRunTestTool } from './tools/integrations/link-jira-issue';
import { listJiraIssueTypesTool } from './tools/integrations/list-jira-issue-types';
import { listJiraProjectsTool } from './tools/integrations/list-jira-projects';
// Projects tools
import { getProjectInsightsTool } from './tools/projects/get-project-insights';
import { getProjectTool } from './tools/projects/get-project';
import { getProjectsTool } from './tools/projects/get-projects';
import { listProjectPullRequestsTool } from './tools/projects/list-project-pull-requests';
import { listProjectTermsTool } from './tools/projects/list-project-terms';
// Runs tools
import { cancelRunByGithubCITool } from './tools/runs/cancel-run-github-ci';
import { cancelRunTool } from './tools/runs/cancel-run';
import { deleteRunTool } from './tools/runs/delete-run';
import { findRunTool } from './tools/runs/find-run';
import { getRunDetailsTool } from './tools/runs/get-run';
import { getRunsTool } from './tools/runs/get-runs';
import { resetRunTool } from './tools/runs/reset-run';
// Specs tools
import { getSpecFilesPerformanceTool } from './tools/specs/get-spec-files-performance';
import { getSpecInstancesTool } from './tools/specs/get-spec-instances';
// Tests tools
import { getTestResultsTool } from './tools/tests/get-test-results';
import { getTestsPerformanceTool } from './tools/tests/get-tests-performance';
import { getTestSignatureTool } from './tools/tests/get-tests-signature';
// Errors tools
import { getErrorsExplorerTool } from './tools/errors/get-errors-explorer';
// Evidence tools
import { getTestEvidenceTool } from './tools/evidence/get-test-evidence';
// Webhooks tools
import { createWebhookTool } from './tools/webhooks/create-webhook';
import { deleteWebhookTool } from './tools/webhooks/delete-webhook';
import { getWebhookTool } from './tools/webhooks/get-webhook';
import { listWebhooksTool } from './tools/webhooks/list-webhooks';
import { updateWebhookTool } from './tools/webhooks/update-webhook';

/**
 * Builds a fully configured MCP server with all Currents tools registered.
 *
 * A factory (rather than a shared singleton) lets the stdio transport create
 * one instance and the stateless HTTP transport create a fresh instance per
 * request, keeping the tool/api layer identical across both.
 */
export function createMcpServer(): McpServer {
  const logoDataUri = getLogoDataUri();
  const server = new McpServer({
    name: 'currents',
    version: MCP_SERVER_VERSION,
    icons: logoDataUri
      ? [
          {
            src: logoDataUri,
            mimeType: 'image/png',
            sizes: ['256x256', '128x128', '64x64', '32x32', '16x16'],
          },
        ]
      : undefined,
  });

  // Actions API tools
  server.registerTool(
    'currents-list-actions',
    {
      description:
        'List all actions for a project with optional filtering. Actions are rules that automatically modify test behavior (skip, quarantine, tag). Supports filtering by status (active/disabled/archived/expired) and search by name. Requires a projectId.',
      inputSchema: listActionsTool.schema,
    },
    listActionsTool.handler
  );

  server.registerTool(
    'currents-create-action',
    {
      description:
        'Create a new action for a project. Actions define rules that automatically skip, quarantine, or tag tests based on conditions like test title, file path, git branch, etc. Requires projectId, name, action array, and matcher object.',
      inputSchema: createActionTool.schema,
    },
    createActionTool.handler
  );

  server.registerTool(
    'currents-get-action',
    {
      description:
        'Get a single action by ID. The actionId is globally unique, so projectId is not required. Returns full action details including matcher conditions and current status.',
      inputSchema: getActionTool.schema,
    },
    getActionTool.handler
  );

  server.registerTool(
    'currents-update-action',
    {
      description:
        'Update an existing action. The actionId is globally unique. You can update name, description, action array, matcher, or expiration date. All fields are optional.',
      inputSchema: updateActionTool.schema,
    },
    updateActionTool.handler
  );

  server.registerTool(
    'currents-delete-action',
    {
      description:
        'Delete (archive) an action. This is a soft delete - the action will be marked as archived but not permanently removed. The actionId is globally unique.',
      inputSchema: deleteActionTool.schema,
    },
    deleteActionTool.handler
  );

  server.registerTool(
    'currents-enable-action',
    {
      description:
        'Enable a disabled action. Changes the action status from disabled to active, making it apply to matching tests again. The actionId is globally unique.',
      inputSchema: enableActionTool.schema,
    },
    enableActionTool.handler
  );

  server.registerTool(
    'currents-disable-action',
    {
      description:
        'Disable an active action. Changes the action status to disabled, temporarily preventing it from applying to tests. The actionId is globally unique.',
      inputSchema: disableActionTool.schema,
    },
    disableActionTool.handler
  );

  server.registerTool(
    'currents-list-affected-tests',
    {
      description:
        'List tests affected by actions (quarantine, skip, tag) for a project within a date range. Returns aggregated data grouped by test signature. Supports filtering by action types, action ID, status, and search. Requires projectId, date_start, and date_end. Preview endpoint: fields and path may change.',
      inputSchema: listAffectedTestsTool.schema,
    },
    listAffectedTestsTool.handler
  );

  server.registerTool(
    'currents-get-affected-test-executions',
    {
      description:
        'Get execution details for a specific affected test (by signature) within a date range. Returns individual test execution records with action info. Uses cursor-based pagination. Requires projectId, signature, date_start, and date_end.',
      inputSchema: getAffectedTestExecutionsTool.schema,
    },
    getAffectedTestExecutionsTool.handler
  );

  server.registerTool(
    'currents-get-affected-executions',
    {
      description:
        'List test executions where a specific action/rule was applied, within a date range. Uses cursor-based pagination. Requires actionId, date_start, and date_end.',
      inputSchema: getAffectedTestExecutionsByActionTool.schema,
    },
    getAffectedTestExecutionsByActionTool.handler
  );

  // Projects API tools
  server.registerTool(
    'currents-get-projects',
    {
      description:
        'Retrieves projects available in the Currents platform. Supports cursor-based pagination with limit, starting_after, ending_before parameters, or set fetchAll=true for automatic pagination. This is a prerequisite for using any other tools that require project-specific information.',
      inputSchema: getProjectsTool.schema,
    },
    getProjectsTool.handler
  );

  server.registerTool(
    'currents-get-project',
    {
      description:
        'Get a single project by ID. Returns project details including name, creation date, failFast setting, inactivity timeout, and default branch name.',
      inputSchema: getProjectTool.schema,
    },
    getProjectTool.handler
  );

  server.registerTool(
    'currents-get-project-insights',
    {
      description:
        'Get aggregated run and test metrics for a project within a date range. Returns overall metrics and timeline data with configurable resolution (1h/1d/1w). Supports filtering by tags, branches, groups, and authors. Requires projectId, date_start, and date_end.',
      inputSchema: getProjectInsightsTool.schema,
    },
    getProjectInsightsTool.handler
  );

  server.registerTool(
    'currents-list-pull-requests',
    {
      description:
        'List pull-request cards for a project (runs grouped by meta.pr.id). Supports cursor pagination, runs_per_pr preview count, and filters by tags, branches, authors, and latest-run status. Requires projectId.',
      inputSchema: listProjectPullRequestsTool.schema,
    },
    listProjectPullRequestsTool.handler
  );

  server.registerTool(
    'currents-list-project-terms',
    {
      description:
        'List cursor-paginated project terms for one type (tag, branch, authorName, etc.). Supports search, sort direction, and starting_after or ending_before cursors. Requires projectId and termType.',
      inputSchema: listProjectTermsTool.schema,
    },
    listProjectTermsTool.handler
  );

  server.registerTool(
    'currents-create-jira-issue',
    {
      description:
        'Create a Jira issue from a run test using the organization Jira integration. Requires projectId, runId, testId, jiraInstallationId, jiraProjectId, and jiraIssueType. Optional customFields array.',
      inputSchema: createJiraIssueFromRunTestTool.schema,
    },
    createJiraIssueFromRunTestTool.handler
  );

  server.registerTool(
    'currents-link-jira-issue',
    {
      description:
        'Link an existing Jira issue to a run test using the organization Jira integration. Requires projectId, jiraIssueKey, runId, testId, jiraInstallationId, jiraProjectId, and jiraIssueType. Optional comment and includeContextInComment.',
      inputSchema: linkJiraIssueFromRunTestTool.schema,
    },
    linkJiraIssueFromRunTestTool.handler
  );

  server.registerTool(
    'currents-list-jira-projects',
    {
      description:
        'List Jira projects available for the organization integration. Use returned project IDs as jiraProjectId when creating issues. Requires jira_installation_id.',
      inputSchema: listJiraProjectsTool.schema,
    },
    listJiraProjectsTool.handler
  );

  server.registerTool(
    'currents-list-jira-issue-types',
    {
      description:
        'List Jira issue types and custom fields for a Jira project. Requires jiraProjectId and jira_installation_id.',
      inputSchema: listJiraIssueTypesTool.schema,
    },
    listJiraIssueTypesTool.handler
  );

  // Runs API tools
  server.registerTool(
    'currents-get-runs',
    {
      description:
        "Retrieves a list of runs for a specific project with optional filtering. Supports filtering by branch, tags (with AND/OR operators), status (PASSED/FAILED/RUNNING/FAILING), completion state, date range, commit author, and search by ciBuildId or commit message. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
      inputSchema: getRunsTool.schema,
    },
    getRunsTool.handler
  );

  server.registerTool(
    'currents-get-run-details',
    {
      description:
        'Retrieves details of a specific test run. Requires a user-provided runId.',
      inputSchema: getRunDetailsTool.schema,
    },
    getRunDetailsTool.handler
  );

  server.registerTool(
    'currents-find-run',
    {
      description:
        'Find a run by query parameters. Returns the most recent completed run matching the criteria. Can search by ciBuildId (exact match) or by branch/tags. Supports pwLastRun flag for Playwright last run info. Requires projectId.',
      inputSchema: findRunTool.schema,
    },
    findRunTool.handler
  );

  server.registerTool(
    'currents-cancel-run',
    {
      description:
        'Cancel a run in progress. This will stop the run and mark it as cancelled. Requires runId.',
      inputSchema: cancelRunTool.schema,
    },
    cancelRunTool.handler
  );

  server.registerTool(
    'currents-reset-run',
    {
      description:
        'Reset failed spec files in a run to allow re-execution. Requires runId and machineId array (1-63 machine IDs). Optionally supports batched orchestration.',
      inputSchema: resetRunTool.schema,
    },
    resetRunTool.handler
  );

  server.registerTool(
    'currents-delete-run',
    {
      description:
        'Delete a run and all associated data. This is a permanent deletion. Requires runId.',
      inputSchema: deleteRunTool.schema,
    },
    deleteRunTool.handler
  );

  server.registerTool(
    'currents-cancel-run-github-ci',
    {
      description:
        'Cancel a run by GitHub Actions workflow run ID and attempt number. Optionally scope by projectId or ciBuildId. Requires githubRunId and githubRunAttempt.',
      inputSchema: cancelRunByGithubCITool.schema,
    },
    cancelRunByGithubCITool.handler
  );

  // Specs API tools
  server.registerTool(
    'currents-get-spec-instance',
    {
      description:
        'Retrieves debugging data from a specific execution of a test spec file by instanceId.',
      inputSchema: getSpecInstancesTool.schema,
    },
    getSpecInstancesTool.handler
  );

  server.registerTool(
    'currents-get-spec-files-performance',
    {
      description:
        "Retrieves spec files performance metrics for a specific project within a date range. Supports ordering by avgDuration, failedExecutions, failureRate, flakeRate, flakyExecutions, fullyReported, overallExecutions, suiteSize, timeoutExecutions, or timeoutRate. Supports filtering by tags, branches, groups, and authors. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
      inputSchema: getSpecFilesPerformanceTool.schema,
    },
    getSpecFilesPerformanceTool.handler
  );

  // Tests API tools
  server.registerTool(
    'currents-get-tests-performance',
    {
      description:
        "Retrieves aggregated test metrics for a specific project within a date range. Supports ordering by failures, passes, flakiness, duration, executions, title, and various delta metrics. Supports filtering by spec name, test title, tags, branches, groups, authors, minimum executions, test state, and annotations. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
      inputSchema: getTestsPerformanceTool.schema,
    },
    getTestsPerformanceTool.handler
  );

  server.registerTool(
    'currents-get-tests-signatures',
    {
      description:
        "Generates a unique test signature based on project, spec file path, and test title. The test title can be a string or array of strings (for nested describe blocks). Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
      inputSchema: getTestSignatureTool.schema,
    },
    getTestSignatureTool.handler
  );

  server.registerTool(
    'currents-get-test-results',
    {
      description:
        "Retrieves historical test execution results for a specific test signature. Supports filtering by date range, branch, tags, git author, test status (passed/failed/pending/skipped), run group, flaky status, and annotations. Requires the test signature. If the signature is not known, first call 'currents-get-tests-signatures'.",
      inputSchema: getTestResultsTool.schema,
    },
    getTestResultsTool.handler
  );

  // Context API tools
  server.registerTool(
    'currents-get-context',
    {
      description:
        'Get test failure context for AI debugging at run, instance, or test level. Supports json or md format, detail level, and pagination for failed tests. Requires run_id for run-level, or instance_id with optional test_id.',
      inputSchema: getContextTool.schema,
    },
    getContextTool.handler
  );

  // Errors API tools
  server.registerTool(
    'currents-get-errors-explorer',
    {
      description:
        'Get aggregated error metrics for a project within a date range. Supports filtering by error_target, error_message, error_category, error_action, tags, branches, authors, and groups. Supports grouping by target, action, category, or message. Returns error counts, affected tests and branches, with timeline data. Requires projectId, date_start, and date_end.',
      inputSchema: getErrorsExplorerTool.schema,
    },
    getErrorsExplorerTool.handler
  );

  // Evidence tools
  server.registerTool(
    'currents-get-test-evidence',
    {
      description:
        'Collect evidence artifacts (screenshots, videos, traces, attachments) produced by tests in a CI run, with signed download URLs grouped per test. Use to gather proof or a demo of an implemented feature from CI — e.g. before/after screenshots, text output stored as test attachments, or Playwright videos and traces — instead of running tests locally. Locates the run by runId, or by projectId with ciBuildId or branch (latest run). Supports filtering by spec file, test title, and test status. URLs are signed and time-limited, so download the files promptly.',
      inputSchema: getTestEvidenceTool.schema,
    },
    getTestEvidenceTool.handler
  );

  // Webhooks API tools
  server.registerTool(
    'currents-list-webhooks',
    {
      description:
        'List all webhooks for a project. Webhooks allow you to receive HTTP POST notifications when certain events occur in your test runs: RUN_FINISH (run completed), RUN_START (run started), RUN_TIMEOUT (run timed out), RUN_CANCELED (run was cancelled). Requires a projectId.',
      inputSchema: listWebhooksTool.schema,
    },
    listWebhooksTool.handler
  );

  server.registerTool(
    'currents-create-webhook',
    {
      description:
        'Create a new webhook for a project. Specify the URL to receive POST notifications, optional custom headers (as JSON string), events to trigger on (RUN_FINISH, RUN_START, RUN_TIMEOUT, RUN_CANCELED), and an optional label. Requires projectId and url.',
      inputSchema: createWebhookTool.schema,
    },
    createWebhookTool.handler
  );

  server.registerTool(
    'currents-get-webhook',
    {
      description:
        'Get a single webhook by ID. The hookId is a UUID. Returns full webhook details including url, headers, events, label, and timestamps.',
      inputSchema: getWebhookTool.schema,
    },
    getWebhookTool.handler
  );

  server.registerTool(
    'currents-update-webhook',
    {
      description:
        'Update an existing webhook. You can update the url, headers (as JSON string), hookEvents array, or label. All fields are optional. The hookId is a UUID.',
      inputSchema: updateWebhookTool.schema,
    },
    updateWebhookTool.handler
  );

  server.registerTool(
    'currents-delete-webhook',
    {
      description:
        'Delete a webhook. This permanently removes the webhook. The hookId is a UUID.',
      inputSchema: deleteWebhookTool.schema,
    },
    deleteWebhookTool.handler
  );

  registerSkills(server);

  return server;
}

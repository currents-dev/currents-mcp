import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import {
  ListToolsRequestSchema,
  type ToolAnnotations,
} from '@modelcontextprotocol/sdk/types.js';
import { getLogoDataUri, MCP_SERVER_VERSION } from './host/assets';
import type { RequestContext } from './lib/context';
import { buildServerInstructions } from './lib/instructions';
import { isToolGranted, McpTool } from './lib/tool';
import { reportToolCall } from './lib/toolCallReport';
import { listTools, type CatalogTool } from './lib/toolList';
import { getSkills, registerSkills } from './skills';
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
import { createEvidenceLinksTool } from './tools/evidence/create-evidence-links';
import { getTestEvidenceTool } from './tools/evidence/get-test-evidence';
// Sessions tools
import { createSessionTool } from './tools/sessions/create-session';
// Share tools
import { createShareLinkTool } from './tools/share/create-share-link';

// Webhooks tools
import { createWebhookTool } from './tools/webhooks/create-webhook';
import { deleteWebhookTool } from './tools/webhooks/delete-webhook';
import { getWebhookTool } from './tools/webhooks/get-webhook';
import { listWebhooksTool } from './tools/webhooks/list-webhooks';
import { updateWebhookTool } from './tools/webhooks/update-webhook';

/**
 * The four annotation hints, as the combinations this catalog uses. A host has
 * no other way to tell `currents-delete-run` from `currents-get-run-details`,
 * so a tool that declares none gets either no confirmation prompt or one on
 * every call.
 *
 * `openWorldHint` is false in all of them: a tool reaches the runs, tests and
 * settings of the organization the credential belongs to and nothing outside
 * it. Seven tools override it — the four Jira tools, because the issue they
 * read or write lives in the customer's Jira instance, the two webhook tools
 * that take a `url`, because the destination they store is one the notification
 * worker will later POST run data to, and `currents-create-share-link`, because
 * the link it returns serves test data to anyone who holds it.
 */
const readOnly: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/** Creates a record and leaves the existing ones; a second call creates another. */
const additiveWrite: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

/**
 * Sets a status that the opposite tool sets back, so nothing is lost, and a
 * repeat call leaves the state the first one produced.
 */
const idempotentWrite: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

/**
 * Overwrites or removes what is there, with no tool that puts it back. A repeat
 * call has nothing left to overwrite, hence idempotent.
 */
const destructiveWrite: ToolAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
};

/**
 * One tool, as the catalog below declares it. Kept per-schema generic so the
 * handler and the schema it is written against stay tied together; the entry
 * it produces has that pair already matched, and the array holding them all
 * cannot.
 */
const catalogTool = <Schema extends AnySchema>(
  name: string,
  /**
   * `description` comes first in every entry below, and has to. The README
   * table in `currents-dev/currents-mcp` is generated from this file by a
   * regex anchored on `'currents-…', { description:`, and it fails the sync
   * check with "No tools found in server.ts" when anything sits between the
   * name and that key.
   */
  config: { title: string; description: string; annotations: ToolAnnotations },
  tool: McpTool<Schema>
): CatalogTool => ({ name, ...config, tool: tool as McpTool });

/**
 * Every tool this server can serve, in the order a client is told them.
 *
 * At module scope rather than inside the factory because none of it depends on
 * the caller: `POST /mcp` builds a server per request, and the descriptions and
 * annotation objects below would otherwise be rebuilt each time.
 */
export const TOOL_CATALOG: CatalogTool[] = [
  // Actions API tools
  catalogTool(
    'currents-list-actions',
    {
      description:
        'List all actions for a project with optional filtering. Actions are rules that automatically modify test behavior (skip, quarantine, tag). Supports filtering by status (active/disabled/archived/expired) and search by name. Requires a projectId.',
      title: 'List Actions',
      annotations: readOnly,
    },
    listActionsTool
  ),
  catalogTool(
    'currents-create-action',
    {
      description:
        'Create a new action for a project. Actions define rules that automatically skip, quarantine, or tag tests based on conditions like test title, file path, git branch, etc. Requires projectId, name, action array, and matcher object.',
      title: 'Create Action',
      annotations: additiveWrite,
    },
    createActionTool
  ),
  catalogTool(
    'currents-get-action',
    {
      description:
        'Get a single action by ID. The actionId is globally unique, so projectId is not required. Returns full action details including matcher conditions and current status.',
      title: 'Get Action',
      annotations: readOnly,
    },
    getActionTool
  ),
  catalogTool(
    'currents-update-action',
    {
      description:
        'Update an existing action. The actionId is globally unique. You can update name, description, action array, matcher, or expiration date. All fields are optional.',
      // Not idempotent: `upsertRule` pushes an `updated` history entry and
      // sets `updatedAt`/`updatedBy` on every call, identical body or not.
      title: 'Update Action',
      annotations: { ...destructiveWrite, idempotentHint: false },
    },
    updateActionTool
  ),
  catalogTool(
    'currents-delete-action',
    {
      description:
        'Delete (archive) an action. This is a soft delete - the action will be marked as archived but not permanently removed. The actionId is globally unique.',
      title: 'Archive Action',
      annotations: destructiveWrite,
    },
    deleteActionTool
  ),
  catalogTool(
    'currents-enable-action',
    {
      description:
        'Enable a disabled action. Changes the action status from disabled to active, making it apply to matching tests again. The actionId is globally unique.',
      title: 'Enable Action',
      annotations: idempotentWrite,
    },
    enableActionTool
  ),
  catalogTool(
    'currents-disable-action',
    {
      description:
        'Disable an active action. Changes the action status to disabled, temporarily preventing it from applying to tests. The actionId is globally unique.',
      title: 'Disable Action',
      annotations: idempotentWrite,
    },
    disableActionTool
  ),
  catalogTool(
    'currents-list-affected-tests',
    {
      description:
        'List tests affected by actions (quarantine, skip, tag) for a project within a date range. Returns aggregated data grouped by test signature. Supports filtering by action types, action ID, status, and search. Requires projectId, date_start, and date_end. Preview endpoint: fields and path may change.',
      title: 'List Tests Affected by Actions',
      annotations: readOnly,
    },
    listAffectedTestsTool
  ),
  catalogTool(
    'currents-get-affected-test-executions',
    {
      description:
        "Keyed on a test: lists the executions of one test that an action applied to, within a date range, with the run, branch and commit of each. Requires projectId, signature, date_start and date_end; if the signature is not known, first call 'currents-get-tests-signatures'. For the executions of one rule across every test it touched, call 'currents-get-action-executions' instead. Uses cursor-based pagination.",
      title: 'Get Executions of an Affected Test',
      annotations: readOnly,
    },
    getAffectedTestExecutionsTool
  ),
  catalogTool(
    'currents-get-action-executions',
    {
      description:
        "Keyed on an action: lists the test executions one rule was applied to, across every test it touched, within a date range. Requires actionId, date_start and date_end; if the actionId is not known, first call 'currents-list-actions'. For the executions of one test, call 'currents-get-affected-test-executions' instead. Uses cursor-based pagination.",
      title: 'List Executions an Action Applied To',
      annotations: readOnly,
    },
    getAffectedTestExecutionsByActionTool
  ),
  // Projects API tools
  catalogTool(
    'currents-get-projects',
    {
      description:
        'Retrieves projects available in the Currents platform. Supports cursor-based pagination with limit, starting_after, ending_before parameters, or set fetchAll=true for automatic pagination. This is a prerequisite for using any other tools that require project-specific information.',
      title: 'List Projects',
      annotations: readOnly,
    },
    getProjectsTool
  ),
  catalogTool(
    'currents-get-project',
    {
      description:
        'Get a single project by ID. Returns project details including name, creation date, failFast setting, inactivity timeout, and default branch name.',
      title: 'Get Project',
      annotations: readOnly,
    },
    getProjectTool
  ),
  catalogTool(
    'currents-get-project-insights',
    {
      description:
        'Get aggregated run and test metrics for a project within a date range. Returns overall metrics and timeline data with configurable resolution (1h/1d/1w). Supports filtering by tags, branches, groups, and authors. Requires projectId, date_start, and date_end.',
      title: 'Get Project Insights',
      annotations: readOnly,
    },
    getProjectInsightsTool
  ),
  catalogTool(
    'currents-list-pull-requests',
    {
      description:
        "List pull-request cards for a project (runs grouped by meta.pr.id). Run filters (date range, tags, branches, authors, environments, pr_id, search) choose which runs count; status, completion_state and pr_search are checked on each PR's latest run among those runs. Supports order and dir, cursor pagination and the runs_per_pr preview count. Requires projectId.",
      title: 'List Pull Requests',
      annotations: readOnly,
    },
    listProjectPullRequestsTool
  ),
  catalogTool(
    'currents-list-project-terms',
    {
      description:
        'List cursor-paginated project terms for one type (tag, branch, authorName, etc.). Supports search, sort direction, and starting_after or ending_before cursors. Requires projectId and termType.',
      title: 'List Project Terms',
      annotations: readOnly,
    },
    listProjectTermsTool
  ),
  catalogTool(
    'currents-create-jira-issue',
    {
      description:
        'Create a Jira issue from a run test using the organization Jira integration. Requires projectId, runId, testId, jiraInstallationId, jiraProjectId, and jiraIssueType. Optional customFields array.',
      title: 'Create Jira Issue',
      annotations: { ...additiveWrite, openWorldHint: true },
    },
    createJiraIssueFromRunTestTool
  ),
  catalogTool(
    'currents-link-jira-issue',
    {
      description:
        'Link an existing Jira issue to a run test using the organization Jira integration. Requires projectId, jiraIssueKey, runId, testId, jiraInstallationId, jiraProjectId, and jiraIssueType. Optional comment and includeContextInComment.',
      title: 'Link Jira Issue',
      annotations: { ...additiveWrite, openWorldHint: true },
    },
    linkJiraIssueFromRunTestTool
  ),
  catalogTool(
    'currents-list-jira-projects',
    {
      description:
        'List Jira projects available for the organization integration. Use returned project IDs as jiraProjectId when creating issues. Requires jira_installation_id.',
      title: 'List Jira Projects',
      annotations: { ...readOnly, openWorldHint: true },
    },
    listJiraProjectsTool
  ),
  catalogTool(
    'currents-list-jira-issue-types',
    {
      description:
        'List Jira issue types and custom fields for a Jira project. Requires jiraProjectId and jira_installation_id.',
      title: 'List Jira Issue Types',
      annotations: { ...readOnly, openWorldHint: true },
    },
    listJiraIssueTypesTool
  ),
  // Runs API tools
  catalogTool(
    'currents-get-runs',
    {
      description:
        "Retrieves a list of runs for a specific project with optional filtering. Supports filtering by branch, tags (with AND/OR operators), status (PASSED/FAILED/RUNNING/FAILING), completion state, date range, commit author, and free-text search over the run's CI build id, commit message, branch, sha, author, pull request title/number/branches, tags, environments, framework and browser. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
      title: 'List Runs',
      annotations: readOnly,
    },
    getRunsTool
  ),
  catalogTool(
    'currents-get-run-details',
    {
      description:
        'Retrieves details of a specific test run. Requires a user-provided runId.',
      title: 'Get Run',
      annotations: readOnly,
    },
    getRunDetailsTool
  ),
  catalogTool(
    'currents-find-run',
    {
      description:
        'Find a run by query parameters. Returns the most recent completed run matching the criteria. Can search by ciBuildId (exact match) or by branch/tags. Supports pwLastRun flag for Playwright last run info. Requires projectId.',
      title: 'Find Run',
      annotations: readOnly,
    },
    findRunTool
  ),
  catalogTool(
    'currents-cancel-run',
    {
      description:
        'Cancel a run in progress. This will stop the run and mark it as cancelled. Requires runId.',
      title: 'Cancel Run',
      annotations: destructiveWrite,
    },
    cancelRunTool
  ),
  catalogTool(
    'currents-reset-run',
    {
      description:
        'Reset failed spec files in a run to allow re-execution. Requires runId and machineId array (1-63 machine IDs). Optionally supports batched orchestration.',
      // Not idempotent: a reset re-queues the incomplete items, which the next
      // call finds incomplete again and resets a second time.
      title: 'Reset Failed Specs in a Run',
      annotations: { ...destructiveWrite, idempotentHint: false },
    },
    resetRunTool
  ),
  catalogTool(
    'currents-delete-run',
    {
      description:
        'Delete a run and all associated data. This is a permanent deletion. Requires runId.',
      title: 'Delete Run',
      annotations: destructiveWrite,
    },
    deleteRunTool
  ),
  catalogTool(
    'currents-cancel-run-github-ci',
    {
      description:
        'Cancel a run by GitHub Actions workflow run ID and attempt number. Optionally scope by projectId or ciBuildId. Requires githubRunId and githubRunAttempt.',
      title: 'Cancel Run by GitHub Workflow',
      annotations: destructiveWrite,
    },
    cancelRunByGithubCITool
  ),
  // Specs API tools
  catalogTool(
    'currents-get-spec-instance',
    {
      description:
        'Retrieves debugging data from a specific execution of a test spec file by instanceId.',
      title: 'Get Spec Execution',
      annotations: readOnly,
    },
    getSpecInstancesTool
  ),
  catalogTool(
    'currents-get-spec-files-performance',
    {
      description:
        "Retrieves spec files performance metrics for a specific project within a date range. Supports ordering by avgDuration, failedExecutions, failureRate, flakeRate, flakyExecutions, fullyReported, overallExecutions, suiteSize, timeoutExecutions, or timeoutRate. Supports filtering by tags, branches, groups, and authors. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
      title: 'Get Spec File Performance',
      annotations: readOnly,
    },
    getSpecFilesPerformanceTool
  ),
  // Tests API tools
  catalogTool(
    'currents-get-tests-performance',
    {
      description:
        "Retrieves aggregated test metrics for a specific project within a date range. Supports ordering by failures, passes, flakiness, duration, executions, title, and various delta metrics. Supports filtering by spec name, test title, tags, branches, groups, authors, minimum executions, test state, and annotations. Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
      title: 'Get Test Performance',
      annotations: readOnly,
    },
    getTestsPerformanceTool
  ),
  catalogTool(
    'currents-get-tests-signatures',
    {
      description:
        "Generates a unique test signature based on project, spec file path, and test title. The test title can be a string or array of strings (for nested describe blocks). Requires a projectId. If the projectId is not known, first call 'currents-get-projects' and ask the user to select the project.",
      title: 'Get Test Signature',
      annotations: readOnly,
    },
    getTestSignatureTool
  ),
  catalogTool(
    'currents-get-test-results',
    {
      description:
        "Retrieves historical test execution results for a specific test signature. Supports filtering by date range, branch, tags, git author, test status (passed/failed/pending/skipped), run group, flaky status, and annotations. Requires the test signature. If the signature is not known, first call 'currents-get-tests-signatures'.",
      title: 'Get Test History',
      annotations: readOnly,
    },
    getTestResultsTool
  ),
  // Context API tools
  catalogTool(
    'currents-get-context',
    {
      description:
        'Use to fix tests that failed in CI: returns the errors, steps and files of the failed tests of a run, a spec file (instance) or one test — the same content as Fix in the Currents dashboard. Flaky tests are left out of a run unless include_flaky is set. Supports json or md format, detail level, and pagination for failed tests. Requires run_id for run-level, or instance_id with optional test_id.',
      title: 'Get Failure Context to Fix Tests',
      annotations: readOnly,
    },
    getContextTool
  ),
  // Errors API tools
  catalogTool(
    'currents-get-errors-explorer',
    {
      description:
        'Get aggregated error metrics for a project within a date range. Supports filtering by error_target, error_message, error_category, error_action, tags, branches, authors, and groups. Supports grouping by target, action, category, or message. Returns error counts, affected tests and branches, with timeline data. Requires projectId, date_start, and date_end.',
      title: 'Explore Errors',
      annotations: readOnly,
    },
    getErrorsExplorerTool
  ),
  // Evidence tools
  catalogTool(
    'currents-get-test-evidence',
    {
      description:
        'Collect evidence artifacts (screenshots, videos, traces, attachments) produced by tests in a CI run, with signed download URLs grouped per test. Use to gather proof or a demo of an implemented feature from CI — e.g. before/after screenshots, text output stored as test attachments, or Playwright videos and traces — instead of running tests locally. Locates the run by runId, or by projectId with ciBuildId or branch (latest run). Supports filtering by spec file, test title, and test status. URLs are signed and time-limited, so download the files promptly.',
      title: 'Collect Test Evidence',
      annotations: readOnly,
    },
    getTestEvidenceTool
  ),
  catalogTool(
    'currents-create-evidence-links',
    {
      description:
        "Create a shareable link to a test attempt's evidence, served from its Playwright trace, and the URLs onto it: a markdown digest of what the attempt did and what failed, a filmstrip, an animated screencast, DOM snapshots, network requests and attachments. Use it to read a trace without downloading it, and to put evidence in a pull request comment or an issue — the link reads without a Currents credential and expires. Start from the digest it returns. Requires instanceId and testId.",
      title: 'Create Evidence Links',
      annotations: additiveWrite,
    },
    createEvidenceLinksTool
  ),
  catalogTool(
    'currents-create-session',
    {
      description:
        "Record a browser session you drove as a Currents run, so its evidence can be read and shared like a CI run's. Use it when there is no test to run — a bug reproduced by hand, a fix demonstrated in a browser. Returns the run and an upload URL per file you declared; PUT the bytes to those, and the response says what to do next. A trace attached this way can then be turned into a link that needs no Currents credential.",
      title: 'Record Browser Session',
      annotations: additiveWrite,
    },
    createSessionTool
  ),
  // Webhooks API tools
  catalogTool(
    'currents-list-webhooks',
    {
      description:
        'List all webhooks for a project. Webhooks allow you to receive HTTP POST notifications when certain events occur in your test runs: RUN_FINISH (run completed), RUN_START (run started), RUN_TIMEOUT (run timed out), RUN_CANCELED (run was cancelled). Requires a projectId.',
      title: 'List Webhooks',
      annotations: readOnly,
    },
    listWebhooksTool
  ),
  catalogTool(
    'currents-create-share-link',
    {
      description:
        'Create a public link to test results that anyone can open without signing in, until it expires. purpose "fix" is the failure context, for an agent that will fix the tests — the same content as currents-get-context, with flaky tests included and marked flaky. purpose "report" lists every test with its attempts and files, for a person. Target a run (run_id), a spec file (run_id + instance_id) or a test (instance_id + test_id). Returns url (markdown, for agents) and pageUrl (web page, for people). Create one only when asked to hand results to someone.',
      title: 'Create Public Share Link',
      annotations: { ...additiveWrite, openWorldHint: true },
    },
    createShareLinkTool
  ),
  catalogTool(
    'currents-create-webhook',
    {
      description:
        'Create a new webhook for a project. Specify the URL to receive POST notifications, optional custom headers (as JSON string), events to trigger on (RUN_FINISH, RUN_START, RUN_TIMEOUT, RUN_CANCELED), and an optional label. Requires projectId and url.',
      title: 'Create Webhook',
      annotations: { ...additiveWrite, openWorldHint: true },
    },
    createWebhookTool
  ),
  catalogTool(
    'currents-get-webhook',
    {
      description:
        'Get a single webhook by ID. The hookId is a UUID. Returns full webhook details including url, headers, events, label, and timestamps.',
      title: 'Get Webhook',
      annotations: readOnly,
    },
    getWebhookTool
  ),
  catalogTool(
    'currents-update-webhook',
    {
      description:
        'Update an existing webhook. You can update the url, headers (as JSON string), hookEvents array, or label. All fields are optional. The hookId is a UUID.',
      // Not idempotent: `updateGenericHook` writes `updatedAt: new Date()`
      // whether or not the body changed anything.
      title: 'Update Webhook',
      annotations: {
        ...destructiveWrite,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    updateWebhookTool
  ),
  catalogTool(
    'currents-delete-webhook',
    {
      description:
        'Delete a webhook. This permanently removes the webhook. The hookId is a UUID.',
      title: 'Delete Webhook',
      annotations: destructiveWrite,
    },
    deleteWebhookTool
  ),
];

/**
 * Builds an MCP server with the Currents tools the caller can reach.
 *
 * A factory (rather than a shared singleton) because the SDK refuses a second
 * `connect` on one instance: the stdio transport creates one and keeps it, and
 * the stateless HTTP transport creates a fresh instance per request. What does
 * not have to be rebuilt per request is the answer to `tools/list`, which
 * `lib/toolList.ts` caches by the granted tool set.
 *
 * A tool the credential cannot call (`isToolGranted`) is not registered: it is
 * missing from `tools/list`, and a call naming it anyway is answered by the SDK
 * as an unknown tool. Registering it would only hand the agent a tool whose
 * every call `requireScope` refuses with a 403, which it then retries and
 * rephrases. With neither `oauthScopes` nor `apiKeyScope` — the stdio server —
 * every tool is registered, and each call is decided at the route.
 *
 * `instructions` names what the credential holds (`lib/instructions.ts`). The
 * filtered list on its own leaves an agent to read a missing tool as a missing
 * feature and tell the user Currents has no webhooks.
 */
export function createMcpServer(
  context: Pick<
    RequestContext,
    'oauthScopes' | 'apiKeyScope' | 'scopesFrom'
  > = {}
): McpServer {
  const logoDataUri = getLogoDataUri();
  const server = new McpServer(
    {
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
    },
    { instructions: buildServerInstructions(context, getSkills()) }
  );

  const granted = TOOL_CATALOG.filter((entry) =>
    isToolGranted(entry.tool, context)
  );

  // Every handler goes through `reportToolCall`, so the host hears about each
  // call (`RequestContext.onToolCall`); one registered with the bare handler
  // would be served and never counted.
  for (const { name, title, description, annotations, tool } of granted) {
    server.registerTool<never, AnySchema>(
      name,
      { title, description, annotations, inputSchema: tool.schema },
      reportToolCall(name, tool.handler)
    );
  }

  // Replaces the handler the registrations above installed, which rebuilds
  // every tool's JSON Schema on each call. Same payload, computed once per
  // scope set; `lib/toolList.ts` says why, and `toolList.test.ts` checks that
  // a client gets the same list from either.
  //
  // It is the registrations that put `tools` in the server's capabilities, and
  // this throws without them. Every caller reaches at least the `'any'` tool
  // `currents-get-tests-signatures`, so `granted` is never empty.
  server.server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: listTools(granted),
  }));

  // After any handler the factory sets by hand, and it has to stay there: the
  // SDK throws when `registerPrompt` finds `prompts/get` already handled, and
  // the server is built per request, so that would be a 500 on every one. The
  // tools override above has the opposite constraint.
  registerSkills(server);

  return server;
}

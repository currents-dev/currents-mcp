import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import {
  isOrderedDateRange,
  isoDateString,
  orderedDateRangeIssue,
} from '../../lib/schema';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const SEARCH_MAX_LENGTH = 200;

/**
 * Mirrors `createSearchTextValidator` in
 * packages/api/src/api/validation/index.ts: the character check runs on the
 * raw value, the length check on the trimmed value counted in code points
 * (an emoji counts as 1).
 */
const searchText = (
  hasAllowedCharacters: (value: string) => boolean,
  message: string
) =>
  z
    .string()
    .refine(hasAllowedCharacters, { message })
    .refine(
      (value) => {
        const length = [...value.trim()].length;
        return length >= 1 && length <= SEARCH_MAX_LENGTH;
      },
      {
        message: `Expected 1 to ${SEARCH_MAX_LENGTH} characters after trimming`,
      }
    );

const paramsSchema = z.object({
  projectId: z
    .string()
    .min(1)
    .describe('The project ID to list pull requests for.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe('Maximum number of PR cards per page (default: 10, max: 50).'),
  starting_after: z
    .string()
    .optional()
    .describe('Cursor for forward pagination.'),
  ending_before: z
    .string()
    .optional()
    .describe('Cursor for backward pagination.'),
  runs_per_pr: z
    .number()
    .int()
    .min(0)
    .max(10)
    .optional()
    .describe(
      'Number of recent runs to include in each card timelinePreview (default: 1, max: 10). 0 returns an empty timelinePreview; recentRuns (up to 10 latest runs per card) are still returned.'
    ),
  tags: z
    .array(z.string())
    .optional()
    .describe('Filter by run tags (can be specified multiple times).'),
  branches: z
    .array(z.string())
    .optional()
    .describe('Filter by git branch names (can be specified multiple times).'),
  authors: z
    .array(z.string())
    .optional()
    .describe(
      'Filter by git commit author glob patterns (can be specified multiple times).'
    ),
  tag_operator: z
    .enum(['AND', 'OR'])
    .optional()
    .describe(
      'Logical operator for tag filtering. AND requires all tags (default), OR requires any tag.'
    ),
  status: z
    .array(z.enum(['PASSED', 'FAILED', 'RUNNING', 'FAILING']))
    .optional()
    .describe(
      "Filter PR cards by the status of each PR's latest run among the runs the other filters keep (can be specified multiple times)."
    ),
  completion_state: z
    .array(z.enum(['COMPLETE', 'IN_PROGRESS', 'CANCELED', 'TIMEOUT']))
    .optional()
    .describe(
      "Filter PR cards by the completion state of each PR's latest run among the runs the other filters keep (can be specified multiple times). COMPLETE: run finished normally, IN_PROGRESS: run is still executing, CANCELED: run was canceled, TIMEOUT: run timed out."
    ),
  // A refine, not a regex: a regex is published as a JSON Schema `pattern`,
  // and clients whose regex engine has no `\p{...}` support cannot compile it.
  pr_search: searchText(
    (value) => !/\p{Cc}/u.test(value),
    'Must not contain control characters'
  )
    .optional()
    .describe(
      "Find PRs by title, number or source branch, checked on each PR's latest run among the runs the other filters keep. Matches when the title or source branch contains the text (case-insensitive), or when the text is a PR number (123 or #123). Any characters except control characters; 1-200 characters after trimming."
    ),
  search: searchText(
    (value) => /^[\x20-\x7E]+$/.test(value),
    'Expected printable ASCII characters'
  )
    .optional()
    .describe(
      'Count only runs whose ciBuildId or commit message contains the text (case-insensitive). Printable ASCII only; 1-200 characters after trimming.'
    ),
  date_start: isoDateString()
    .optional()
    .describe(
      'Count only runs created on or after this date (ISO 8601 date or date-time). Without date_start and date_end, runs of the whole project history count.'
    ),
  date_end: isoDateString()
    .optional()
    .describe(
      'Count only runs created before this date (ISO 8601 date or date-time). Must not be before date_start.'
    ),
  environments: z
    .array(z.string().regex(/^[!-~]+$/))
    .optional()
    .describe(
      'Count only runs from these environments (can be specified multiple times). Printable ASCII without spaces.'
    ),
  pr_id: z
    .string()
    .min(1)
    .max(128)
    .regex(/^[!-~]+$/)
    .optional()
    .describe(
      'Count only runs of this pull request, by normalized pull request id (meta.pr.id). Printable ASCII only, max 128 characters.'
    ),
  order: z
    .enum(['last_run', 'first_run', 'run_count'])
    .optional()
    .describe(
      'Sort PR cards by last_run (creation time of the latest run, default), first_run (creation time of the oldest run) or run_count (number of runs). Only runs the filters keep count.'
    ),
  dir: z
    .enum(['asc', 'desc'])
    .optional()
    .describe(
      'Sort direction (default: desc). Keep order and dir the same across pages: a cursor returned for another order or dir is rejected.'
    ),
});

const zodSchema = paramsSchema.refine(
  ({ date_start, date_end }) =>
    date_start === undefined ||
    date_end === undefined ||
    isOrderedDateRange({ date_start, date_end }),
  orderedDateRangeIssue
);

const handler = async ({
  projectId,
  limit,
  starting_after,
  ending_before,
  runs_per_pr,
  tags,
  branches,
  authors,
  tag_operator,
  status,
  completion_state,
  pr_search,
  search,
  date_start,
  date_end,
  environments,
  pr_id,
  order,
  dir,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();

  if (limit !== undefined) {
    queryParams.append('limit', limit.toString());
  }
  if (starting_after) {
    queryParams.append('starting_after', starting_after);
  }
  if (ending_before) {
    queryParams.append('ending_before', ending_before);
  }
  if (runs_per_pr !== undefined) {
    queryParams.append('runs_per_pr', runs_per_pr.toString());
  }
  if (tags?.length) {
    tags.forEach((t) => queryParams.append('tags[]', t));
  }
  if (branches?.length) {
    branches.forEach((b) => queryParams.append('branches[]', b));
  }
  if (authors?.length) {
    authors.forEach((a) => queryParams.append('authors[]', a));
  }
  if (tag_operator) {
    queryParams.append('tag_operator', tag_operator);
  }
  if (status?.length) {
    status.forEach((s) => queryParams.append('status', s));
  }
  if (completion_state?.length) {
    completion_state.forEach((cs) =>
      queryParams.append('completion_state', cs)
    );
  }
  if (pr_search) {
    queryParams.append('pr_search', pr_search);
  }
  if (search) {
    queryParams.append('search', search);
  }
  if (date_start) {
    queryParams.append('date_start', date_start);
  }
  if (date_end) {
    queryParams.append('date_end', date_end);
  }
  if (environments?.length) {
    environments.forEach((env) => queryParams.append('environments[]', env));
  }
  if (pr_id) {
    queryParams.append('pr_id', pr_id);
  }
  if (order) {
    queryParams.append('order', order);
  }
  if (dir) {
    queryParams.append('dir', dir);
  }

  const qs = queryParams.toString();
  const path = `/projects/${encodeURIComponent(projectId)}/pull-requests${qs ? `?${qs}` : ''}`;
  // authors[] holds git commit author patterns, so the filters are logged as
  // counts instead of values.
  logger.info(
    `Fetching pull requests for project ${projectId}: filters: ${tags?.length ?? 0} tags, ${branches?.length ?? 0} branches, ${authors?.length ?? 0} authors, ${status?.length ?? 0} statuses`
  );

  const result = await fetchApi(path);
  if (!result.ok) {
    return apiFailureResult('Failed to retrieve pull requests', result);
  }

  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(result.data, null, 2) },
    ],
  };
};

export const listProjectPullRequestsTool = {
  scope: 'results:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

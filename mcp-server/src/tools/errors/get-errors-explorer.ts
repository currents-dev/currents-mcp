import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  projectId: z
    .string()
    .min(1)
    .describe('The project ID to fetch error metrics from.'),
  date_start: z.string().describe('Start date in ISO 8601 format (required).'),
  date_end: z.string().describe('End date in ISO 8601 format (required).'),
  page: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Page number (0-indexed). Defaults to 0.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of results (1-100). Defaults to 50.'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Filter by tags (can be specified multiple times).'),
  tags_logical_operator: z
    .enum(['OR', 'AND'])
    .optional()
    .describe(
      'Logical operator for tags filter: OR (match any) or AND (match all). Default: OR.'
    ),
  branches: z
    .array(z.string())
    .optional()
    .describe('Filter by branches (can be specified multiple times).'),
  groups: z
    .array(z.string())
    .optional()
    .describe('Filter by groups (can be specified multiple times).'),
  authors: z
    .array(z.string())
    .optional()
    .describe('Filter by git authors (can be specified multiple times).'),
  error_target: z
    .string()
    .optional()
    .describe('Filter by error target (e.g. CSS selector, URL).'),
  error_message: z
    .string()
    .optional()
    .describe('Filter by error message (case-insensitive partial match).'),
  error_category: z.string().optional().describe('Filter by error category.'),
  error_action: z.string().optional().describe('Filter by error action.'),
  order_by: z
    .enum(['count', 'tests', 'branches', 'error'])
    .optional()
    .describe("Field to order results by. Defaults to 'count'."),
  dir: z
    .enum(['asc', 'desc'])
    .optional()
    .describe("Sort direction. Defaults to 'desc'."),
  group_by: z
    .array(z.enum(['target', 'action', 'category', 'message']))
    .optional()
    .describe(
      'Group results by dimension (can be specified multiple times). Order matters: the first value is the primary grouping and filters out nulls for that dimension.'
    ),
  metric: z
    .enum(['occurrence', 'test', 'branch'])
    .optional()
    .describe("Metric used for timeline ranking. Defaults to 'occurrence'."),
  top_n: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe(
      'Maximum number of top errors per timeline bucket (1-50). Default: 5.'
    ),
});

const handler = async ({
  projectId,
  date_start,
  date_end,
  page = 0,
  limit = 50,
  tags,
  tags_logical_operator,
  branches,
  groups,
  authors,
  error_target,
  error_message,
  error_category,
  error_action,
  order_by,
  dir,
  group_by,
  metric,
  top_n,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append('date_start', date_start);
  queryParams.append('date_end', date_end);
  queryParams.append('page', page.toString());
  queryParams.append('limit', limit.toString());

  if (tags && tags.length > 0) {
    tags.forEach((t) => queryParams.append('tags[]', t));
  }

  if (tags_logical_operator) {
    queryParams.append('tags_logical_operator', tags_logical_operator);
  }

  if (branches && branches.length > 0) {
    branches.forEach((b) => queryParams.append('branches[]', b));
  }

  if (groups && groups.length > 0) {
    groups.forEach((g) => queryParams.append('groups[]', g));
  }

  if (authors && authors.length > 0) {
    authors.forEach((a) => queryParams.append('authors[]', a));
  }

  if (error_target) {
    queryParams.append('error_target', error_target);
  }

  if (error_message) {
    queryParams.append('error_message', error_message);
  }

  if (error_category) {
    queryParams.append('error_category', error_category);
  }

  if (error_action) {
    queryParams.append('error_action', error_action);
  }

  if (order_by) {
    queryParams.append('order_by', order_by);
  }

  if (dir) {
    queryParams.append('dir', dir);
  }

  if (group_by && group_by.length > 0) {
    group_by.forEach((g) => queryParams.append('group_by[]', g));
  }

  if (metric) {
    queryParams.append('metric', metric);
  }

  if (top_n !== undefined) {
    queryParams.append('top_n', top_n.toString());
  }

  // authors[] holds git commit author addresses, so the filters are logged as
  // counts instead of values.
  logger.info(
    `Fetching errors explorer for project ${projectId}: ${date_start} to ${date_end}, filters: ${tags?.length ?? 0} tags, ${branches?.length ?? 0} branches, ${groups?.length ?? 0} groups, ${authors?.length ?? 0} authors`
  );

  const result = await fetchApi(
    `/errors/${encodeURIComponent(projectId)}?${queryParams.toString()}`
  );

  if (!result.ok) {
    return apiFailureResult('Failed to retrieve errors explorer data', result);
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result.data, null, 2),
      },
    ],
  };
};

export const getErrorsExplorerTool = {
  scope: 'analytics:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

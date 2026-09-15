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

const zodSchema = z
  .object({
    projectId: z.string().min(1).describe('The project ID.'),
    signature: z
      .string()
      .min(1)
      .describe('The test signature hash to fetch affected executions for.'),
    date_start: isoDateString().describe(
      'Start date in ISO 8601 format (required).'
    ),
    date_end: isoDateString().describe(
      'End date in ISO 8601 format (required).'
    ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Maximum number of executions (1-50). Defaults to 25.'),
    starting_after: z
      .string()
      .optional()
      .describe(
        'Cursor for pagination. Returns items after this cursor value.'
      ),
    ending_before: z
      .string()
      .optional()
      .describe(
        'Cursor for pagination. Returns items before this cursor value.'
      ),
    search: z
      .string()
      .max(100)
      .optional()
      .describe('Search by action name (case-insensitive).'),
  })
  .refine(isOrderedDateRange, orderedDateRangeIssue);

const handler = async ({
  projectId,
  signature,
  date_start,
  date_end,
  limit = 25,
  starting_after,
  ending_before,
  search,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append('projectId', projectId);
  queryParams.append('date_start', date_start);
  queryParams.append('date_end', date_end);
  queryParams.append('limit', limit.toString());

  if (starting_after) {
    queryParams.append('starting_after', starting_after);
  }

  if (ending_before) {
    queryParams.append('ending_before', ending_before);
  }

  if (search) {
    queryParams.append('search', search);
  }

  logger.info(
    `Fetching affected test executions for project ${projectId}, signature ${signature} with query params: ${queryParams.toString()}`
  );

  const result = await fetchApi(
    `/actions/tests/${encodeURIComponent(signature)}?${queryParams.toString()}`
  );

  if (!result.ok) {
    return apiFailureResult(
      'Failed to retrieve affected test executions',
      result
    );
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

export const getAffectedTestExecutionsTool = {
  scope: 'actions:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

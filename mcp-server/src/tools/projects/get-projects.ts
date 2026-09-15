import { z } from 'zod';
import { fetchApi, fetchCursorBasedPaginatedApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of items to return (default: 10, max: 100).'),
  starting_after: z
    .string()
    .optional()
    .describe('Cursor for pagination. Returns items after this cursor value.'),
  ending_before: z
    .string()
    .optional()
    .describe('Cursor for pagination. Returns items before this cursor value.'),
  fetchAll: z
    .boolean()
    .optional()
    .describe(
      'If true, walks the pages automatically and returns up to 1000 projects. Starts after starting_after when it is set, so a list that came back marked incomplete can be continued. Ignores limit and ending_before.'
    ),
});

const handler = async ({
  limit,
  starting_after,
  ending_before,
  fetchAll = false,
}: z.infer<typeof zodSchema>) => {
  // If fetchAll is true, use the automatic pagination
  if (fetchAll) {
    logger.info('Fetching all projects with automatic pagination');
    const result = await fetchCursorBasedPaginatedApi(
      '/projects',
      starting_after
    );

    if (!result.ok) {
      return apiFailureResult('Failed to retrieve projects', result);
    }

    const { items, truncated } = result.data;
    return {
      content: [
        {
          type: 'text' as const,
          // The marker goes ahead of the list, not after it: a caller reading a
          // thousand serialized projects has decided what the list says long
          // before it reaches a trailing note saying the list is partial.
          text: [truncated, JSON.stringify(items, null, 2)]
            .filter(Boolean)
            .join('\n\n'),
        },
      ],
    };
  }

  // Otherwise, use manual pagination with parameters
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

  const queryString = queryParams.toString();
  const path = queryString ? `/projects?${queryString}` : '/projects';

  logger.info(`Fetching projects with query params: ${queryString}`);

  const result = await fetchApi(path);

  if (!result.ok) {
    return apiFailureResult('Failed to retrieve projects', result);
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

export const getProjectsTool = {
  scope: 'projects:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

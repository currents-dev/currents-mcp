import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  projectId: z
    .string()
    .min(1)
    .describe('The project ID to fetch actions from.'),
  status: z
    .array(z.enum(['active', 'disabled', 'archived', 'expired']))
    .optional()
    .describe('Filter actions by status (can be specified multiple times).'),
  search: z.string().max(100).optional().describe('Search actions by name.'),
});

const handler = async ({
  projectId,
  status,
  search,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append('projectId', projectId);

  if (status && status.length > 0) {
    status.forEach((s) => queryParams.append('status', s));
  }

  if (search) {
    queryParams.append('search', search);
  }

  logger.info(
    `Fetching actions for project ${projectId} with query params: ${queryParams.toString()}`
  );

  const result = await fetchApi(`/actions?${queryParams.toString()}`);

  if (!result.ok) {
    return apiFailureResult('Failed to retrieve actions', result);
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

export const listActionsTool = {
  scope: 'actions:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

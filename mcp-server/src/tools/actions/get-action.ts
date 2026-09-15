import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  actionId: z.string().min(1).describe('The action ID to fetch.'),
});

const handler = async ({ actionId }: z.infer<typeof zodSchema>) => {
  logger.info(`Fetching action ${actionId}`);

  const result = await fetchApi(`/actions/${encodeURIComponent(actionId)}`);

  if (!result.ok) {
    return apiFailureResult('Failed to retrieve action', result);
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

export const getActionTool = {
  scope: 'actions:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

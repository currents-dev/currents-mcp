import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  projectId: z
    .string()
    .min(1)
    .describe('The project ID to fetch webhooks from.'),
});

const handler = async ({ projectId }: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append('projectId', projectId);

  logger.info(`Fetching webhooks for project ${projectId}`);

  const result = await fetchApi(`/webhooks?${queryParams.toString()}`);

  if (!result.ok) {
    return apiFailureResult('Failed to retrieve webhooks', result);
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

export const listWebhooksTool = {
  scope: 'webhooks:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

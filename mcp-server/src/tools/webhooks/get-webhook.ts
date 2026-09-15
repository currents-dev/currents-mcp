import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { uuidV4 } from '../../lib/schema';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  hookId: uuidV4().describe('The webhook ID (UUID).'),
});

const handler = async ({ hookId }: z.infer<typeof zodSchema>) => {
  logger.info(`Fetching webhook ${hookId}`);

  const result = await fetchApi(`/webhooks/${encodeURIComponent(hookId)}`);

  if (!result.ok) {
    return apiFailureResult('Failed to retrieve webhook', result);
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

export const getWebhookTool = {
  scope: 'webhooks:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

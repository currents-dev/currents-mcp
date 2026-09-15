import { z } from 'zod';
import { deleteApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { uuidV4 } from '../../lib/schema';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  hookId: uuidV4().describe('The webhook ID (UUID).'),
});

const handler = async ({ hookId }: z.infer<typeof zodSchema>) => {
  logger.info(`Deleting webhook ${hookId}`);

  const result = await deleteApi(`/webhooks/${encodeURIComponent(hookId)}`);

  if (!result.ok) {
    return apiFailureResult('Failed to delete webhook', result);
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

export const deleteWebhookTool = {
  scope: 'webhooks:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

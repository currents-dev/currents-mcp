import { z } from 'zod';
import { putApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  actionId: z.string().min(1).describe('The action ID to enable.'),
});

const handler = async ({ actionId }: z.infer<typeof zodSchema>) => {
  logger.info(`Enabling action ${actionId}`);

  const result = await putApi(
    `/actions/${encodeURIComponent(actionId)}/enable`
  );

  if (!result.ok) {
    return apiFailureResult('Failed to enable action', result);
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

export const enableActionTool = {
  scope: 'actions:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

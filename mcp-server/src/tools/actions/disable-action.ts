import { z } from 'zod';
import { putApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  actionId: z.string().min(1).describe('The action ID to disable.'),
});

const handler = async ({ actionId }: z.infer<typeof zodSchema>) => {
  logger.info(`Disabling action ${actionId}`);

  const result = await putApi(
    `/actions/${encodeURIComponent(actionId)}/disable`
  );

  if (!result.ok) {
    return apiFailureResult('Failed to disable action', result);
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

export const disableActionTool = {
  scope: 'actions:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

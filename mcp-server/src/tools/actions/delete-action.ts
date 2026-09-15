import { z } from 'zod';
import { deleteApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  actionId: z.string().min(1).describe('The action ID to delete (archive).'),
});

const handler = async ({ actionId }: z.infer<typeof zodSchema>) => {
  logger.info(`Deleting (archiving) action ${actionId}`);

  const result = await deleteApi(`/actions/${encodeURIComponent(actionId)}`);

  if (!result.ok) {
    return apiFailureResult('Failed to delete action', result);
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

export const deleteActionTool = {
  scope: 'actions:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

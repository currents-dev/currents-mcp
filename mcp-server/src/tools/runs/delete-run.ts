import { z } from 'zod';
import { deleteApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  runId: z.string().min(1).describe('The run ID to delete.'),
});

const handler = async ({ runId }: z.infer<typeof zodSchema>) => {
  logger.info(`Deleting run ${runId}`);

  const result = await deleteApi(`/runs/${encodeURIComponent(runId)}`);

  if (!result.ok) {
    return apiFailureResult('Failed to delete run', result);
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

export const deleteRunTool = {
  scope: 'runs:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

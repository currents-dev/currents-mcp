import { z } from 'zod';
import { putApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  runId: z.string().min(1).describe('The run ID to cancel.'),
});

const handler = async ({ runId }: z.infer<typeof zodSchema>) => {
  logger.info(`Cancelling run ${runId}`);

  const result = await putApi(`/runs/${encodeURIComponent(runId)}/cancel`);

  if (!result.ok) {
    return apiFailureResult('Failed to cancel run', result);
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

export const cancelRunTool = {
  scope: 'runs:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

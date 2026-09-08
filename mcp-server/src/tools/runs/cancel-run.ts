import { z } from 'zod';
import { putApi } from '../../lib/request';
import { logger } from '../../lib/logger';

const zodSchema = z.object({
  runId: z.string().describe('The run ID to cancel.'),
});

const handler = async ({ runId }: z.infer<typeof zodSchema>) => {
  logger.info(`Cancelling run ${runId}`);

  const data = await putApi(`/runs/${runId}/cancel`);

  if (!data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Failed to cancel run',
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
};

export const cancelRunTool = {
  schema: zodSchema,
  handler,
};

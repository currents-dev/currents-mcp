import { z } from 'zod';
import { putApi } from '../../lib/request';
import { logger } from '../../lib/logger';

const zodSchema = z.object({
  actionId: z.string().describe('The action ID to enable.'),
});

const handler = async ({ actionId }: z.infer<typeof zodSchema>) => {
  logger.info(`Enabling action ${actionId}`);

  const data = await putApi(`/actions/${actionId}/enable`);

  if (!data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Failed to enable action',
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

export const enableActionTool = {
  schema: zodSchema,
  handler,
};

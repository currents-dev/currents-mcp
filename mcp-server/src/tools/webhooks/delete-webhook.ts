import { z } from 'zod';
import { deleteApi } from '../../lib/request';
import { logger } from '../../lib/logger';

const zodSchema = z.object({
  hookId: z.string().describe('The webhook ID (UUID).'),
});

const handler = async ({ hookId }: z.infer<typeof zodSchema>) => {
  logger.info(`Deleting webhook ${hookId}`);

  const data = await deleteApi(`/webhooks/${hookId}`);

  if (!data) {
    return {
      content: [
        {
          type: 'text' as const,
          text: 'Failed to delete webhook',
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

export const deleteWebhookTool = {
  schema: zodSchema,
  handler,
};

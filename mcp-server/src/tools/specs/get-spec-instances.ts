import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  instanceId: z
    .string()
    .min(1)
    .describe('The instance ID to fetch debugging data from.'),
});

const handler = async ({ instanceId }: z.infer<typeof zodSchema>) => {
  const result = await fetchApi(`/instances/${encodeURIComponent(instanceId)}`);

  if (!result.ok) {
    return apiFailureResult('Failed to retrieve spec file instances', result);
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

export const getSpecInstancesTool = {
  scope: 'results:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

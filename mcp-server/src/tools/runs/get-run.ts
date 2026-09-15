import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  runId: z.string().min(1).describe('The run ID to fetch details for.'),
});

const handler = async ({ runId }: z.infer<typeof zodSchema>) => {
  const result = await fetchApi(`/runs/${encodeURIComponent(runId)}`);

  if (!result.ok) {
    return apiFailureResult('Failed to retrieve run data', result);
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

export const getRunDetailsTool = {
  scope: 'results:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

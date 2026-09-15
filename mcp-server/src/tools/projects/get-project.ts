import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  projectId: z.string().min(1).describe('The project ID to fetch details for.'),
});

const handler = async ({ projectId }: z.infer<typeof zodSchema>) => {
  logger.info(`Fetching project ${projectId}`);

  const result = await fetchApi(`/projects/${encodeURIComponent(projectId)}`);

  if (!result.ok) {
    return apiFailureResult('Failed to retrieve project', result);
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

export const getProjectTool = {
  scope: 'projects:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

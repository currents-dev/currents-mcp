import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  projectId: z
    .string()
    .min(1)
    .describe('The project ID to search for runs in.'),
  ciBuildId: z
    .string()
    .optional()
    .describe(
      'The CI build ID. If provided, returns the run with this exact ciBuildId.'
    ),
  branch: z
    .string()
    .optional()
    .describe(
      'Git branch name. Applies only when ciBuildId is not provided — the API matches on ciBuildId alone when both are given.'
    ),
  tags: z
    .array(z.string())
    .optional()
    .describe('Run tags to filter by (can be specified multiple times).'),
  pwLastRun: z
    .boolean()
    .optional()
    .describe(
      'If true, includes information about failed tests from the last run (Playwright only).'
    ),
});

const handler = async ({
  projectId,
  ciBuildId,
  branch,
  tags,
  pwLastRun,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append('projectId', projectId);

  if (ciBuildId) {
    queryParams.append('ciBuildId', ciBuildId);
  }

  if (branch) {
    queryParams.append('branch', branch);
  }

  if (tags && tags.length > 0) {
    tags.forEach((t) => queryParams.append('tags[]', t));
  }

  if (pwLastRun !== undefined) {
    queryParams.append('pwLastRun', pwLastRun.toString());
  }

  logger.info(`Finding run with query params: ${queryParams.toString()}`);

  const result = await fetchApi(`/runs/find?${queryParams.toString()}`);

  if (!result.ok) {
    return apiFailureResult('Failed to find run', result);
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

export const findRunTool = {
  scope: 'results:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

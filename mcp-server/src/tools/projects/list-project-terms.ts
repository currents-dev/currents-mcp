import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const termTypeEnum = z.enum([
  'tag',
  'group',
  'branch',
  'authorName',
  'authorEmail',
  'framework',
  'frameworkVersion',
  'clientVersion',
  'ann_type',
  'ann_desc',
]);

const zodSchema = z.object({
  projectId: z.string().min(1).describe('The project ID.'),
  termType: termTypeEnum.describe(
    'Term kind to list: tag, group, branch, authorName, authorEmail, framework, frameworkVersion, clientVersion, ann_type, or ann_desc.'
  ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum items per page (default: 100, max: 100).'),
  dir: z
    .enum(['asc', 'desc'])
    .optional()
    .describe('Sort direction by last update time (default: desc).'),
  starting_after: z
    .string()
    .optional()
    .describe('Cursor for forward pagination.'),
  ending_before: z
    .string()
    .optional()
    .describe('Cursor for backward pagination.'),
  search: z
    .string()
    .max(128)
    .optional()
    .describe('Case-insensitive search filter for term values.'),
});

const handler = async ({
  projectId,
  termType,
  limit,
  dir,
  starting_after,
  ending_before,
  search,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();

  if (limit !== undefined) {
    queryParams.append('limit', limit.toString());
  }
  if (dir) {
    queryParams.append('dir', dir);
  }
  if (starting_after) {
    queryParams.append('starting_after', starting_after);
  }
  if (ending_before) {
    queryParams.append('ending_before', ending_before);
  }
  if (search) {
    queryParams.append('search', search);
  }

  const qs = queryParams.toString();
  const path = `/projects/${encodeURIComponent(projectId)}/terms/${encodeURIComponent(termType)}${qs ? `?${qs}` : ''}`;
  logger.info(`Fetching project terms: ${path}`);

  const result = await fetchApi(path);
  if (!result.ok) {
    return apiFailureResult('Failed to retrieve project terms', result);
  }

  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(result.data, null, 2) },
    ],
  };
};

export const listProjectTermsTool = {
  scope: 'projects:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

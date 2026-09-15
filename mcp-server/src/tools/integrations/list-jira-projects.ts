import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  jira_installation_id: z
    .string()
    .min(1)
    .describe('Jira installation ID for the organization integration.'),
  search: z
    .string()
    .optional()
    .describe('Search Jira projects by name or key.'),
  page: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Page number for discovery results (default: 0).'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum projects per page (default: 50, max: 100).'),
});

const handler = async ({
  jira_installation_id,
  search,
  page,
  limit,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append('jira_installation_id', jira_installation_id);
  if (search) {
    queryParams.append('search', search);
  }
  if (page !== undefined) {
    queryParams.append('page', page.toString());
  }
  if (limit !== undefined) {
    queryParams.append('limit', limit.toString());
  }

  const path = `/integrations/jira/projects?${queryParams.toString()}`;
  logger.info(`Listing Jira projects: ${path}`);

  const result = await fetchApi(path);
  if (!result.ok) {
    return apiFailureResult('Failed to list Jira projects', result);
  }

  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(result.data, null, 2) },
    ],
  };
};

export const listJiraProjectsTool = {
  scope: 'issues:write',
  // The route kept taking read keys when it moved to `issues:write`
  // (`packages/api/src/api/integrations/jira/index.ts`).
  apiKeyScope: 'read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

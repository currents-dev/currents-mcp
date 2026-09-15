import { z } from 'zod';
import { fetchApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.object({
  signature: z.string().min(1).describe('The test signature.'),
  date_start: z.string().describe('Start date in ISO 8601 format (required).'),
  date_end: z.string().describe('End date in ISO 8601 format (required).'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of items to return (default: 10, max: 100).'),
  starting_after: z
    .string()
    .optional()
    .describe('Cursor for pagination. Returns items after this cursor value.'),
  ending_before: z
    .string()
    .optional()
    .describe('Cursor for pagination. Returns items before this cursor value.'),
  branches: z
    .array(z.string())
    .optional()
    .describe('Filter by git branches (can be specified multiple times).'),
  tags: z
    .array(z.string())
    .optional()
    .describe('Filter by run tags (can be specified multiple times).'),
  authors: z
    .array(z.string())
    .optional()
    .describe('Filter by git authors (can be specified multiple times).'),
  status: z
    .array(z.enum(['passed', 'failed', 'pending', 'skipped']))
    .optional()
    .describe('Filter by test status (can be specified multiple times).'),
  groups: z
    .array(z.string())
    .optional()
    .describe('Filter by run groups (can be specified multiple times).'),
  flaky: z
    .boolean()
    .optional()
    .describe(
      'Filter by flaky status. When true, returns only flaky tests. When false, returns only non-flaky tests. When omitted, returns all tests regardless of flaky status.'
    ),
  annotations: z
    .string()
    .optional()
    .describe(
      'Filter by test annotations. JSON-stringified array of objects: [{\"type\": \"string\", \"description\": \"string\" | [\"string\"] or null}]. Omit description or set to null to match any value for that annotation type.'
    ),
});

const handler = async ({
  signature,
  date_start,
  date_end,
  limit = 10,
  starting_after,
  ending_before,
  branches,
  tags,
  authors,
  status,
  groups,
  flaky,
  annotations,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append('date_start', date_start);
  queryParams.append('date_end', date_end);
  queryParams.append('limit', limit.toString());

  if (starting_after) {
    queryParams.append('starting_after', starting_after);
  }

  if (ending_before) {
    queryParams.append('ending_before', ending_before);
  }

  if (branches && branches.length > 0) {
    branches.forEach((b) => queryParams.append('branches[]', b));
  }

  if (tags && tags.length > 0) {
    tags.forEach((t) => queryParams.append('tags[]', t));
  }

  if (authors && authors.length > 0) {
    authors.forEach((a) => queryParams.append('authors[]', a));
  }

  if (status && status.length > 0) {
    status.forEach((s) => queryParams.append('status[]', s));
  }

  if (groups && groups.length > 0) {
    groups.forEach((g) => queryParams.append('groups[]', g));
  }

  if (flaky !== undefined) {
    queryParams.append('flaky', flaky.toString());
  }

  if (annotations) {
    queryParams.append('annotations', annotations);
  }

  // authors[] holds git commit author addresses, so the filters are logged as
  // counts instead of values.
  logger.info(
    `Fetching test results for test ${signature}: ${date_start} to ${date_end}, filters: ${tags?.length ?? 0} tags, ${branches?.length ?? 0} branches, ${groups?.length ?? 0} groups, ${authors?.length ?? 0} authors`
  );

  const result = await fetchApi(
    `/test-results/${encodeURIComponent(signature)}?${queryParams.toString()}`
  );

  if (!result.ok) {
    return apiFailureResult('Failed to retrieve test results', result);
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

export const getTestResultsTool = {
  scope: 'results:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

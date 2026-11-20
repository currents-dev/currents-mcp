import { z } from 'zod';
import { postApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import { logger } from '../../lib/logger';
import type { McpTool } from '../../lib/tool';

const idList = (description: string) =>
  z.array(z.string().min(1)).min(1).max(500).describe(description);

const zodSchema = z
  .object({
    projectId: z.string().min(1).describe('Currents project ID.'),
    signatures: idList(
      'Test signatures to look up. Send this, or runId with testIds.'
    ).optional(),
    runId: z
      .string()
      .min(1)
      .optional()
      .describe('Run the testIds belong to. Send with testIds.'),
    testIds: idList(
      'Test IDs within runId, as currents-get-run-details and currents-get-context return them.'
    ).optional(),
    includeDetails: z
      .boolean()
      .optional()
      .describe(
        'When true (default), each ticket carries its current title, status and assignee, read from Jira or Linear. Set false when you only need to know whether a test has a ticket; it skips those calls and is faster.'
      ),
    page: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Page index, 0-based (default 0). Send the same tests with the next page until nextPage is false.'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe('Tests per page, 1 to 50 (default 25).'),
  })
  .superRefine((val, ctx) => {
    const byRun = val.runId !== undefined || val.testIds !== undefined;
    if (val.signatures && byRun) {
      ctx.addIssue({
        code: 'custom',
        message: 'Send either signatures or runId with testIds, not both',
        path: ['signatures'],
      });
    } else if (!val.signatures && !byRun) {
      ctx.addIssue({
        code: 'custom',
        message: 'Send signatures, or runId with testIds',
        path: ['signatures'],
      });
    } else if (byRun && (!val.runId || !val.testIds)) {
      ctx.addIssue({
        code: 'custom',
        message: 'runId and testIds must be sent together',
        path: [val.runId ? 'testIds' : 'runId'],
      });
    }
  });

const handler = async ({
  projectId,
  signatures,
  runId,
  testIds,
  includeDetails,
  page,
  limit,
}: z.infer<typeof zodSchema>) => {
  const body: Record<string, unknown> = signatures
    ? { signatures }
    : { runId, testIds };
  if (includeDetails !== undefined) {
    body.includeDetails = includeDetails;
  }
  if (page !== undefined) {
    body.page = page;
  }
  if (limit !== undefined) {
    body.limit = limit;
  }

  const path = `/projects/${encodeURIComponent(projectId)}/test-issues`;
  logger.info(`Listing linked tickets: ${path}`);

  const result = await postApi(path, body);
  if (!result.ok) {
    // A POST only because the list of tests does not fit in a query string.
    // A repeat reads the same tickets again; the stored ticket keys it may
    // update are set to the same values the second time.
    return apiFailureResult('Failed to list linked tickets', result, {
      safeToRepeat: true,
    });
  }

  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(result.data, null, 2) },
    ],
  };
};

export const listTestIssuesTool = {
  scope: 'results:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

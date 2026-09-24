import { z } from 'zod';
import { logger } from '../../lib/logger';
import { postApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import type { McpTool } from '../../lib/tool';

const zodSchema = z
  .object({
    purpose: z
      .enum(['fix', 'report'])
      .describe(
        '"fix": the failure context — errors, steps and files of the failed and flaky tests — for an agent that will fix them; the same content as currents-get-context. "report": every test with its attempts, statuses and file links, for a person.'
      ),
    run_id: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'Run identifier. Share a run with run_id alone, or a spec file with run_id + instance_id.'
      ),
    instance_id: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'Instance (spec file) identifier. Required for a spec file (with run_id) or a single test (with test_id).'
      ),
    test_id: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe('Test identifier. Shares a single test; requires instance_id.'),
    attempt: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'purpose "fix" and a single test only: the attempt (0-indexed). Defaults to the last attempt that failed.'
      ),
    expires_in_days: z
      .union([z.literal(1), z.literal(3), z.literal(7)])
      .optional()
      .describe(
        'How long the link works: 1, 3 or 7 days. Defaults to 1 for "fix" and 7 for "report".'
      ),
  })
  .superRefine((val, ctx) => {
    if (val.test_id && !val.instance_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'test_id requires instance_id',
        path: ['instance_id'],
      });
    }
    if (val.instance_id && !val.run_id && !val.test_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'instance_id requires run_id (spec file) or test_id (test)',
        path: ['run_id'],
      });
    }
    if (!val.run_id && !val.instance_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'provide run_id (run), run_id + instance_id (spec file), or instance_id + test_id (test)',
        path: ['run_id'],
      });
    }
    if (val.attempt !== undefined && !(val.instance_id && val.test_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'attempt requires a single test (instance_id + test_id)',
        path: ['attempt'],
      });
    }
    if (val.attempt !== undefined && val.purpose === 'report') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'attempt is only valid with purpose "fix"',
        path: ['attempt'],
      });
    }
  });

const handler = async ({
  purpose,
  run_id,
  instance_id,
  test_id,
  attempt,
  expires_in_days,
}: z.infer<typeof zodSchema>) => {
  logger.info(`Creating a ${purpose} share link`);

  const result = await postApi<unknown, Record<string, unknown>>('/share', {
    purpose,
    runId: run_id,
    instanceId: instance_id,
    testId: test_id,
    attempt,
    expiresInDays: expires_in_days,
  });

  if (!result.ok) {
    return apiFailureResult('Failed to create the share link', result);
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

export const createShareLinkTool = {
  scope: 'shares:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

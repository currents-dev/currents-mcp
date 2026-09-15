import { z } from 'zod';
import { logger } from '../../lib/logger';
import type { ApiFailure } from '../../lib/request';
import {
  apiHeaders,
  callApiWithRetries,
  failureFromBrokenBody,
  failureFromError,
  failureFromResponse,
  logApiFailure,
  parseBody,
} from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import type { McpTool } from '../../lib/tool';

const zodSchema = z
  .object({
    run_id: z
      .string()
      .optional()
      .describe(
        'Run identifier. Required for run-level (run_id only) and instance-level (run_id + instance_id, no test_id). Omit for test-level (instance_id + test_id).'
      ),
    instance_id: z
      .string()
      .optional()
      .describe(
        'Instance identifier. Required for instance-level and test-level. Omit for run-level (use run_id only).'
      ),
    test_id: z
      .string()
      .optional()
      .describe(
        'Test identifier. When set, selects test-level detail and requires instance_id. run_id is not required in this case.'
      ),
    attempt: z
      .number()
      .int()
      .optional()
      .describe('Attempt number (0-indexed); defaults to latest.'),
    format: z
      .enum(['json', 'md'])
      .optional()
      .describe(
        'Response format. Falls back to Accept header when absent. Defaults to json.'
      ),
    detail: z
      .enum(['default', 'compact', 'summary'])
      .optional()
      .describe(
        'Controls output verbosity. default returns all available data; compact omits full steps and limits assets; summary minimizes output. Defaults to default.'
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .describe(
        'Maximum number of failed tests per page (run-level and instance-level only). Default 10.'
      ),
    page: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Page number for failed tests pagination, 0-indexed (run-level and instance-level only). Default 0.'
      ),
    max_length: z
      .number()
      .int()
      .min(1)
      .max(50000)
      .optional()
      .describe(
        'Truncate markdown response to this character limit (only applies when format=md).'
      ),
  })
  .superRefine((val, ctx) => {
    const { run_id, instance_id, test_id } = val;
    if (test_id) {
      if (!instance_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'test_id requires instance_id',
          path: ['instance_id'],
        });
      }
      return;
    }
    if (instance_id) {
      if (!run_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'instance-level context requires run_id when test_id is omitted',
          path: ['run_id'],
        });
      }
      return;
    }
    if (!run_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'run-level context requires run_id',
        path: ['run_id'],
      });
    }
  });

const handler = async (args: z.infer<typeof zodSchema>) => {
  const parsed = zodSchema.safeParse(args);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'input'}: ${i.message}`)
      .join('; ');
    return {
      content: [
        {
          type: 'text' as const,
          text: `Invalid parameters: ${message}`,
        },
      ],
    };
  }

  const {
    run_id,
    instance_id,
    test_id,
    attempt,
    format = 'json',
    detail = 'default',
    limit = 10,
    page = 0,
    max_length,
  } = parsed.data;

  const queryParams = new URLSearchParams();
  if (run_id) queryParams.append('run_id', run_id);
  if (instance_id) queryParams.append('instance_id', instance_id);
  if (test_id) queryParams.append('test_id', test_id);
  if (attempt !== undefined) queryParams.append('attempt', attempt.toString());
  queryParams.append('format', format);
  queryParams.append('detail', detail);
  queryParams.append('limit', limit.toString());
  queryParams.append('page', page.toString());
  if (max_length !== undefined) {
    queryParams.append('max_length', max_length.toString());
  }

  const headers = apiHeaders(
    format === 'md'
      ? 'text/markdown, application/json;q=0.1'
      : 'application/json'
  );

  const path = `/context?${queryParams.toString()}`;
  logger.info(`Fetching failure context: ${path}`);

  const refused = (failure: ApiFailure) => {
    logApiFailure(failure);
    return apiFailureResult('Failed to retrieve context', failure);
  };

  // `callApiWithRetries` rather than `fetchApi`: this tool asks the API for
  // markdown, and the verb helpers read every body as JSON. The retry is the
  // one thing it does want from them — this is a read, and the call an agent
  // makes most.
  let read: Awaited<ReturnType<typeof callApiWithRetries>>;
  try {
    read = await callApiWithRetries({ method: 'GET', path, headers });
  } catch (error: unknown) {
    return refused(failureFromError('GET', path, error));
  }

  const { response } = read;
  // A body that broke after the headers arrived, reported with the status the
  // response did carry.
  if ('bodyError' in read) {
    return refused(
      failureFromBrokenBody('GET', path, response, read.bodyError)
    );
  }

  if (!response.ok) {
    return refused(
      failureFromResponse('GET', path, response, parseBody(read.text))
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    // `parseBody` rather than `JSON.parse`: an empty body is an empty document
    // here, where a parse would throw and report a 200 as unreadable.
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(parseBody(read.text) ?? {}, null, 2),
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: read.text,
      },
    ],
  };
};

export const getContextTool = {
  scope: 'results:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

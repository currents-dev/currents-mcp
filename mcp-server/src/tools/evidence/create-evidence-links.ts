import { z } from 'zod';
import { postApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import type { McpTool } from '../../lib/tool';

const zodSchema = z
  .object({
    sessionId: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'A session recorded with currents-create-session. Send it with attachmentId instead of instanceId and testId.'
      ),
    attachmentId: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'The trace attachment of the session, from the response of currents-create-session or currents-add-attachments.'
      ),
    instanceId: z
      .string()
      .min(1)
      .optional()
      .describe(
        'CI runs: the spec file instance the test ran in. From currents-get-run-details or currents-get-test-evidence.'
      ),
    testId: z
      .string()
      .min(1)
      .optional()
      .describe(
        'CI runs: the test to serve the trace of, as reported on the instance. From currents-get-spec-instance or currents-get-test-evidence.'
      ),
    attemptIndex: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Which attempt. Defaults to the highest attempt that has a trace, which is the last one that ran.'
      ),
    artifactName: z
      .string()
      .min(1)
      .max(1024)
      .optional()
      .describe(
        'Selects one of several traces recorded for the attempt by name. Also matches a trace uploaded as a named attachment.'
      ),
    ttlSeconds: z
      .number()
      .int()
      .min(60)
      .max(7 * 24 * 60 * 60)
      .optional()
      .describe(
        'How long the link stays readable. Default 24 hours, max 7 days.'
      ),
  })
  .superRefine((value, ctx) => {
    const forSession = value.sessionId || value.attachmentId;
    if (forSession && (value.instanceId || value.testId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'send sessionId and attachmentId, or instanceId and testId',
        path: ['sessionId'],
      });
    } else if (forSession) {
      if (!value.sessionId || !value.attachmentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'a session needs both sessionId and attachmentId',
          path: [value.sessionId ? 'attachmentId' : 'sessionId'],
        });
      }
      if (value.attemptIndex !== undefined || value.artifactName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'attemptIndex and artifactName are for CI tests',
          path: ['attemptIndex'],
        });
      }
    } else if (!value.instanceId || !value.testId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'send instanceId and testId, or sessionId and attachmentId',
        path: ['instanceId'],
      });
    }
  });

type TraceLinkData = {
  url: string;
  expiresAt: string;
  testId?: string;
  attemptIndex?: number;
  attachmentId?: string;
};

/**
 * The trace API's routes under the link. Written out rather than fetched: the
 * agent needs them in the same answer as the link.
 *
 * Only the parameters that change what comes back are set — the worker's own
 * defaults would be a second copy of its constants here, and nothing would
 * catch them drifting apart. `docs` is its self-served table.
 *
 * `frames` is the timeline metadata; an image is `frames/{t}`, which needs a
 * timestamp from that list.
 */
const traceEndpoints = (url: string) => ({
  digest: `${url}/digest?format=md`,
  download: `${url}/download`,
  filmstrip: `${url}/filmstrip`,
  animation: `${url}/animation`,
  frames: `${url}/frames`,
  snapshots: `${url}/snapshots`,
  requests: `${url}/requests?status=failed`,
  attachments: `${url}/attachments`,
  player: url,
});

const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const handler = async ({
  instanceId,
  sessionId,
  attachmentId,
  ...body
}: z.infer<typeof zodSchema>) => {
  const result = sessionId
    ? await postApi<{ data?: TraceLinkData }, object>(
        `/sessions/${encodeURIComponent(sessionId)}/attachments/${encodeURIComponent(attachmentId!)}/trace-link`,
        { ttlSeconds: body.ttlSeconds }
      )
    : await postApi<{ data?: TraceLinkData }, typeof body>(
        `/instances/${encodeURIComponent(instanceId!)}/trace-link`,
        body
      );

  if (!result.ok) {
    return apiFailureResult('Failed to create the evidence links', result);
  }

  const data = result.data?.data;
  // `origin` rather than the URL alone: a base URL configured without a scheme
  // concatenates into something the route still answers 200 for, and throwing
  // here would reach the caller as a JSON-RPC internal error instead of a
  // result it can read.
  const origin = data?.url && originOf(data.url);
  if (!data?.url || !origin) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: `The link was created but its URL cannot be used: ${
            data?.url ?? 'the response carried none'
          }`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            ...data,
            ...traceEndpoints(data.url),
            docs: `${origin}/docs`,
            note: 'Start with the digest. The link needs no Currents credential and stops working at expiresAt.',
          },
          null,
          2
        ),
      },
    ],
  };
};

export const createEvidenceLinksTool = {
  scope: 'results:read',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

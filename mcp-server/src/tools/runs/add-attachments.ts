import { z } from 'zod';
import {
  attachmentSchema,
  type RunFileType,
  sessionTraceLinkStep,
  traceLinkStep,
  uploadStep,
} from '../../lib/runFiles';
import { postApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import type { McpTool } from '../../lib/tool';

const RUN_TARGET_FIELDS = [
  'instanceId',
  'spec',
  'groupId',
  'testId',
  'testTitle',
  'attempt',
  'machineId',
] as const;

/** The API's rule for which target fields go together (`targetProblem` in attachments.validation.ts). */
const runTargetProblem = (t: {
  instanceId?: string;
  spec?: string;
  testId?: string;
  testTitle?: string;
  attempt?: number;
}): string | null => {
  const hasInstance = !!(t.instanceId || t.spec);
  const hasTest = !!(t.testId || t.testTitle);
  if (t.instanceId && t.spec) {
    return 'send instanceId or spec, not both';
  }
  if (t.testId && t.testTitle) {
    return 'send testId or testTitle, not both';
  }
  if (hasTest && !hasInstance) {
    return 'a test needs an instanceId or a spec';
  }
  if (t.attempt !== undefined && !hasTest) {
    return 'attempt needs a test';
  }
  return null;
};

type RunTargetLevel = 'run' | 'instance' | 'test' | 'attempt';

/** The level the API resolves the target fields to (`resolveTarget` in attachments.target.ts). */
const runTargetLevel = (t: {
  instanceId?: string;
  spec?: string;
  testId?: string;
  testTitle?: string;
  attempt?: number;
}): RunTargetLevel => {
  if (!t.instanceId && !t.spec) {
    return 'run';
  }
  if (!t.testId && !t.testTitle) {
    return 'instance';
  }
  return t.attempt === undefined ? 'test' : 'attempt';
};

/** The file types the API takes at each level: `ALLOWED_TYPES` in attachments.ctrl.ts. */
const ALLOWED_TYPES: Record<RunTargetLevel, RunFileType[]> = {
  run: ['attachment'],
  instance: ['attachment', 'video', 'screenshot'],
  test: ['attachment'],
  attempt: ['screenshot', 'video', 'attachment', 'trace'],
};

const zodSchema = z
  .strictObject({
    sessionId: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'The session to add to, from currents-create-session. Send this or runId.'
      ),
    runId: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'The CI run to add to: the ID in a /run/<runId> dashboard link. Send this or sessionId.'
      ),
    instanceId: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .optional()
      .describe('CI runs only: the spec file instance to add to.'),
    spec: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .optional()
      .describe('CI runs only: the spec file path, instead of instanceId.'),
    groupId: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .optional()
      .describe(
        'CI runs only: picks one instance when a spec ran in more than one group.'
      ),
    testId: z
      .string()
      .trim()
      .min(1)
      .max(1024)
      .optional()
      .describe('CI runs only: the test to add to. Needs instanceId or spec.'),
    testTitle: z
      .string()
      .trim()
      .min(1)
      .max(2048)
      .optional()
      .describe(
        'CI runs only: the test title with its describe blocks joined by " > ", or its last part, instead of testId.'
      ),
    attempt: z
      .number()
      .int()
      .min(0)
      .max(1000)
      .optional()
      .describe('CI runs only: the attempt of the test, counted from 0.'),
    machineId: z
      .string()
      .trim()
      .min(1)
      .max(255)
      // eslint-disable-next-line no-control-regex
      .regex(/^[^\u0000-\u001f\u007f]+$/, 'must not contain control characters')
      .optional()
      .describe(
        'CI runs only, optional, any string you choose. With no spec or test named, the attachments of the run itself are stored with this machine. With a spec named, it chooses between instances of that spec that ran on different machines.'
      ),
    attachments: z
      .array(attachmentSchema)
      .min(1)
      .max(50)
      .refine(
        (attachments) => {
          const names = attachments
            .filter((attachment) => attachment.type === 'trace')
            .map((attachment) => attachment.name);
          return new Set(names).size === names.length;
        },
        {
          message: 'two traces share a name, so they cannot be told apart',
        }
      )
      .describe(
        'The attachments to add, each with its exact size in bytes. Each comes back with a URL to PUT the bytes to.'
      ),
  })
  .superRefine((value, ctx) => {
    if (!value.sessionId === !value.runId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'send sessionId or runId, not both and not neither',
        path: ['sessionId'],
      });
    }
    const target = RUN_TARGET_FIELDS.find(
      (field) => value[field] !== undefined
    );
    if (value.sessionId && target) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${target} is for CI runs; a session has no spec, test or machine`,
        path: [target],
      });
    }
    const problem = runTargetProblem(value);
    if (value.runId && problem) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: problem });
    }
    if (value.runId && !problem) {
      const level = runTargetLevel(value);
      const allowed = ALLOWED_TYPES[level];
      const refused = value.attachments.find(
        (attachment) => !allowed.includes(attachment.type)
      );
      if (refused) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `A ${refused.type} cannot be attached at the ${level} level. Allowed: ${allowed.join(', ')}`,
          path: ['attachments'],
        });
      }
    }
  });

type Body = z.infer<typeof zodSchema>;

type Added = {
  sessionId?: string;
  runId?: string;
  level?: string;
  instanceId?: string;
  testId?: string;
  attempt?: number;
  attachments: {
    attachmentId: string;
    name: string;
    type: string;
    uploadUrl: string;
    uploadHeaders?: Record<string, string>;
  }[];
};

const nextSteps = (data: Added) =>
  [
    uploadStep(data.attachments, true),
    data.sessionId
      ? sessionTraceLinkStep({
          sessionId: data.sessionId,
          traces: data.attachments.filter(
            (attachment) => attachment.type === 'trace'
          ),
        })
      : null,
    data.instanceId && data.testId
      ? traceLinkStep({
          instanceId: data.instanceId,
          testId: data.testId,
          attempt: data.attempt,
          traceNames: data.attachments
            .filter((attachment) => attachment.type === 'trace')
            .map((attachment) => attachment.name),
        })
      : null,
  ].filter((step): step is string => step !== null);

const handler = async ({ sessionId, runId, ...body }: Body) => {
  const path = sessionId
    ? `/sessions/${encodeURIComponent(sessionId)}/attachments`
    : `/runs/${encodeURIComponent(runId!)}/attachments`;
  const result = await postApi<{ data?: Added }, typeof body>(path, body);

  if (!result.ok) {
    return apiFailureResult('Failed to add the attachments', result);
  }

  const data = result.data?.data;
  if (!data?.attachments) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: 'The attachments were accepted but the response did not list the upload URLs.',
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ ...data, nextSteps: nextSteps(data) }, null, 2),
      },
    ],
  };
};

export const addAttachmentsTool = {
  scope: 'runs:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

import { z } from 'zod';
import {
  sessionAttachmentSchema,
  sessionTraceLinkStep,
  uploadStep,
} from '../../lib/runFiles';
import { postApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import type { McpTool } from '../../lib/tool';

const zodSchema = z.strictObject({
  projectId: z
    .string()
    .min(1)
    .describe('The project to record the session under.'),
  title: z
    .string()
    .min(1)
    .max(1024)
    .describe(
      'What the session set out to show, as one line. Used as the session title.'
    ),
  status: z
    .enum(['passed', 'failed'])
    .describe('Whether the behaviour the session went looking for held.'),
  error: z
    .string()
    .max(10_000)
    .optional()
    .describe('What went wrong. Shown as the test error on a failed session.'),
  durationMs: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 60 * 1000)
    .optional()
    .describe('How long the session took, in milliseconds.'),
  tags: z
    .array(z.string().min(1).max(255))
    .max(20)
    .optional()
    .describe('Tags to file the session under.'),
  commit: z
    .object({
      sha: z.string().max(1024).optional().describe('`git rev-parse HEAD`'),
      branch: z
        .string()
        .max(1024)
        .optional()
        .describe('`git branch --show-current`'),
      message: z
        .string()
        .max(10_000)
        .optional()
        .describe('The subject of the last commit, `git log -1 --format=%s`.'),
      authorName: z
        .string()
        .max(1024)
        .optional()
        .describe('`git log -1 --format=%an`'),
      authorEmail: z
        .string()
        .max(1024)
        .optional()
        .describe('`git log -1 --format=%ae`'),
      remoteOrigin: z
        .string()
        .max(1024)
        .optional()
        .describe('`git remote get-url origin`'),
    })
    .optional()
    .describe(
      'Where the session was recorded, so it shows up by branch and pull request. When you can run git in the repository, read these values from it; do not guess them.'
    ),
  pr: z
    .object({
      link: z
        .string()
        .max(2048)
        .optional()
        .describe('The pull request URL, when you have it.'),
      id: z
        .string()
        .max(256)
        .optional()
        .describe(
          'The pull request number, when you have no URL. Resolved with commit.remoteOrigin.'
        ),
    })
    .optional()
    .describe(
      'The pull request the session belongs to. A session from a dev box has no CI variables to find it from, so pass it here. Pass nothing when there is none.'
    ),
  attachments: z
    .array(sessionAttachmentSchema)
    .max(50)
    .optional()
    .refine(
      (attachments) => {
        const names = (attachments ?? [])
          .filter((attachment) => attachment.type === 'trace')
          .map((attachment) => attachment.name);
        return new Set(names).size === names.length;
      },
      {
        message: 'two traces share a name, so they cannot be told apart',
      }
    )
    .describe(
      'One entry per file to attach. Each comes back with a URL to PUT the bytes to. Send sizeBytes with each, so the upload URL accepts exactly that file.'
    ),
});

type SessionAttachments = {
  sessionId: string;
  attachments: {
    attachmentId: string;
    name: string;
    type: string;
    uploadUrl: string;
    uploadHeaders?: Record<string, string>;
  }[];
};

/**
 * The upload URLs are short-lived, and a trace is unreadable until its bytes
 * are there, so the order is what the agent has to get right.
 */
const nextSteps = (data: SessionAttachments, sizesSent: boolean) =>
  [
    uploadStep(data.attachments ?? [], sizesSent),
    sessionTraceLinkStep({
      sessionId: data.sessionId,
      traces: (data.attachments ?? []).filter(
        (attachment) => attachment.type === 'trace'
      ),
    }),
  ].filter((step): step is string => step !== null);

const handler = async (body: z.infer<typeof zodSchema>) => {
  const sizesSent = (body.attachments ?? []).every(
    (attachment) => attachment.sizeBytes !== undefined
  );
  const result = await postApi<{ data?: SessionAttachments }, typeof body>(
    '/sessions',
    body
  );

  if (!result.ok) {
    return apiFailureResult('Failed to record the session', result);
  }

  const data = result.data?.data;
  // Named in the guidance below; without it the guidance would quote
  // `undefined` back to the agent as something to call the next tool with.
  if (!data?.sessionId) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: 'The session was recorded but the response did not identify it.',
        },
      ],
    };
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          { ...data, nextSteps: nextSteps(data, sizesSent) },
          null,
          2
        ),
      },
    ],
  };
};

export const createSessionTool = {
  scope: 'runs:write',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

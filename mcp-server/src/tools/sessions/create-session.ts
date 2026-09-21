import { z } from 'zod';
import { postApi } from '../../lib/request';
import { apiFailureResult } from '../../lib/toolResult';
import type { McpTool } from '../../lib/tool';

type ArtifactType = 'trace' | 'screenshot' | 'video' | 'attachment';

/**
 * The route refuses a mismatch too. Repeated here because the agent has to
 * guess the content type of a file it produced, and learning it was wrong
 * from a 400 costs a round trip it can avoid.
 *
 * `packages/api/src/api/runs/session/session.validation.ts` is the one that
 * decides; this only has to agree with it.
 */
const contentTypeMatches = (type: ArtifactType, contentType: string) => {
  switch (type) {
    case 'trace':
      return contentType === 'application/zip';
    case 'screenshot':
      return contentType.startsWith('image/');
    case 'video':
      return contentType.startsWith('video/');
    case 'attachment':
      return true;
  }
};

const zodSchema = z.object({
  projectId: z
    .string()
    .min(1)
    .describe('The project to record the session under.'),
  title: z
    .string()
    .min(1)
    .max(1024)
    .describe(
      'What the session set out to show, as one line. Used as the run and test title.'
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
    .describe('Tags to file the run under, as on a CI run.'),
  artifacts: z
    .array(
      z
        .object({
          name: z
            .string()
            .min(1)
            .max(1024)
            .describe(
              'How the file is labelled. Name a trace here to pick it out later when the session carries more than one.'
            ),
          contentType: z
            .string()
            .min(1)
            .max(255)
            .describe(
              'Must match the type: a trace is application/zip, a screenshot image/*, a video video/*. An attachment takes anything.'
            ),
          type: z.enum(['trace', 'screenshot', 'video', 'attachment']),
        })
        .refine(
          (artifact) => contentTypeMatches(artifact.type, artifact.contentType),
          {
            message:
              'contentType does not match the artifact type: a trace is application/zip, a screenshot is an image, a video is a video',
            path: ['contentType'],
          }
        )
    )
    .max(50)
    .optional()
    .refine(
      (artifacts) => {
        const names = (artifacts ?? [])
          .filter((artifact) => artifact.type === 'trace')
          .map((artifact) => artifact.name);
        return new Set(names).size === names.length;
      },
      {
        message:
          'two traces share a name, so artifactName cannot pick between them',
      }
    )
    .describe(
      'One entry per file to attach. Each comes back with a URL to PUT the bytes to.'
    ),
});

type SessionArtifact = {
  name: string;
  type: string;
  artifactId: string;
  uploadUrl: string;
};

type SessionRun = {
  runId: string;
  groupId: string;
  instanceId: string;
  testId: string;
  artifacts: SessionArtifact[];
};

/**
 * The upload URLs are short-lived, and a trace is unreadable until its bytes
 * are there, so the order is what the agent has to get right.
 */
const nextSteps = (data: SessionRun) => {
  const steps: string[] = [];
  if (data.artifacts?.length) {
    steps.push(
      'PUT each file to its uploadUrl. The URLs expire about 10 minutes after this call.'
    );
  }
  const traces = (data.artifacts ?? []).filter(
    (artifact) => artifact.type === 'trace'
  );
  if (traces.length) {
    const pick =
      traces.length > 1
        ? ` and artifactName set to one of ${traces.map((t) => t.name).join(', ')}`
        : '';
    steps.push(
      `Once the trace is uploaded, call currents-create-trace-link with instanceId ${data.instanceId}, testId ${data.testId}${pick} for a link that needs no Currents credential.`
    );
  }
  return steps;
};

const handler = async (body: z.infer<typeof zodSchema>) => {
  const result = await postApi<{ data?: SessionRun }, typeof body>(
    '/runs/session',
    body
  );

  if (!result.ok) {
    return apiFailureResult('Failed to record the session', result);
  }

  const data = result.data?.data;
  // All three are named in the guidance below; without them it would quote
  // `undefined` back to the agent as something to call the next tool with.
  if (!data?.runId || !data.instanceId || !data.testId) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: 'The session was recorded but the response did not identify the run.',
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

export const createSessionTool = {
  scope: 'runs:write',
  feature: 'evidenceSharing',
  schema: zodSchema,
  handler,
} satisfies McpTool<typeof zodSchema>;

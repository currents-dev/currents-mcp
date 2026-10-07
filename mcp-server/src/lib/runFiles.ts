import { z } from 'zod';

/**
 * What the attachment routes of the API accept, for the tools that call them. The
 * checks are the API's (`@currents/common`, `runFiles`), written out here
 * because the standalone `@currents/mcp` build cannot resolve that package;
 * `packages/api/src/api/mcp/__tests__/runFilesAgree.test.ts` fails if the two
 * drift. Checking before the call spares the agent a round trip to learn it
 * guessed a content type wrong.
 */
export type RunFileType = 'trace' | 'screenshot' | 'video' | 'attachment';

const SCREENSHOT_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

const MEDIA_TYPE_PATTERN =
  /^[\w.+-]+\/[\w.+-]+(?:[ \t]*;[ \t]*[\w.-]+=(?:"[^"\\\r\n]*"|[\w.+-]+))*$/;

const mediaTypeOf = (contentType: string) =>
  contentType.split(';')[0].trim().toLowerCase();

export const contentTypeMatches = (
  type: RunFileType,
  contentTypeWithParameters: string
): boolean => {
  const contentType = mediaTypeOf(contentTypeWithParameters);
  switch (type) {
    case 'trace':
      return contentType === 'application/zip';
    case 'screenshot':
      return SCREENSHOT_CONTENT_TYPES.includes(contentType);
    case 'video':
      return contentType.startsWith('video/');
    case 'attachment':
      return true;
  }
};

const MISMATCH_MESSAGE =
  'contentType does not match the file type: a trace is application/zip, a screenshot is image/png, image/jpeg, image/webp or image/gif, a video is video/*';

const MAX_FILE_BYTES = 1024 * 1024 * 1024;

const fileFields = {
  name: z
    .string()
    .min(1)
    .max(1024)
    .describe(
      'How the file is labelled. Name a trace here to pick it out later when the session carries more than one.'
    ),
  type: z.enum(['trace', 'screenshot', 'video', 'attachment']),
  contentType: z
    .string()
    .max(255)
    .regex(MEDIA_TYPE_PATTERN, 'must be a media type such as image/png')
    .describe(
      'Must match the type: a trace is application/zip, a screenshot image/png, image/jpeg, image/webp or image/gif, a video video/*. An attachment takes any media type.'
    ),
  caption: z
    .string()
    .max(1000)
    .optional()
    .describe('One line saying what the file shows. Shown next to it.'),
  meta: z
    .record(z.string().regex(/^[A-Za-z0-9_-]{1,64}$/), z.string().max(256))
    .optional()
    .describe(
      'Up to 20 key-value pairs of letters, digits, "_" and "-" keys, 2 KB in all.'
    ),
};

const sizeBytes = z
  .number()
  .int()
  .min(1)
  .max(MAX_FILE_BYTES)
  .describe(
    'The exact size of the file in bytes. The upload URL accepts a body of exactly this size.'
  );

const matchesType = {
  check: (file: { type: RunFileType; contentType: string }) =>
    contentTypeMatches(file.type, file.contentType),
  options: { message: MISMATCH_MESSAGE, path: ['contentType'] },
};

/** An attachment for `POST /sessions`, which takes the size when it is sent. */
export const sessionAttachmentSchema = z
  .object({ ...fileFields, sizeBytes: sizeBytes.optional() })
  .refine(matchesType.check, matchesType.options);

/** An attachment for the add routes, which pin the size. */
export const attachmentSchema = z
  .object({ ...fileFields, sizeBytes })
  .refine(matchesType.check, matchesType.options);

type UploadInstruction = {
  type: string;
  uploadHeaders?: Record<string, string>;
};

/**
 * The upload URLs expect the headers in `uploadHeaders`, and the exact body
 * size as well when every size was sent.
 */
export const uploadStep = (
  files: UploadInstruction[],
  sizesSent: boolean
): string | null => {
  if (files.length === 0) {
    return null;
  }
  const size = sizesSent ? ' and a body of exactly its sizeBytes bytes' : '';
  return `PUT each file to its uploadUrl. Send the headers in its uploadHeaders${size}. The URLs expire about 10 minutes after this call.`;
};

/** The step that turns an uploaded session trace into a link. */
export const sessionTraceLinkStep = (params: {
  sessionId: string;
  traces: { attachmentId: string; name: string }[];
}): string | null => {
  if (params.traces.length === 0) {
    return null;
  }
  const which = params.traces
    .map((trace) => `attachmentId ${trace.attachmentId} for ${trace.name}`)
    .join(', or ');
  return `Once the trace is uploaded, call currents-create-evidence-links with sessionId ${params.sessionId} and ${which}, for a link that needs no Currents credential.`;
};

/** The step that turns an uploaded CI test trace into a link. */
export const traceLinkStep = (params: {
  instanceId: string;
  testId: string;
  attempt?: number;
  traceNames: string[];
}): string | null => {
  if (params.traceNames.length === 0) {
    return null;
  }
  // Always named: the attempt may already hold an earlier trace, and the link
  // would open that one.
  const pick =
    params.traceNames.length > 1
      ? ` and artifactName set to one of ${params.traceNames.join(', ')}`
      : ` and artifactName ${params.traceNames[0]}`;
  const attempt =
    params.attempt === undefined ? '' : `, attemptIndex ${params.attempt}`;
  return `Once the trace is uploaded, call currents-create-evidence-links with instanceId ${params.instanceId}, testId ${params.testId}${attempt}${pick} for a link that needs no Currents credential.`;
};

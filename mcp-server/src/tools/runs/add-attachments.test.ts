import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as request from '../../lib/request';
import { addAttachmentsTool } from './add-attachments';

vi.mock('../../lib/request');

const FILE = {
  name: 'shot.png',
  type: 'screenshot' as const,
  contentType: 'image/png',
  sizeBytes: 1234,
};

const RESPONSE = {
  runId: 'run-1',
  level: 'attempt',
  instanceId: 'inst-1',
  testId: 'test-1',
  attempt: 0,
  attachments: [
    {
      attachmentId: 'f1',
      name: 'shot.png',
      type: 'screenshot',
      uploadUrl: 'https://fs/up?sig',
      uploadHeaders: { 'Content-Type': 'image/png' },
    },
  ],
  uploadExpiresInSeconds: 600,
};

const answer = (data: unknown) =>
  vi.spyOn(request, 'postApi').mockResolvedValue({ ok: true, data } as never);

const parse = (result: { content: Array<{ text: string }> }) =>
  JSON.parse(result.content[0].text);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('addAttachmentsTool', () => {
  it('posts the target and files to the run, with the run ID in the path only', async () => {
    answer({ data: RESPONSE });

    await addAttachmentsTool.handler({
      runId: 'run/1',
      spec: 'cart.spec.ts',
      testTitle: 'adds an item',
      attachments: [FILE],
    });

    expect(request.postApi).toHaveBeenCalledWith('/runs/run%2F1/attachments', {
      spec: 'cart.spec.ts',
      testTitle: 'adds an item',
      attachments: [FILE],
    });
  });

  it('returns the upload URLs with steps that name the headers and the size', async () => {
    answer({ data: RESPONSE });

    const result = parse(
      await addAttachmentsTool.handler({ runId: 'run-1', attachments: [FILE] })
    );

    expect(result.attachments[0].uploadUrl).toBe('https://fs/up?sig');
    expect(result.nextSteps).toEqual([
      expect.stringContaining('uploadHeaders'),
    ]);
    expect(result.nextSteps[0]).toContain('sizeBytes');
  });

  it('says to mint a trace link, naming the test, the attempt and the trace', async () => {
    answer({
      data: {
        ...RESPONSE,
        attachments: [
          { ...RESPONSE.attachments[0], name: 'trace.zip', type: 'trace' },
          { ...RESPONSE.attachments[0], name: 'other.zip', type: 'trace' },
        ],
      },
    });

    const { nextSteps } = parse(
      await addAttachmentsTool.handler({
        runId: 'run-1',
        attachments: [
          {
            ...FILE,
            name: 'trace.zip',
            type: 'trace',
            contentType: 'application/zip',
          },
          {
            ...FILE,
            name: 'other.zip',
            type: 'trace',
            contentType: 'application/zip',
          },
        ],
      })
    );

    expect(nextSteps[1]).toContain('currents-create-evidence-links');
    expect(nextSteps[1]).toContain('instanceId inst-1');
    expect(nextSteps[1]).toContain('testId test-1');
    expect(nextSteps[1]).toContain('attemptIndex 0');
    expect(nextSteps[1]).toContain('trace.zip, other.zip');
  });

  it('names the trace even when the request carries only one', async () => {
    answer({
      data: {
        ...RESPONSE,
        attachments: [
          { ...RESPONSE.attachments[0], name: 'new.zip', type: 'trace' },
        ],
      },
    });

    const { nextSteps } = parse(
      await addAttachmentsTool.handler({
        runId: 'run-1',
        attachments: [
          {
            ...FILE,
            name: 'new.zip',
            type: 'trace',
            contentType: 'application/zip',
          },
        ],
      })
    );

    expect(nextSteps[1]).toContain('artifactName new.zip');
  });

  it('passes a machine ID through', async () => {
    answer({ data: { ...RESPONSE, level: 'run', instanceId: undefined } });

    await addAttachmentsTool.handler({
      runId: 'run-1',
      machineId: 'ci-1',
      attachments: [FILE],
    });

    expect(request.postApi).toHaveBeenCalledWith('/runs/run-1/attachments', {
      machineId: 'ci-1',
      attachments: [FILE],
    });
  });

  it('mentions no trace link for files at the instance level', async () => {
    answer({
      data: {
        ...RESPONSE,
        level: 'instance',
        testId: undefined,
        attempt: undefined,
      },
    });

    const { nextSteps } = parse(
      await addAttachmentsTool.handler({
        runId: 'run-1',
        instanceId: 'inst-1',
        attachments: [FILE],
      })
    );

    expect(nextSteps).toHaveLength(1);
  });

  it('reports the route failure, including a 409 for an ambiguous target', async () => {
    vi.spyOn(request, 'postApi').mockResolvedValue({
      ok: false,
      status: 409,
      error: 'More than one test has this title. Send testId.',
    } as never);

    const result = await addAttachmentsTool.handler({
      runId: 'run-1',
      spec: 's',
      testTitle: 't',
      attachments: [FILE],
    });

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toContain('Failed to add the attachments');
  });

  it('fails when the response lists no attachments', async () => {
    answer({ data: { runId: 'run-1' } });

    const result = await addAttachmentsTool.handler({
      runId: 'run-1',
      attachments: [FILE],
    });

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toContain('upload URLs');
  });

  describe('input', () => {
    const parse = (input: object) => addAttachmentsTool.schema.safeParse(input);

    it('needs the size of every file', () => {
      const { sizeBytes: _size, ...withoutSize } = FILE;

      expect(parse({ runId: 'r', attachments: [withoutSize] }).success).toBe(
        false
      );
    });

    it.each([
      [
        'a screenshot that is not an image',
        { ...FILE, contentType: 'text/plain' },
      ],
      [
        'a trace that is not a zip',
        { ...FILE, type: 'trace', contentType: 'image/png' },
      ],
      ['an svg screenshot', { ...FILE, contentType: 'image/svg+xml' }],
      [
        'a content type with a line break',
        { ...FILE, contentType: 'image/png\\r\\nx: y' },
      ],
      ['a meta key with a space', { ...FILE, meta: { 'a b': 'c' } }],
    ])('refuses %s', (_label, file) => {
      expect(parse({ runId: 'r', attachments: [file] }).success).toBe(false);
    });

    it('accepts content type parameters, and an attachment of any type', () => {
      expect(
        parse({
          runId: 'r',
          attachments: [
            {
              ...FILE,
              name: 'a.txt',
              type: 'attachment',
              contentType: 'text/plain; charset=utf-8',
            },
          ],
        }).success
      ).toBe(true);
    });

    it('refuses two traces with one name', () => {
      const trace = {
        ...FILE,
        name: 't.zip',
        type: 'trace' as const,
        contentType: 'application/zip',
      };

      expect(parse({ runId: 'r', attachments: [trace, trace] }).success).toBe(
        false
      );
    });

    it('needs at least one file', () => {
      expect(parse({ runId: 'r', attachments: [] }).success).toBe(false);
    });
  });

  it('is tagged with the scope of its route', () => {
    expect(addAttachmentsTool.scope).toBe('runs:write');
  });

  describe('for a session', () => {
    it('posts to the session route without any run target', async () => {
      answer({ data: { sessionId: 's1', attachments: RESPONSE.attachments } });

      await addAttachmentsTool.handler({
        sessionId: 's/1',
        attachments: [FILE],
      } as never);

      expect(request.postApi).toHaveBeenCalledWith(
        '/sessions/s%2F1/attachments',
        { attachments: [FILE] }
      );
    });

    it('names the trace attachment for the evidence link', async () => {
      answer({
        data: {
          sessionId: 's1',
          attachments: [
            {
              ...RESPONSE.attachments[0],
              attachmentId: 'att-9',
              name: 'trace.zip',
              type: 'trace',
            },
          ],
        },
      });

      const { nextSteps } = parse(
        await addAttachmentsTool.handler({
          sessionId: 's1',
          attachments: [FILE],
        } as never)
      );

      expect(nextSteps[1]).toContain('sessionId s1');
      expect(nextSteps[1]).toContain('attachmentId att-9');
    });

    it.each([
      ['instanceId', { instanceId: 'i' }],
      ['testId', { testId: 't' }],
      ['machineId', { machineId: 'm' }],
    ])('refuses %s, which a session has none of', (_name, extra) => {
      expect(
        addAttachmentsTool.schema.safeParse({
          sessionId: 's',
          attachments: [FILE],
          ...extra,
        }).success
      ).toBe(false);
    });

    it('needs exactly one of sessionId and runId', () => {
      const both = { sessionId: 's', runId: 'r', attachments: [FILE] };
      const neither = { attachments: [FILE] };

      expect(addAttachmentsTool.schema.safeParse(both).success).toBe(false);
      expect(addAttachmentsTool.schema.safeParse(neither).success).toBe(false);
    });
  });

  describe('a CI run target', () => {
    const LOG = { ...FILE, type: 'attachment', contentType: 'text/plain' };
    const parseTarget = (extra: Record<string, unknown>) =>
      addAttachmentsTool.schema.safeParse({
        runId: 'r',
        attachments: [LOG],
        ...extra,
      }).success;

    // The same combinations the API refuses (`targetProblem`).
    it.each([
      ['instanceId and spec', { instanceId: 'i', spec: 's' }],
      [
        'testId and testTitle',
        { instanceId: 'i', testId: 't', testTitle: 'x' },
      ],
      ['a test without a spec file', { testId: 't' }],
      ['an attempt without a test', { instanceId: 'i', attempt: 0 }],
      ['an attempt over 1000', { instanceId: 'i', testId: 't', attempt: 1001 }],
      ['a machineId with a control character', { machineId: 'a\nb' }],
      ['a blank spec', { spec: ' ' }],
    ])('refuses %s', (_label, extra) => {
      expect(parseTarget(extra)).toBe(false);
    });

    it.each([
      ['the run itself', {}],
      ['a machine', { machineId: 'm-1' }],
      ['a spec file', { spec: 'a.spec.ts' }],
      ['a test by title', { spec: 'a.spec.ts', testTitle: 'logs in' }],
      ['an attempt', { instanceId: 'i', testId: 't', attempt: 1 }],
    ])('accepts %s', (_label, extra) => {
      expect(parseTarget(extra)).toBe(true);
    });

    // The API's types per level (`ALLOWED_TYPES` in attachments.ctrl.ts).
    const withType = (type: string, contentType: string) => ({
      attachments: [{ ...FILE, type, contentType }],
    });

    it.each([
      ['a screenshot on the run', {}, withType('screenshot', 'image/png')],
      [
        'a trace on a test without an attempt',
        { instanceId: 'i', testId: 't' },
        withType('trace', 'application/zip'),
      ],
      [
        'a trace on a spec file',
        { instanceId: 'i' },
        withType('trace', 'application/zip'),
      ],
    ])('refuses %s', (_label, target, files) => {
      expect(parseTarget({ ...target, ...files })).toBe(false);
    });

    it.each([
      ['a log on the run', {}, withType('attachment', 'text/plain')],
      [
        'a video on a spec file',
        { instanceId: 'i' },
        withType('video', 'video/webm'),
      ],
      [
        'a trace on an attempt',
        { instanceId: 'i', testId: 't', attempt: 0 },
        withType('trace', 'application/zip'),
      ],
    ])('accepts %s', (_label, target, files) => {
      expect(parseTarget({ ...target, ...files })).toBe(true);
    });

    it('refuses fields it does not know, such as artifacts', () => {
      expect(parseTarget({ artifacts: [FILE] })).toBe(false);
    });
  });
});

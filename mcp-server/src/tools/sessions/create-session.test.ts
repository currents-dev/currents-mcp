import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as request from '../../lib/request';
import { createSessionTool } from './create-session';

vi.mock('../../lib/request');

const RUN = {
  runId: 'a1b2c3d4e5f60718',
  groupId: 'session',
  instanceId: 'inst-1',
  testId: 'test-1',
  artifacts: [
    {
      name: 'trace',
      type: 'trace',
      artifactId: 'art-1',
      uploadUrl: 'https://fs/upload?sig',
    },
  ],
};

const answer = (data: unknown) =>
  vi.spyOn(request, 'postApi').mockResolvedValue({ ok: true, data } as never);

const parse = (result: { content: Array<{ text: string }> }) =>
  JSON.parse(result.content[0].text);

const body = {
  projectId: 'proj-1',
  title: 'the submit button does nothing',
  status: 'failed' as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createSessionTool', () => {
  it('posts the body to the session route', async () => {
    answer({ data: RUN });

    await createSessionTool.handler({ ...body, durationMs: 12_000 });

    expect(request.postApi).toHaveBeenCalledWith('/runs/session', {
      ...body,
      durationMs: 12_000,
    });
  });

  it('returns the run and the upload URLs', async () => {
    answer({ data: RUN });

    const result = parse(await createSessionTool.handler(body));

    expect(result).toMatchObject({
      runId: RUN.runId,
      instanceId: 'inst-1',
      testId: 'test-1',
    });
    expect(result.artifacts[0].uploadUrl).toBe('https://fs/upload?sig');
  });

  // The URLs expire and a trace is unreadable until its bytes are there, so
  // the order is the part the agent has to get right.
  it('says to upload the files and then mint the link', async () => {
    answer({ data: RUN });

    const { nextSteps } = parse(await createSessionTool.handler(body));

    expect(nextSteps[0]).toContain('uploadUrl');
    expect(nextSteps[1]).toContain('currents-create-trace-link');
    expect(nextSteps[1]).toContain('inst-1');
    expect(nextSteps[1]).toContain('test-1');
  });

  it('mentions no trace link when no trace was attached', async () => {
    answer({
      data: {
        ...RUN,
        artifacts: [
          {
            name: 'shot',
            type: 'screenshot',
            artifactId: 'art-2',
            uploadUrl: 'https://fs/png',
          },
        ],
      },
    });

    const { nextSteps } = parse(await createSessionTool.handler(body));

    expect(nextSteps).toHaveLength(1);
    expect(nextSteps[0]).toContain('uploadUrl');
  });

  it('says nothing to do when the session carried no files', async () => {
    answer({ data: { ...RUN, artifacts: [] } });

    expect(parse(await createSessionTool.handler(body)).nextSteps).toEqual([]);
  });

  it('reports the route failure', async () => {
    vi.spyOn(request, 'postApi').mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Evidence sharing is not enabled for this organization',
    } as never);

    const result = await createSessionTool.handler(body);

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toContain('Failed to record the session');
  });

  // Every one of these is quoted back as something to call the next tool
  // with, so a response missing any of them is an error, not a success.
  it.each(['runId', 'instanceId', 'testId'])(
    'fails when the response omits %s',
    async (field) => {
      const { [field as keyof typeof RUN]: _omitted, ...rest } = RUN;
      answer({ data: rest });

      const result = await createSessionTool.handler(body);

      expect(result).toMatchObject({ isError: true });
      expect(result.content[0].text).toContain('did not identify the run');
    }
  );

  // The agent has to guess the content type of a file it produced; learning it
  // was wrong from a 400 is a round trip it can avoid.
  it('refuses a content type that does not match the artifact type', () => {
    const parsed = createSessionTool.schema.safeParse({
      ...body,
      artifacts: [{ name: 'trace', contentType: 'image/png', type: 'trace' }],
    });

    expect(parsed.success).toBe(false);
  });

  it.each([
    ['trace', 'application/zip'],
    ['screenshot', 'image/png'],
    ['video', 'video/webm'],
    ['attachment', 'text/plain'],
  ])('accepts a %s declared as %s', (type, contentType) => {
    const parsed = createSessionTool.schema.safeParse({
      ...body,
      artifacts: [{ name: 'a', contentType, type }],
    });

    expect(parsed.success).toBe(true);
  });

  // The selector is a name, so two traces sharing one leaves the link
  // ambiguous — and the tool is what told the agent to select by name.
  it('refuses two traces with the same name', () => {
    const parsed = createSessionTool.schema.safeParse({
      ...body,
      artifacts: [
        { name: 'trace', contentType: 'application/zip', type: 'trace' },
        { name: 'trace', contentType: 'application/zip', type: 'trace' },
      ],
    });

    expect(parsed.success).toBe(false);
  });

  // Only traces are selected by name; nothing picks a screenshot that way.
  it('allows two screenshots with the same name', () => {
    const parsed = createSessionTool.schema.safeParse({
      ...body,
      artifacts: [
        { name: 'step', contentType: 'image/png', type: 'screenshot' },
        { name: 'step', contentType: 'image/png', type: 'screenshot' },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  // With one trace the agent needs no selector; with two it does, or it links
  // whichever was stored first.
  it('names artifactName only when more than one trace was attached', async () => {
    answer({
      data: {
        ...RUN,
        artifacts: [
          { name: 'before', type: 'trace', artifactId: 'a', uploadUrl: 'u1' },
          { name: 'after', type: 'trace', artifactId: 'b', uploadUrl: 'u2' },
        ],
      },
    });

    const { nextSteps } = parse(await createSessionTool.handler(body));

    expect(nextSteps[1]).toContain('artifactName');
    expect(nextSteps[1]).toContain('before, after');
  });

  it('is gated on the flag and the write scope its route names', () => {
    expect(createSessionTool.scope).toBe('runs:write');
    expect(createSessionTool.feature).toBe('evidenceSharing');
  });
});

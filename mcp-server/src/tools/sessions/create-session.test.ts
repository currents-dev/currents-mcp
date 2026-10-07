import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as request from '../../lib/request';
import { createSessionTool } from './create-session';

vi.mock('../../lib/request');

const RUN = {
  sessionId: 'a1b2c3d4e5f60718',
  attachments: [
    {
      name: 'trace',
      type: 'trace',
      attachmentId: 'att-1',
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

    expect(request.postApi).toHaveBeenCalledWith('/sessions', {
      ...body,
      durationMs: 12_000,
    });
  });

  it('sends the commit and the pull request to the route', async () => {
    answer({ data: RUN });
    const git = {
      commit: {
        sha: 'abc123',
        branch: 'feat/x',
        remoteOrigin: 'git@github.com:a/b.git',
      },
      pr: { id: '12' },
    };

    await createSessionTool.handler({ ...body, ...git });

    expect(request.postApi).toHaveBeenCalledWith('/sessions', {
      ...body,
      ...git,
    });
  });

  it('accepts a size, a caption and meta on a file, and refuses a bad one', () => {
    const file = {
      name: 'a.png',
      type: 'screenshot',
      contentType: 'image/png',
    };

    expect(
      createSessionTool.schema.safeParse({
        ...body,
        attachments: [
          { ...file, sizeBytes: 5, caption: 'x', meta: { a: 'b' } },
        ],
      }).success
    ).toBe(true);
    expect(
      createSessionTool.schema.safeParse({
        ...body,
        attachments: [{ ...file, sizeBytes: 0 }],
      }).success
    ).toBe(false);
  });

  it('returns the run and the upload URLs', async () => {
    answer({ data: RUN });

    const result = parse(await createSessionTool.handler(body));

    expect(result).toMatchObject({ sessionId: RUN.sessionId });
    expect(result.attachments[0].uploadUrl).toBe('https://fs/upload?sig');
  });

  // The URLs expire and a trace is unreadable until its bytes are there, so
  // the order is the part the agent has to get right.
  it('says to upload the files and then mint the link', async () => {
    answer({ data: RUN });

    const { nextSteps } = parse(await createSessionTool.handler(body));

    expect(nextSteps[0]).toContain('uploadUrl');
    expect(nextSteps[1]).toContain('currents-create-evidence-links');
    expect(nextSteps[1]).toContain(`sessionId ${RUN.sessionId}`);
    expect(nextSteps[1]).toContain('attachmentId att-1');
  });

  it('always names the headers, and the size only when sizes were sent', async () => {
    answer({ data: RUN });
    const art = {
      name: 'trace',
      contentType: 'application/zip',
      type: 'trace' as const,
    };

    const without = parse(
      await createSessionTool.handler({ ...body, attachments: [art] })
    );
    const withSize = parse(
      await createSessionTool.handler({
        ...body,
        attachments: [{ ...art, sizeBytes: 5 }],
      })
    );

    expect(without.nextSteps[0]).toContain('uploadHeaders');
    expect(without.nextSteps[0]).not.toContain('sizeBytes');
    expect(withSize.nextSteps[0]).toContain('uploadHeaders');
    expect(withSize.nextSteps[0]).toContain('sizeBytes');
  });

  it('mentions no trace link when no trace was attached', async () => {
    answer({
      data: {
        ...RUN,
        attachments: [
          {
            name: 'shot',
            type: 'screenshot',
            attachmentId: 'art-2',
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
    answer({ data: { ...RUN, attachments: [] } });

    expect(parse(await createSessionTool.handler(body)).nextSteps).toEqual([]);
  });

  it('reports the route failure', async () => {
    vi.spyOn(request, 'postApi').mockResolvedValue({
      ok: false,
      status: 403,
      error: 'Insufficient scope',
    } as never);

    const result = await createSessionTool.handler(body);

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toContain('Failed to record the session');
  });

  it('fails when the response omits the session ID', async () => {
    answer({ data: { attachments: [] } });

    const result = await createSessionTool.handler(body);

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toContain('did not identify it');
  });

  // The agent has to guess the content type of a file it produced; learning it
  // was wrong from a 400 is a round trip it can avoid.
  it('refuses a content type that does not match the artifact type', () => {
    const parsed = createSessionTool.schema.safeParse({
      ...body,
      attachments: [{ name: 'trace', contentType: 'image/png', type: 'trace' }],
    });

    expect(parsed.success).toBe(false);
  });

  // The API refuses unknown fields; dropping them here would record a session
  // without the files a caller sent under the old `artifacts` name.
  it('refuses fields it does not know, such as artifacts', () => {
    const parsed = createSessionTool.schema.safeParse({
      ...body,
      artifacts: [
        { name: 'trace', contentType: 'application/zip', type: 'trace' },
      ],
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
      attachments: [{ name: 'a', contentType, type }],
    });

    expect(parsed.success).toBe(true);
  });

  // The selector is a name, so two traces sharing one leaves the link
  // ambiguous — and the tool is what told the agent to select by name.
  it('refuses two traces with the same name', () => {
    const parsed = createSessionTool.schema.safeParse({
      ...body,
      attachments: [
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
      attachments: [
        { name: 'step', contentType: 'image/png', type: 'screenshot' },
        { name: 'step', contentType: 'image/png', type: 'screenshot' },
      ],
    });

    expect(parsed.success).toBe(true);
  });

  it('names each trace by its attachment ID', async () => {
    answer({
      data: {
        ...RUN,
        attachments: [
          { name: 'before', type: 'trace', attachmentId: 'a', uploadUrl: 'u1' },
          { name: 'after', type: 'trace', attachmentId: 'b', uploadUrl: 'u2' },
        ],
      },
    });

    const { nextSteps } = parse(await createSessionTool.handler(body));

    expect(nextSteps[1]).toContain('attachmentId a for before');
    expect(nextSteps[1]).toContain('attachmentId b for after');
  });

  it('is tagged with the write scope its route names', () => {
    expect(createSessionTool.scope).toBe('runs:write');
  });
});

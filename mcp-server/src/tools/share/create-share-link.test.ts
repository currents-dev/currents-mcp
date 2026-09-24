import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as request from '../../lib/request';
import { createShareLinkTool } from './create-share-link';

vi.mock('../../lib/request');

const link = {
  purpose: 'fix',
  url: 'https://s.crts.sh/ai/x7Kp2mQ9vLbEr4Tz.md',
  pageUrl: 'https://s.crts.sh/ai/x7Kp2mQ9vLbEr4Tz',
  expiresAt: '2026-09-25T10:00:00.000Z',
};

describe('createShareLinkTool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(request, 'postApi').mockResolvedValue({
      ok: true,
      data: { status: 'OK', data: link },
    });
  });

  it('returns the link the API created', async () => {
    const result = await createShareLinkTool.handler({
      purpose: 'fix',
      run_id: 'run-1',
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ status: 'OK', data: link }, null, 2),
        },
      ],
    });
  });

  it('sends the fields in the API casing', async () => {
    await createShareLinkTool.handler({
      purpose: 'fix',
      instance_id: 'inst-1',
      test_id: 'test-1',
      attempt: 1,
      expires_in_days: 3,
    });

    expect(request.postApi).toHaveBeenCalledWith('/share', {
      purpose: 'fix',
      runId: undefined,
      instanceId: 'inst-1',
      testId: 'test-1',
      attempt: 1,
      expiresInDays: 3,
    });
  });

  it('passes the refusal through', async () => {
    vi.spyOn(request, 'postApi').mockResolvedValue({
      ok: false,
      method: 'POST',
      path: '/share',
      status: 403,
      body: {
        error: 'public context sharing is turned off for this organization',
      },
    });

    const result = await createShareLinkTool.handler({
      purpose: 'report',
      run_id: 'run-1',
    });

    expect(result).toMatchObject({
      isError: true,
      content: [
        {
          type: 'text',
          text: expect.stringContaining('Failed to create the share link'),
        },
      ],
    });
  });

  it.each([
    [{ purpose: 'fix' }, 'provide run_id'],
    [
      { purpose: 'fix', test_id: 'test-1', run_id: 'run-1' },
      'test_id requires instance_id',
    ],
    [
      {
        purpose: 'report',
        instance_id: 'inst-1',
        test_id: 'test-1',
        attempt: 0,
      },
      'attempt is only valid with purpose "fix"',
    ],
    [
      { purpose: 'report', instance_id: 'inst-1' },
      'instance_id requires run_id (spec file) or test_id (test)',
    ],
    [
      { purpose: 'fix', run_id: 'run-1', attempt: 0 },
      'attempt requires a single test (instance_id + test_id)',
    ],
    [
      { purpose: 'fix', run_id: 'run-1', instance_id: 'inst-1', attempt: 0 },
      'attempt requires a single test (instance_id + test_id)',
    ],
    [{ purpose: 'fix', run_id: '   ' }, ''],
    [{ purpose: 'fix', run_id: 'run-1', expires_in_days: 2 }, ''],
    [{ purpose: 'share', run_id: 'run-1' }, ''],
  ])('rejects %j', (input, message) => {
    const parsed = createShareLinkTool.schema.safeParse(input);

    expect(parsed.success).toBe(false);
    if (message) {
      expect(
        parsed.error?.issues.some((issue) => issue.message.startsWith(message))
      ).toBe(true);
    }
  });

  it('trims identifiers before sending them', async () => {
    const input = createShareLinkTool.schema.parse({
      purpose: 'fix',
      run_id: ' run-1 ',
    });

    await createShareLinkTool.handler(input);

    expect(request.postApi).toHaveBeenCalledWith(
      '/share',
      expect.objectContaining({ runId: 'run-1' })
    );
  });

  it('accepts each target shape', () => {
    for (const input of [
      { purpose: 'report', run_id: 'run-1' },
      { purpose: 'report', run_id: 'run-1', instance_id: 'inst-1' },
      { purpose: 'fix', instance_id: 'inst-1', test_id: 'test-1' },
    ]) {
      expect(createShareLinkTool.schema.safeParse(input).success).toBe(true);
    }
  });
});

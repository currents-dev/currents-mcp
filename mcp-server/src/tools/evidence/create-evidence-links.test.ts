import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as request from '../../lib/request';
import { createEvidenceLinksTool } from './create-evidence-links';

vi.mock('../../lib/request');

const LINK = {
  url: 'https://t.crts.sh/S2xQd0pUb1hCZ2pS',
  expiresAt: '2026-09-17T00:00:00.000Z',
  testId: 'test-1',
  attemptIndex: 2,
};

const answer = (data: unknown) =>
  vi.spyOn(request, 'postApi').mockResolvedValue({ ok: true, data } as never);

const parse = (result: { content: Array<{ text: string }> }) =>
  JSON.parse(result.content[0].text);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createEvidenceLinksTool', () => {
  it('posts the body to the instance route, with the id encoded', async () => {
    answer({ data: LINK });

    await createEvidenceLinksTool.handler({
      instanceId: 'inst/1',
      testId: 'test-1',
      attemptIndex: 2,
      ttlSeconds: 3600,
    });

    expect(request.postApi).toHaveBeenCalledWith(
      '/instances/inst%2F1/trace-link',
      { testId: 'test-1', attemptIndex: 2, ttlSeconds: 3600 }
    );
  });

  // An agent handed only the base URL pastes the base URL; the digest is the
  // part that answers the question, so the endpoints come back filled in.
  it('returns the link and the endpoints under it', async () => {
    answer({ data: LINK });

    const body = parse(
      await createEvidenceLinksTool.handler({
        instanceId: 'inst-1',
        testId: 'test-1',
      })
    );

    expect(body).toMatchObject(LINK);
    expect(body.digest).toBe(`${LINK.url}/digest?format=md`);
    expect(body.filmstrip).toBe(`${LINK.url}/filmstrip`);
    expect(body.animation).toBe(`${LINK.url}/animation`);
    expect(body.snapshots).toBe(`${LINK.url}/snapshots`);
    expect(body.requests).toBe(`${LINK.url}/requests?status=failed`);
    expect(body.attachments).toBe(`${LINK.url}/attachments`);
    expect(body.player).toBe(LINK.url);
  });

  // The worker serves its own table, which is the authority if these drift.
  it('points at the worker docs on the host the link is on', async () => {
    answer({ data: LINK });

    const body = parse(
      await createEvidenceLinksTool.handler({
        instanceId: 'inst-1',
        testId: 'test-1',
      })
    );

    expect(body.docs).toBe('https://t.crts.sh/docs');
  });

  it('reports the route failure', async () => {
    vi.spyOn(request, 'postApi').mockResolvedValue({
      ok: false,
      status: 404,
      error: 'No trace found for this test attempt',
    } as never);

    const result = await createEvidenceLinksTool.handler({
      instanceId: 'inst-1',
      testId: 'test-1',
    });

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toContain(
      'Failed to create the evidence links'
    );
  });

  // A 200 with nothing to paste is worse than an error: the agent would report
  // success and hand the reader `undefined`.
  it('fails when the response carries no URL', async () => {
    answer({ data: { expiresAt: LINK.expiresAt } });

    const result = await createEvidenceLinksTool.handler({
      instanceId: 'inst-1',
      testId: 'test-1',
    });

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toContain('carried none');
  });

  // A base URL configured without a scheme still returns 200 from the route.
  // Throwing here would reach the caller as a JSON-RPC internal error.
  it('fails on a URL it cannot read an origin from', async () => {
    answer({ data: { ...LINK, url: 't.crts.sh/S2xQd0pUb1hCZ2pS' } });

    const result = await createEvidenceLinksTool.handler({
      instanceId: 'inst-1',
      testId: 'test-1',
    });

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toContain('t.crts.sh/S2xQd0pUb1hCZ2pS');
  });

  it('is tagged with the read scope its route names', () => {
    expect(createEvidenceLinksTool.scope).toBe('results:read');
  });
});

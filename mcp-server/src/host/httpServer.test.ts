import type { IncomingMessage } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requestContext } from '../lib/context';
import { fetchApi } from '../lib/request';
import { extractApiKey } from './httpServer';

/*
 * Spread over the real modules rather than replacing them. `lib/` is shared
 * with the monorepo copy of this source and arrives by sync, so a module
 * listed exhaustively here fails the moment that copy adds an export — in a
 * PR whose diff does not contain the cause. Only the values these tests need
 * to control are overridden.
 */
vi.mock('../lib/env', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/env')>()),
  CURRENTS_API_KEY: 'env-key',
  CURRENTS_API_URL: 'https://api.test.com',
}));

vi.mock('../lib/logger', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/logger')>()),
  logger: { error: vi.fn(), debug: vi.fn() },
  setLogger: vi.fn(),
}));

const reqWithAuth = (authorization?: string) =>
  ({ headers: authorization ? { authorization } : {} }) as IncomingMessage;

describe('extractApiKey', () => {
  it('extracts the token from a Bearer header', () => {
    expect(extractApiKey(reqWithAuth('Bearer abc123'))).toBe('abc123');
  });

  it('is case-insensitive and trims surrounding whitespace', () => {
    expect(extractApiKey(reqWithAuth('  bearer   abc123  '))).toBe('abc123');
  });

  it('returns the raw value when there is no Bearer prefix', () => {
    expect(extractApiKey(reqWithAuth('abc123'))).toBe('abc123');
  });

  it('returns undefined when no Authorization header is present', () => {
    expect(extractApiKey(reqWithAuth())).toBeUndefined();
  });
});

function jsonResponse(body: unknown = {}, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('API key passthrough via request context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the per-request key for the outbound Currents call', async () => {
    // A real Response, not a stub of the parts lib/request.ts reads today:
    // it reads the status, the body and the www-authenticate header, and a
    // partial stub breaks whenever that set grows.
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse());
    global.fetch = fetchMock;

    await requestContext.run({ apiKey: 'req-key' }, () => fetchApi('/runs/1'));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test.com/runs/1',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer req-key',
        }),
      })
    );
  });

  it('does not bleed keys across concurrent requests', async () => {
    const authByKey: Record<string, unknown> = {};
    global.fetch = vi.fn().mockImplementation((_url, init: RequestInit) => {
      const auth = (init.headers as Record<string, string>).Authorization;
      // Record which Authorization header each path saw.
      const path = String(_url);
      authByKey[path] = auth;
      return Promise.resolve(jsonResponse());
    });

    await Promise.all([
      requestContext.run({ apiKey: 'key-a' }, async () => {
        await new Promise((r) => setTimeout(r, 5));
        return fetchApi('/a');
      }),
      requestContext.run({ apiKey: 'key-b' }, () => fetchApi('/b')),
    ]);

    expect(authByKey['https://api.test.com/a']).toBe('Bearer key-a');
    expect(authByKey['https://api.test.com/b']).toBe('Bearer key-b');
  });
});

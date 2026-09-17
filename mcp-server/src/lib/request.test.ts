import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MCP_SERVER_VERSION } from '../host/assets';
import { requestContext } from './context';
import { logger } from './logger';
import {
  deleteApi,
  fetchApi,
  fetchCursorBasedPaginatedApi,
  postApi,
  putApi,
  REQUEST_TIMEOUT_MS,
} from './request';

// Mock the env module
vi.mock('./env', () => ({
  CURRENTS_API_KEY: 'test-api-key',
  CURRENTS_API_URL: 'https://api.test.com',
  CURRENTS_MCP_SURFACE: '',
}));

// Mock the logger module
vi.mock('./logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const respondWith = (
  status: number,
  body: string,
  headers: Record<string, string> = {}
) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers(headers),
  text: async () => body,
});

const respondWithJson = (
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
) => respondWith(status, JSON.stringify(body), headers);

const okJson = (body: unknown) => respondWithJson(200, body);

/**
 * The delays the retry backoff asked for, in order.
 *
 * The waits are run through rather than waited out: the schedule is what the
 * tests are about, and a file that sat out every backoff would spend seconds
 * asleep to assert the same thing.
 */
let backoffs: number[] = [];

const runThroughBackoff = () => {
  backoffs = [];
  const real = global.setTimeout;
  vi.spyOn(global, 'setTimeout').mockImplementation(((
    run: () => void,
    ms?: number
  ) => {
    // The backoff only. The dispatch deadline is left a real timer, so a test
    // that never meant to exercise it does not have every dispatched read fail
    // the moment it is sent.
    if ((ms ?? 0) >= REQUEST_TIMEOUT_MS) {
      return real(run, ms);
    }
    backoffs.push(ms ?? 0);
    run();
    return 0 as unknown as NodeJS.Timeout;
  }) as unknown as typeof setTimeout);
};

describe('fetchApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runThroughBackoff();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should successfully fetch data from the API', async () => {
    const mockData = { id: 1, name: 'Test' };
    global.fetch = vi.fn().mockResolvedValue(okJson(mockData));

    const result = await fetchApi<typeof mockData>('/test-path');

    expect(result).toEqual({ ok: true, data: mockData });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.test.com/test-path',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-api-key',
          // Over the network with no request context is the published
          // package's stdio binary, which `api_call` otherwise counts as any
          // other API key traffic.
          'User-Agent': `currents-app/${MCP_SERVER_VERSION} (standalone; stdio)`,
        }),
      })
    );
  });

  it('reads an empty body as an empty object', async () => {
    global.fetch = vi.fn().mockResolvedValue(respondWith(204, ''));

    expect(await fetchApi('/no-content')).toEqual({ ok: true, data: {} });
  });

  it('reports the status and the parsed body of an HTTP error', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      respondWithJson(403, {
        status: 'error',
        message: 'missing scope runs:read',
      })
    );

    const result = await fetchApi('/runs/run-1');

    expect(result).toEqual({
      ok: false,
      method: 'GET',
      path: '/runs/run-1',
      status: 403,
      body: { status: 'error', message: 'missing scope runs:read' },
    });
  });

  it('carries the challenge a refusal named the missing scope in', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      respondWithJson(
        403,
        { code: 'insufficient_scope' },
        {
          'WWW-Authenticate':
            'Bearer error="insufficient_scope", scope="webhooks:write"',
        }
      )
    );

    expect(await fetchApi('/webhooks')).toEqual({
      ok: false,
      method: 'GET',
      path: '/webhooks',
      status: 403,
      body: { code: 'insufficient_scope' },
      challenge: 'Bearer error="insufficient_scope", scope="webhooks:write"',
    });
  });

  it('tells the statuses a caller acts on differently apart', async () => {
    for (const status of [401, 403, 404, 429, 500]) {
      global.fetch = vi.fn().mockResolvedValue(respondWith(status, ''));

      const result = await fetchApi('/runs/run-1');

      expect(result).toMatchObject({ ok: false, status });
    }
  });

  it('keeps a non-JSON error body as text', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(respondWith(502, '<html>Bad Gateway</html>'));

    const result = await fetchApi('/runs/run-1');

    expect(result).toMatchObject({
      ok: false,
      status: 502,
      body: '<html>Bad Gateway</html>',
    });
  });

  it('should report a network error with no status', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await fetchApi('/test-path');

    expect(result).toEqual({
      ok: false,
      method: 'GET',
      path: '/test-path',
      status: null,
      body: null,
      error: 'Network error',
      received: 'unknown',
    });
  });

  it('reports a response whose body stream breaks, keeping the status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers(),
      text: async () => {
        throw new Error('terminated');
      },
    });

    const result = await fetchApi('/runs/run-1');

    expect(result).toEqual({
      ok: false,
      method: 'GET',
      path: '/runs/run-1',
      status: 502,
      body: null,
      error: 'terminated',
    });
  });

  // The headers arrive before the body, so a refusal whose stream then breaks
  // still says what to re-authorize for.
  it('keeps the challenge of a refusal whose body stream breaks', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({
        'WWW-Authenticate':
          'Bearer error="insufficient_scope", scope="webhooks:write"',
      }),
      text: async () => {
        throw new Error('terminated');
      },
    });

    expect(await fetchApi('/webhooks')).toEqual({
      ok: false,
      method: 'GET',
      path: '/webhooks',
      status: 403,
      body: null,
      error: 'terminated',
      challenge: 'Bearer error="insufficient_scope", scope="webhooks:write"',
    });
  });

  it('keeps the query string out of the log when the fetch rejection quotes the URL', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'request to https://api.test.com/tests/p1?authors[]=author@example.com failed'
        )
      );

    const result = await fetchApi('/tests/p1?authors[]=author@example.com');

    const logged = String(vi.mocked(logger.error).mock.calls[0][0]);
    expect(logged).not.toContain('author@example.com');
    // The whole message still reaches the caller, which is where it is needed.
    expect(result).toMatchObject({ error: expect.stringContaining('authors') });
  });

  it('logs a failure without the query string, which carries author addresses', async () => {
    global.fetch = vi.fn().mockResolvedValue(respondWith(500, ''));

    await fetchApi('/tests/p1?authors[]=author@example.com');

    expect(logger.error).toHaveBeenCalledOnce();
    const logged = String(vi.mocked(logger.error).mock.calls[0][0]);
    expect(logged).toContain('/tests/p1');
    expect(logged).toContain('HTTP 500');
    expect(logged).not.toContain('author@example.com');
  });
});

describe('retries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runThroughBackoff();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('answers from the attempt that succeeds after a 500', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(respondWith(500, ''))
      .mockResolvedValueOnce(okJson({ id: 1 }));

    expect(await fetchApi('/runs/run-1')).toEqual({
      ok: true,
      data: { id: 1 },
    });
    expect(backoffs).toEqual([300]);
  });

  it('retries a dropped connection and backs off further each time', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

    const result = await fetchApi('/runs/run-1');

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(backoffs).toEqual([300, 600]);
    expect(result).toMatchObject({ status: null, error: 'ECONNRESET' });
  });

  // Invisible to the status check: the headers said 200, and the stream broke
  // after them. On a large read it is the likeliest transient failure there is.
  it('sends a read again when the body breaks after the headers', async () => {
    const broken = {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => {
        throw new Error('terminated');
      },
    };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(broken)
      .mockResolvedValueOnce(okJson({ id: 1 }));

    expect(await fetchApi('/runs/run-1')).toEqual({
      ok: true,
      data: { id: 1 },
    });
    expect(backoffs).toEqual([300]);
  });

  it('reports a body that broke on every attempt, with the status it carried', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => {
        throw new Error('terminated');
      },
    });

    const result = await fetchApi('/runs/run-1');

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      ok: false,
      status: 200,
      error: 'terminated',
    });
  });

  // The same reason a 5xx is not: the response may follow work the API already
  // did, and the broken body cannot say whether it did.
  it('does not send a write again when its body breaks', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => {
        throw new Error('terminated');
      },
    });

    await postApi('/webhooks', { url: 'https://example.test' });

    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it('gives up rather than retrying forever', async () => {
    global.fetch = vi.fn().mockResolvedValue(respondWith(503, ''));

    await fetchApi('/runs/run-1');

    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('does not retry a status a later attempt would get the same answer to', async () => {
    for (const status of [400, 401, 403, 404, 409]) {
      global.fetch = vi.fn().mockResolvedValue(respondWith(status, ''));

      await fetchApi('/runs/run-1');

      expect(global.fetch).toHaveBeenCalledOnce();
    }
  });

  // A 5xx can follow work the API already did, and `PUT /runs/:id/cancel` or
  // `create-jira-issue` sent again would do it twice.
  it('does not send a write again after a failure that may have been served', async () => {
    global.fetch = vi.fn().mockResolvedValue(respondWith(500, ''));

    await putApi('/runs/run-1/cancel');
    expect(global.fetch).toHaveBeenCalledOnce();

    global.fetch = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

    await postApi('/webhooks', { url: 'https://example.test' });
    expect(global.fetch).toHaveBeenCalledOnce();
  });

  // A 429 is refused before the API acts on the request, so nothing was served
  // and repeating it cannot repeat anything.
  it('retries a write that was rate limited', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(respondWith(429, ''))
      .mockResolvedValueOnce(okJson({ status: 'OK' }));

    expect(await postApi('/webhooks', { url: 'https://example.test' })).toEqual(
      { ok: true, data: { status: 'OK' } }
    );
  });

  it('waits as long as a rate limiter asked rather than its own backoff', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(respondWith(429, '', { 'Retry-After': '2' }))
      .mockResolvedValueOnce(okJson({}));

    await fetchApi('/runs/run-1');

    expect(backoffs).toEqual([2000]);
  });

  // Sitting out the wait would hold the tool call open past what a client will
  // wait for, and a shorter one spends the attempt on the same refusal.
  it('answers the caller when the wait asked for is longer than a call can take', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(respondWith(429, '', { 'Retry-After': '120' }));

    const result = await fetchApi('/runs/run-1');

    expect(global.fetch).toHaveBeenCalledOnce();
    expect(result).toMatchObject({ ok: false, status: 429 });
  });

  it('reads an unparsable Retry-After as none at all', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        respondWith(429, '', { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' })
      )
      .mockResolvedValueOnce(okJson({}));

    await fetchApi('/runs/run-1');

    expect(backoffs).toEqual([300]);
  });

  it('names the retry in the log without the query string', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(respondWith(500, ''))
      .mockResolvedValueOnce(okJson({}));

    await fetchApi('/tests/p1?authors[]=author@example.com');

    const logged = String(vi.mocked(logger.warn).mock.calls[0][0]);
    expect(logged).toContain('/tests/p1');
    expect(logged).toContain('HTTP 500');
    expect(logged).not.toContain('author@example.com');
  });
});

/**
 * What `fetch` throws when the connection fails: a TypeError whose `cause`
 * carries the socket's code.
 */
const connectionError = (code: string) =>
  Object.assign(new TypeError('fetch failed'), {
    cause: Object.assign(new Error(code), { code }),
  });

describe('whether the API received the request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runThroughBackoff();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('says no when the connection was never established', async () => {
    global.fetch = vi.fn().mockRejectedValue(connectionError('ECONNREFUSED'));

    expect(await postApi('/actions', { name: 'flaky' })).toMatchObject({
      status: null,
      received: 'no',
    });
  });

  it('says unknown when the connection died with the request already out', async () => {
    global.fetch = vi.fn().mockRejectedValue(connectionError('ECONNRESET'));

    expect(await postApi('/actions', { name: 'flaky' })).toMatchObject({
      status: null,
      received: 'unknown',
    });
  });

  it('reads the code undici nests below the one fetch throws', async () => {
    const nested = Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('connect failed'), {
        cause: Object.assign(new Error('getaddrinfo ENOTFOUND api.test.com'), {
          code: 'ENOTFOUND',
        }),
      }),
    });
    global.fetch = vi.fn().mockRejectedValue(nested);

    expect(await postApi('/actions', { name: 'flaky' })).toMatchObject({
      received: 'no',
    });
  });

  // The question it answers is whether the API got the request, and a
  // response is proof that it did.
  it('leaves it unanswered when the body broke after the headers', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => {
        throw new Error('terminated');
      },
    });

    expect(await postApi('/actions', { name: 'flaky' })).not.toHaveProperty(
      'received'
    );
  });

  it('sends a write again when its request never left', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(connectionError('ECONNREFUSED'))
      .mockResolvedValueOnce(okJson({ status: 'OK' }));

    expect(await postApi('/actions', { name: 'flaky' })).toEqual({
      ok: true,
      data: { status: 'OK' },
    });
    expect(backoffs).toEqual([300]);
  });

  it('does not send a write again once the request may have gone out', async () => {
    global.fetch = vi.fn().mockRejectedValue(connectionError('ECONNRESET'));

    await postApi('/actions', { name: 'flaky' });

    expect(global.fetch).toHaveBeenCalledOnce();
  });

  it('names an unsent request as such in the log', async () => {
    global.fetch = vi.fn().mockRejectedValue(connectionError('ECONNREFUSED'));

    await postApi('/actions?projectId=p1', { name: 'flaky' });

    expect(String(vi.mocked(logger.error).mock.calls[0][0])).toContain(
      'request not sent'
    );
  });
});

describe('timeouts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runThroughBackoff();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('abandons a call the API never answers', async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({}));

    await fetchApi('/runs/run-1');

    const init = vi.mocked(global.fetch).mock.calls[0][1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  // Each attempt gets the whole budget, so the last one is not cut short by
  // what the first two spent.
  it('gives every attempt a signal of its own', async () => {
    global.fetch = vi.fn().mockResolvedValue(respondWith(500, ''));

    await fetchApi('/runs/run-1');

    const signals = vi
      .mocked(global.fetch)
      .mock.calls.map((call) => (call[1] as RequestInit).signal);
    expect(new Set(signals).size).toBe(3);
  });

  // The message `AbortSignal.timeout` rejects with says it timed out and not
  // how long was waited, which is the part a caller deciding whether to narrow
  // its filters needs.
  it('says how long a timed-out call waited', async () => {
    const timeout = new Error('The operation was aborted due to timeout');
    timeout.name = 'TimeoutError';
    global.fetch = vi.fn().mockRejectedValue(timeout);

    expect(await fetchApi('/runs/run-1')).toMatchObject({
      status: null,
      error: 'timed out after 30000ms',
    });
  });

  // No `AbortSignal` either way on this path: there is no request to abort,
  // and the deadline below is the whole of what bounds it.
  it('hands the dispatch the request and nothing to abort with', async () => {
    const dispatch = vi.fn().mockResolvedValue(
      new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await requestContext.run({ dispatch }, () => fetchApi('/runs/run-1'));

    expect(dispatch).toHaveBeenCalledWith(
      expect.not.objectContaining({ signal: expect.anything() })
    );
  });
});

/**
 * `POST /mcp` takes the dispatch for every call, so this is the only bound the
 * hosted server has — the `AbortSignal` above never runs there.
 */
describe('the dispatch deadline', () => {
  /** A host that accepts the call and never answers it. */
  const neverAnswers = () => vi.fn(() => new Promise<Response>(() => {}));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('gives up on a dispatched read the host never answers', async () => {
    const dispatch = neverAnswers();

    const pending = requestContext.run({ dispatch }, () =>
      fetchApi('/runs/run-1')
    );
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

    expect(await pending).toMatchObject({
      ok: false,
      status: null,
      error: `timed out after ${REQUEST_TIMEOUT_MS}ms`,
    });
  });

  // The handler is still running, so a second attempt would sit beside it
  // rather than replace it, and one abandoned handler would become three.
  it('does not send an abandoned read again', async () => {
    const dispatch = neverAnswers();

    const pending = requestContext.run({ dispatch }, () =>
      fetchApi('/runs/run-1')
    );
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 4);
    await pending;

    expect(dispatch).toHaveBeenCalledOnce();
  });

  // The handler has the request, so the question `received` answers — did the
  // API get it — is not open. Answering it `unknown` would put "call this tool
  // again" on the result, and the repeat would start a second handler.
  it('leaves an abandoned read unclassified rather than unknown', async () => {
    const dispatch = neverAnswers();

    const pending = requestContext.run({ dispatch }, () =>
      fetchApi('/runs/run-1')
    );
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);

    expect(await pending).not.toHaveProperty('received');
  });

  it('says in the log that the handler outlived the call', async () => {
    const dispatch = neverAnswers();

    const pending = requestContext.run({ dispatch }, () =>
      fetchApi('/tests/p1?authors[]=author@example.com')
    );
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await pending;

    const logged = vi
      .mocked(logger.error)
      .mock.calls.map((call) => String(call[0]));
    const abandoned = logged.find((line) => line.includes('abandoned'));
    expect(abandoned).toContain('/tests/p1');
    expect(abandoned).toContain('the handler is still running');
    // The same rule `logApiFailure` keeps: these filters carry author addresses.
    expect(abandoned).not.toContain('author@example.com');
  });

  // A deadline here would report that the cancel failed while it went through.
  it('leaves a dispatched write to run to completion', async () => {
    const dispatch = neverAnswers();
    let settled = false;
    void requestContext
      .run({ dispatch }, () => putApi('/runs/run-1/cancel'))
      .then(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 4);

    expect(settled).toBe(false);
  });

  it('answers a dispatch that comes back inside the deadline', async () => {
    const dispatch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const pending = requestContext.run({ dispatch }, () =>
      fetchApi<{ id: number }>('/runs/run-1')
    );
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS * 2);

    expect(await pending).toEqual({ ok: true, data: { id: 1 } });
  });
});

describe('postApi, putApi and deleteApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runThroughBackoff();
  });

  it('sends the body as JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({ status: 'OK' }));

    await postApi('/signature/test', { projectId: 'p1' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.test.com/signature/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ projectId: 'p1' }),
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('sends no body and no content type when a PUT has none', async () => {
    global.fetch = vi.fn().mockResolvedValue(respondWith(204, ''));

    const result = await putApi('/runs/run-1/cancel');

    const init = vi.mocked(global.fetch).mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
    expect(init.headers).not.toHaveProperty('Content-Type');
    expect(result).toEqual({ ok: true, data: {} });
  });

  it('reports the status of a failed DELETE', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(respondWithJson(404, { message: 'not found' }));

    expect(await deleteApi('/webhooks/hook-1')).toEqual({
      ok: false,
      method: 'DELETE',
      path: '/webhooks/hook-1',
      status: 404,
      body: { message: 'not found' },
    });
  });
});

describe('fetchCursorBasedPaginatedApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runThroughBackoff();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch all pages when pagination is present', async () => {
    const page1 = {
      status: 'ok',
      has_more: true,
      data: [{ id: 1, cursor: 'cursor1' }],
    };
    const page2 = {
      status: 'ok',
      has_more: false,
      data: [{ id: 2, cursor: 'cursor2' }],
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(okJson(page1))
      .mockResolvedValueOnce(okJson(page2));

    const result = await fetchCursorBasedPaginatedApi('/test-path');

    expect(result).toEqual({
      ok: true,
      data: {
        items: [
          { id: 1, cursor: 'cursor1' },
          { id: 2, cursor: 'cursor2' },
        ],
      },
    });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle single page response', async () => {
    const page = {
      status: 'ok',
      has_more: false,
      data: [{ id: 1 }],
    };

    global.fetch = vi.fn().mockResolvedValue(okJson(page));

    const result = await fetchCursorBasedPaginatedApi('/test-path');

    expect(result).toEqual({ ok: true, data: { items: [{ id: 1 }] } });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should report the status of a failed page', async () => {
    global.fetch = vi.fn().mockResolvedValue(respondWith(500, 'boom'));

    const result = await fetchCursorBasedPaginatedApi('/test-path');

    expect(result).toEqual({
      ok: false,
      method: 'GET',
      path: '/test-path',
      status: 500,
      body: 'boom',
    });
  });

  it('reads a page that carries no data array as an empty one', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okJson({ status: 'ok', has_more: false }));

    expect(await fetchCursorBasedPaginatedApi('/test-path')).toEqual({
      ok: true,
      data: { items: [] },
    });
  });

  it('should stop after 100 iterations to prevent infinite loops', async () => {
    const page = {
      status: 'ok',
      has_more: true,
      data: [{ id: 1, cursor: 'cursor1' }],
    };

    global.fetch = vi.fn().mockResolvedValue(okJson(page));

    const result = await fetchCursorBasedPaginatedApi('/test-path');

    expect(global.fetch).toHaveBeenCalledTimes(100);
    expect(result.ok && result.data.items).toHaveLength(100);
    expect(result.ok && result.data.truncated).toBe(
      'Incomplete list: stopped after 100 pages and more items remain. Call this tool again with the same arguments and starting_after=cursor1 for the rest.'
    );
  });

  // The page cap alone allows a hundred pages of a hundred records, which is
  // the whole of a model's context spent on one tool result.
  it('stops at the item cap and says the list is partial', async () => {
    let id = 0;
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        okJson({
          status: 'ok',
          has_more: true,
          data: Array.from({ length: 100 }, () => ({
            id: id++,
            cursor: `cursor${id}`,
          })),
        })
      )
    );

    const result = await fetchCursorBasedPaginatedApi('/test-path');

    expect(global.fetch).toHaveBeenCalledTimes(10);
    expect(result.ok && result.data.items).toHaveLength(1000);
    expect(result.ok && result.data.truncated).toBe(
      'Incomplete list: stopped at the 1000-item cap and more items remain. Call this tool again with the same arguments and starting_after=cursor1000 for the rest.'
    );
  });

  it('leaves no marker on a last page that lands exactly on the cap', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okJson({
        status: 'ok',
        has_more: false,
        data: Array.from({ length: 1000 }, (_, id) => ({ id })),
      })
    );

    const result = await fetchCursorBasedPaginatedApi('/test-path');

    expect(result.ok && result.data.items).toHaveLength(1000);
    expect(result.ok && result.data.truncated).toBeUndefined();
  });

  // The cumulative array still ends on the previous page's last item, so a
  // cursor read from there asks for that same page again, to the page cap.
  it('stops on an empty page that reports more, rather than re-reading the last one', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        okJson({
          status: 'ok',
          has_more: true,
          data: [{ id: 1, cursor: 'cursor1' }],
        })
      )
      .mockResolvedValue(okJson({ status: 'ok', has_more: true, data: [] }));

    const result = await fetchCursorBasedPaginatedApi('/items');

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      ok: true,
      data: {
        items: [{ id: 1, cursor: 'cursor1' }],
        truncated:
          'Incomplete list: the API reported more items but sent no cursor to continue from.',
      },
    });
  });

  // The marker names `starting_after`, so the walk has to start there — a tool
  // that took the cursor and ignored it would hand back the same first page and
  // the same marker for as long as a caller kept following it.
  it('starts the walk at the cursor the marker named', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        okJson({ status: 'ok', has_more: false, data: [{ id: 2 }] })
      );

    const result = await fetchCursorBasedPaginatedApi('/items', 'cursor1000');

    expect(String((global.fetch as any).mock.calls[0][0])).toBe(
      'https://api.test.com/items?starting_after=cursor1000'
    );
    expect(result).toEqual({ ok: true, data: { items: [{ id: 2 }] } });
  });

  // A second `?` is a query the API cannot read the cursor out of, and the walk
  // would then re-read the same page until the cap.
  it('joins the cursor onto a path that already carries a query', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        okJson({ status: 'ok', has_more: false, data: [{ id: 2 }] })
      );

    await fetchCursorBasedPaginatedApi('/items?tag=nightly', 'cursor1000');

    expect(String((global.fetch as any).mock.calls[0][0])).toBe(
      'https://api.test.com/items?tag=nightly&starting_after=cursor1000'
    );
  });

  // "more items remain" and nothing after it reads as an instruction the caller
  // has been left to work out.
  it('says the rest cannot be fetched when the cap lands on an item with no cursor', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okJson({
        status: 'ok',
        has_more: true,
        data: Array.from({ length: 1000 }, (_, id) => ({ id })),
      })
    );

    const result = await fetchCursorBasedPaginatedApi('/items');

    expect(result.ok && result.data.items).toHaveLength(1000);
    expect(result.ok && result.data.truncated).toBe(
      'Incomplete list: stopped at the 1000-item cap and more items remain. The API sent no cursor to continue from, so the rest cannot be fetched.'
    );
  });

  it('encodes a cursor it was handed, as it encodes one it read', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        okJson({ status: 'ok', has_more: false, data: [{ id: 2 }] })
      );

    await fetchCursorBasedPaginatedApi('/items', 'cursor+with spaces');

    expect(String((global.fetch as any).mock.calls[0][0])).toBe(
      'https://api.test.com/items?starting_after=cursor%2Bwith%20spaces'
    );
  });

  // Silence here is what the cap is for: a caller cannot tell a list that ends
  // from one that was cut off, and acts on the partial one as if it were whole.
  it('leaves no marker on a list that ran to its last page', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(okJson({ status: 'ok', has_more: false, data: [1] }));

    const result = await fetchCursorBasedPaginatedApi('/test-path');

    expect(result.ok && result.data.truncated).toBeUndefined();
  });

  it('stops when a page reports has_more without a cursor', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      okJson({
        status: 'ok',
        has_more: true,
        data: [{ id: 1 }],
      })
    );

    const result = await fetchCursorBasedPaginatedApi('/test-path');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      data: {
        items: [{ id: 1 }],
        truncated:
          'Incomplete list: the API reported more items but sent no cursor to continue from.',
      },
    });
    expect(String((global.fetch as any).mock.calls[0][0])).not.toContain(
      'starting_after'
    );
  });

  describe('cursor-based pagination unrolling', () => {
    it('should correctly pass starting_after cursor in subsequent requests', async () => {
      const page1 = {
        status: 'ok',
        has_more: true,
        data: [
          { id: 'item1', name: 'First Item', cursor: 'cursor_abc123' },
          { id: 'item2', name: 'Second Item', cursor: 'cursor_def456' },
        ],
      };

      const page2 = {
        status: 'ok',
        has_more: true,
        data: [
          { id: 'item3', name: 'Third Item', cursor: 'cursor_ghi789' },
          { id: 'item4', name: 'Fourth Item', cursor: 'cursor_jkl012' },
        ],
      };

      const page3 = {
        status: 'ok',
        has_more: false,
        data: [{ id: 'item5', name: 'Fifth Item', cursor: 'cursor_mno345' }],
      };

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(okJson(page1))
        .mockResolvedValueOnce(okJson(page2))
        .mockResolvedValueOnce(okJson(page3));

      global.fetch = fetchMock;

      const result = await fetchCursorBasedPaginatedApi('/projects');

      // Verify the result contains all items from all pages
      expect(result).toEqual({
        ok: true,
        data: {
          items: [
            { id: 'item1', name: 'First Item', cursor: 'cursor_abc123' },
            { id: 'item2', name: 'Second Item', cursor: 'cursor_def456' },
            { id: 'item3', name: 'Third Item', cursor: 'cursor_ghi789' },
            { id: 'item4', name: 'Fourth Item', cursor: 'cursor_jkl012' },
            { id: 'item5', name: 'Fifth Item', cursor: 'cursor_mno345' },
          ],
        },
      });

      // Verify pagination calls
      expect(fetchMock).toHaveBeenCalledTimes(3);

      // First call should not have starting_after parameter
      expect(fetchMock.mock.calls[0][0]).toBe('https://api.test.com/projects');

      // Second call should use the cursor from the last item of page 1
      expect(fetchMock.mock.calls[1][0]).toBe(
        'https://api.test.com/projects?starting_after=cursor_def456'
      );

      // Third call should use the cursor from the last item of page 2
      expect(fetchMock.mock.calls[2][0]).toBe(
        'https://api.test.com/projects?starting_after=cursor_jkl012'
      );
    });

    it('should handle cursors with special characters requiring URL encoding', async () => {
      const page1 = {
        status: 'ok',
        has_more: true,
        data: [
          {
            id: 'item1',
            cursor: 'cursor+with spaces&special=chars',
          },
        ],
      };

      const page2 = {
        status: 'ok',
        has_more: false,
        data: [{ id: 'item2', cursor: 'cursor_normal' }],
      };

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(okJson(page1))
        .mockResolvedValueOnce(okJson(page2));

      global.fetch = fetchMock;

      const result = await fetchCursorBasedPaginatedApi('/items');

      expect(result.ok && result.data.items).toHaveLength(2);

      // Verify the cursor is URL encoded
      const secondCallUrl = fetchMock.mock.calls[1][0];
      expect(secondCallUrl).toContain('starting_after=');
      expect(secondCallUrl).toBe(
        'https://api.test.com/items?starting_after=cursor%2Bwith%20spaces%26special%3Dchars'
      );
    });

    it('should accumulate data correctly across multiple pages', async () => {
      const pages = [
        {
          status: 'ok',
          has_more: true,
          data: [
            { value: 1, cursor: 'c1' },
            { value: 2, cursor: 'c2' },
          ],
        },
        {
          status: 'ok',
          has_more: true,
          data: [
            { value: 3, cursor: 'c3' },
            { value: 4, cursor: 'c4' },
          ],
        },
        {
          status: 'ok',
          has_more: true,
          data: [
            { value: 5, cursor: 'c5' },
            { value: 6, cursor: 'c6' },
          ],
        },
        {
          status: 'ok',
          has_more: false,
          data: [
            { value: 7, cursor: 'c7' },
            { value: 8, cursor: 'c8' },
          ],
        },
      ];

      let callIndex = 0;
      global.fetch = vi
        .fn()
        .mockImplementation(() => Promise.resolve(okJson(pages[callIndex++])));

      const result = await fetchCursorBasedPaginatedApi<{ value: number }>(
        '/data'
      );

      // Verify all items are accumulated
      expect(result.ok && result.data.items).toHaveLength(8);
      expect(result.ok && result.data.items.map((item) => item.value)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8,
      ]);

      // Verify correct number of API calls
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });

    it('should handle empty pages in pagination', async () => {
      const page1 = {
        status: 'ok',
        has_more: true,
        data: [{ id: 'item1', cursor: 'cursor1' }],
      };

      const page2 = {
        status: 'ok',
        has_more: false,
        data: [],
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(okJson(page1))
        .mockResolvedValueOnce(okJson(page2));

      const result = await fetchCursorBasedPaginatedApi('/items');

      expect(result).toEqual({
        ok: true,
        data: { items: [{ id: 'item1', cursor: 'cursor1' }] },
      });
    });

    it('should stop pagination immediately if first page returns error', async () => {
      global.fetch = vi.fn().mockResolvedValue(respondWith(500, ''));

      const result = await fetchCursorBasedPaginatedApi('/items');

      expect(result).toMatchObject({ ok: false, status: 500 });
      // The page and the two retries it earned, all of them the same 500.
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should stop pagination and report the error that ended it', async () => {
      const page1 = {
        status: 'ok',
        has_more: true,
        data: [{ id: 'item1', cursor: 'cursor1' }],
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(okJson(page1))
        .mockResolvedValue(respondWith(500, ''));

      const result = await fetchCursorBasedPaginatedApi('/items');

      expect(result).toMatchObject({
        ok: false,
        status: 500,
        path: '/items?starting_after=cursor1',
      });
      // The page that worked, then the one that did not and its two retries.
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });
});

describe('callApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runThroughBackoff();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // What mounting the tools on the API rests on: with a dispatch in the
  // request context nothing leaves the process, and the same `Response` reaches
  // the caller either way.
  it('serves the request through the context dispatch instead of fetching', async () => {
    global.fetch = vi.fn();
    const dispatch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const result = await requestContext.run({ dispatch }, () =>
      fetchApi<{ id: number }>('/test-path')
    );

    expect(result).toEqual({ ok: true, data: { id: 1 } });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      method: 'GET',
      path: '/test-path',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-api-key',
      }),
    });
  });

  it('reports the status a dispatched request was refused with', async () => {
    const dispatch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'insufficient_scope' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      })
    );

    const result = await requestContext.run({ dispatch }, () =>
      fetchApi('/webhooks?projectId=p1')
    );

    expect(result).toEqual({
      ok: false,
      method: 'GET',
      path: '/webhooks?projectId=p1',
      status: 403,
      body: { code: 'insufficient_scope' },
    });
  });

  it('sends a body to the dispatch unserialized', async () => {
    const dispatch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await requestContext.run({ dispatch }, () =>
      postApi('/webhooks', { url: 'https://example.test' })
    );

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        body: { url: 'https://example.test' },
      })
    );
  });

  it('serializes the body when it goes over the network', async () => {
    global.fetch = vi.fn().mockResolvedValue(okJson({}));

    await postApi('/webhooks', { url: 'https://example.test' });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.test.com/webhooks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.test' }),
      })
    );
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MCP_SERVER_VERSION } from '../../host/assets';
import { requestContext } from '../../lib/context';
import { getContextTool } from './get-context';

vi.mock('../../lib/env', () => ({
  CURRENTS_API_KEY: 'k',
  CURRENTS_API_URL: 'https://api.test.com/v1',
  CURRENTS_MCP_SURFACE: '',
}));

describe('getContextTool', () => {
  const okJson = (body: unknown) => ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    text: async () => JSON.stringify(body),
  });

  beforeEach(() => {
    // `text`, not `json`: the tool reads the body as text and parses it, so a
    // mock answering `json` only reaches the path for a body that cannot be
    // read at all.
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(okJson({ status: 'OK', data: { level: 'run' } }))
    );
    // The backoff is run through rather than waited out; the cases that assert
    // on it count the calls instead.
    vi.spyOn(global, 'setTimeout').mockImplementation(((run: () => void) => {
      run();
      return 0 as unknown as NodeJS.Timeout;
    }) as unknown as typeof setTimeout);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // The commonest transient failure on a large read, and the one a status
  // check cannot see: the headers said 200 and the stream broke after them.
  it('sends a read again when the body breaks after the headers', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'text/markdown' }),
          text: async () => {
            throw new Error('terminated');
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'text/markdown' }),
          text: async () => '# the context',
        })
    );

    const result = await getContextTool.handler({
      run_id: 'run-1',
      format: 'md',
      detail: 'default',
      limit: 10,
      page: 0,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      content: [{ type: 'text', text: '# the context' }],
    });
  });

  it('calls GET /context with query params for run-level', async () => {
    await getContextTool.handler({
      run_id: 'run-1',
      format: 'json',
      detail: 'default',
      limit: 10,
      page: 0,
    });

    expect(fetch).toHaveBeenCalledWith(
      'https://api.test.com/v1/context?run_id=run-1&format=json&detail=default&limit=10&page=0',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer k',
          Accept: 'application/json',
          // This tool builds its own headers for the markdown `Accept`, so it
          // is the one that would keep an old User-Agent if the shared helper
          // changed without it.
          'User-Agent': `currents-app/${MCP_SERVER_VERSION} (standalone; stdio)`,
        }),
      })
    );
  });

  // This tool reads markdown, so it cannot go through the verb helpers that
  // carry the retry — and a read is the call the retry is most for.
  it('sends a read the API failed to serve again', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          headers: new Headers(),
          text: async () => 'unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'text/markdown' }),
          text: async () => '# the context',
        })
    );

    const result = await getContextTool.handler({
      run_id: 'run-1',
      format: 'md',
      detail: 'default',
      limit: 10,
      page: 0,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    // The 503 never reaches the caller: what it reads is the markdown the
    // second attempt got.
    expect(result).toEqual({
      content: [{ type: 'text', text: '# the context' }],
    });
  });

  it('authenticates with the request-scoped key over the env key', async () => {
    await requestContext.run({ apiKey: 'req-key' }, () =>
      getContextTool.handler({
        run_id: 'run-1',
        format: 'json',
        detail: 'default',
        limit: 10,
        page: 0,
      })
    );

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer req-key' }),
      })
    );
  });

  it('reports the status and body of a failed context request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers(),
        text: async () =>
          JSON.stringify({ message: 'missing scope runs:read' }),
      })
    );

    const result = await getContextTool.handler({ run_id: 'run-1' });

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toBe(
      'Failed to retrieve context: GET /context?run_id=run-1&format=json&detail=default&limit=10&page=0: HTTP 403 {"message":"missing scope runs:read"}'
    );
  });

  it('reads an empty JSON body as an empty document rather than an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        text: async () => '',
      })
    );

    const result = await getContextTool.handler({ run_id: 'run-1' });

    expect(result).not.toHaveProperty('isError');
    expect(result.content[0].text).toBe('{}');
  });

  it('keeps the status when the response body cannot be read', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        headers: new Headers(),
        text: async () => {
          throw new Error('terminated');
        },
      })
    );

    const result = await getContextTool.handler({ run_id: 'run-1' });

    expect(result).toMatchObject({ isError: true });
    expect(result.content[0].text).toBe(
      'Failed to retrieve context: GET /context?run_id=run-1&format=json&detail=default&limit=10&page=0: HTTP 502 body unreadable (terminated)'
    );
  });

  it('rejects test_id without instance_id', async () => {
    const result = await getContextTool.handler({
      run_id: 'run-1',
      test_id: 't1',
    } as any);

    expect(result.content[0].type).toBe('text');
    expect(String((result.content[0] as { text: string }).text)).toContain(
      'Invalid parameters'
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});

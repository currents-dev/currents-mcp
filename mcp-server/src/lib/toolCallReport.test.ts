import { describe, expect, it, vi } from 'vitest';
import { requestContext, ToolCallReport, ToolRefusalReport } from './context';
import { logger } from './logger';
import { callApi } from './request';
import {
  recordApiStatus,
  reportRefusedToolCalls,
  reportToolCall,
} from './toolCallReport';

vi.mock('./logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

type Handler = (
  args: Record<string, unknown>,
  extra: unknown
) => Promise<{ content: unknown[]; isError?: boolean }>;

const extra = {} as never;

const withListener = <T>(
  onToolCall: (report: ToolCallReport) => void,
  run: () => T
) => requestContext.run({ apiKey: 'key', onToolCall }, run);

describe('reportToolCall', () => {
  it('reports the tool and the status of its last API call', async () => {
    const onToolCall = vi.fn();
    const handler: Handler = async () => {
      recordApiStatus(200);
      recordApiStatus(204);
      return { content: [] };
    };

    const result = await withListener(onToolCall, () =>
      reportToolCall('currents-get-projects', handler as never)({}, extra)
    );

    expect(result).toEqual({ content: [] });
    expect(onToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: 'currents-get-projects',
        isError: false,
        apiStatus: 204,
      })
    );
  });

  it('reports an error result with the status that failed it', async () => {
    const onToolCall = vi.fn();
    const handler: Handler = async () => {
      recordApiStatus(403);
      return { content: [], isError: true };
    };

    await withListener(onToolCall, () =>
      reportToolCall('currents-delete-run', handler as never)({}, extra)
    );

    expect(onToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: 'currents-delete-run',
        isError: true,
        apiStatus: 403,
      })
    );
  });

  // `currents-get-context` calls `callApi` itself rather than through the verb
  // helpers, so the status has to be recorded there to be seen at all.
  it('records the status of a call made through callApi directly', async () => {
    const onToolCall = vi.fn();
    const dispatch = vi.fn(async () => new Response(null, { status: 404 }));
    const handler: Handler = async () => {
      await callApi({ method: 'GET', path: '/context', headers: {} });
      return { content: [], isError: true };
    };

    await requestContext.run({ apiKey: 'key', dispatch, onToolCall }, () =>
      reportToolCall('currents-get-context', handler as never)({}, extra)
    );

    expect(onToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: 'currents-get-context',
        isError: true,
        apiStatus: 404,
      })
    );
  });

  it('records a call that produced no response as having no status', async () => {
    const onToolCall = vi.fn();
    const dispatch = vi.fn(async () => {
      throw new Error('socket hang up');
    });
    const handler: Handler = async () => {
      recordApiStatus(200);
      await callApi({ method: 'GET', path: '/context', headers: {} }).catch(
        () => undefined
      );
      return { content: [], isError: true };
    };

    await requestContext.run({ apiKey: 'key', dispatch, onToolCall }, () =>
      reportToolCall('tool', handler as never)({}, extra)
    );

    expect(onToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: 'tool',
        isError: true,
        apiStatus: null,
      })
    );
  });

  it('reports a tool that made no API call with no status', async () => {
    const onToolCall = vi.fn();
    const handler: Handler = async () => ({ content: [] });

    await withListener(onToolCall, () =>
      reportToolCall('tool', handler as never)({}, extra)
    );

    expect(onToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: 'tool',
        isError: false,
        apiStatus: null,
      })
    );
  });

  // The SDK answers a throw as a result with `isError`, so that is what the
  // client sees and what the report says.
  it('reports a handler that threw as an error, and rethrows', async () => {
    const onToolCall = vi.fn();
    const handler: Handler = async () => {
      recordApiStatus(200);
      throw new Error('boom');
    };

    await expect(
      withListener(onToolCall, () =>
        reportToolCall('tool', handler as never)({}, extra)
      )
    ).rejects.toThrow('boom');

    expect(onToolCall).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: 'tool',
        isError: true,
        apiStatus: 200,
      })
    );
  });

  it('runs the handler as it is when no listener is set', async () => {
    const handler = vi.fn(async () => ({ content: [] }));

    const result = await requestContext.run({ apiKey: 'key' }, () =>
      reportToolCall('tool', handler as never)({ a: 1 }, extra)
    );

    expect(result).toEqual({ content: [] });
    expect(handler).toHaveBeenCalledWith({ a: 1 }, extra);
  });

  it('runs the handler as it is outside any request context', async () => {
    const handler = vi.fn(async () => ({ content: [] }));

    await reportToolCall('tool', handler as never)({}, extra);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not let a failing listener cost the caller the result', async () => {
    const onToolCall = vi.fn(() => {
      throw new Error('bus down');
    });
    const handler: Handler = async () => ({ content: ['ok'] });

    const result = await withListener(onToolCall, () =>
      reportToolCall('tool', handler as never)({}, extra)
    );

    expect(result).toEqual({ content: ['ok'] });
  });

  it('logs a listener whose promise rejects instead of leaving it unhandled', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    const onToolCall = vi.fn(async () => {
      throw new Error('bus down');
    });
    const handler: Handler = async () => ({ content: ['ok'] });

    const result = await withListener(onToolCall, () =>
      reportToolCall('tool', handler as never)({}, extra)
    );
    // Let the rejection reach the unhandledRejection queue, were it unhandled.
    await new Promise((resolve) => setImmediate(resolve));
    process.off('unhandledRejection', unhandled);

    expect(result).toEqual({ content: ['ok'] });
    expect(unhandled).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('bus down')
    );
  });

  // A batched `POST` runs its tool calls concurrently; each must read only
  // the statuses of its own `/v1` calls.
  it('keeps the statuses of concurrent tool calls apart', async () => {
    const reports: ToolCallReport[] = [];
    const settle = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const slow: Handler = async () => {
      recordApiStatus(500);
      await settle(10);
      return { content: [], isError: true };
    };
    const fast: Handler = async () => {
      await settle(1);
      recordApiStatus(200);
      return { content: [] };
    };

    await withListener(
      (report) => reports.push(report),
      () =>
        Promise.all([
          reportToolCall('slow', slow as never)({}, extra),
          reportToolCall('fast', fast as never)({}, extra),
        ])
    );

    expect(reports).toEqual([
      expect.objectContaining({ tool: 'fast', isError: false, apiStatus: 200 }),
      expect.objectContaining({ tool: 'slow', isError: true, apiStatus: 500 }),
    ]);
  });
});

describe('reportToolCall timing and arguments', () => {
  it('reports the duration and the sorted argument names, never the values', async () => {
    const onToolCall = vi.fn();
    const handler: Handler = async () => ({ content: [] });

    await withListener(onToolCall, () =>
      reportToolCall('currents-get-runs', handler as never)(
        { projectId: 'secret-project', branch: 'main', limit: undefined },
        extra
      )
    );

    const [report] = onToolCall.mock.calls[0]!;
    expect(report.argumentKeys).toEqual(['branch', 'projectId']);
    expect(report.durationMs).toEqual(expect.any(Number));
    expect(JSON.stringify(report)).not.toContain('secret-project');
  });

  it('reports no argument names for a tool without an input schema', async () => {
    const onToolCall = vi.fn();
    const handler = async () => ({ content: [] });

    await withListener(onToolCall, () =>
      (
        reportToolCall('currents-get-projects', handler as never) as never as (
          extra: unknown
        ) => Promise<unknown>
      )(extra)
    );

    expect(onToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ argumentKeys: [] })
    );
  });
});

describe('reportRefusedToolCalls', () => {
  const refusal = (name: unknown): ToolRefusalReport =>
    name === 'currents-get-runs'
      ? { tool: name, reason: 'invalid_arguments' }
      : { tool: null, reason: 'unknown_tool' };

  const body = [
    { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'a' } },
    {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'currents-get-runs' },
    },
    { jsonrpc: '2.0', id: 3, method: 'tools/list' },
    { jsonrpc: '2.0', method: 'notifications/initialized' },
  ];

  const serveReaching = (ids: number[]) => async () => {
    const handler: Handler = async () => ({ content: [] });
    for (const requestId of ids) {
      await reportToolCall('tool', handler as never)({}, {
        requestId,
      } as never);
    }
    return { ok: true };
  };

  it('reports each tools/call whose handler did not run', async () => {
    const onToolRefused = vi.fn();

    const result = await requestContext.run(
      { apiKey: 'key', onToolCall: vi.fn(), onToolRefused },
      () => reportRefusedToolCalls(body, refusal, serveReaching([1]))
    );

    expect(result).toEqual({ ok: true });
    expect(onToolRefused.mock.calls).toEqual([
      [{ tool: 'currents-get-runs', reason: 'invalid_arguments' }],
    ]);
  });

  it('reports a single refused message', async () => {
    const onToolRefused = vi.fn();

    await requestContext.run({ apiKey: 'key', onToolRefused }, () =>
      reportRefusedToolCalls(body[0], refusal, serveReaching([]))
    );

    expect(onToolRefused).toHaveBeenCalledWith({
      tool: null,
      reason: 'unknown_tool',
    });
  });

  it('reports nothing when the transport answered without dispatching', async () => {
    const onToolRefused = vi.fn();

    await requestContext.run({ apiKey: 'key', onToolRefused }, () =>
      reportRefusedToolCalls(body, refusal, async () => ({ ok: false }))
    );

    expect(onToolRefused).not.toHaveBeenCalled();
  });

  it('reports nothing when serving threw', async () => {
    const onToolRefused = vi.fn();

    await expect(
      requestContext.run({ apiKey: 'key', onToolRefused }, () =>
        reportRefusedToolCalls(body, refusal, async () => {
          throw new Error('boom');
        })
      )
    ).rejects.toThrow('boom');

    expect(onToolRefused).not.toHaveBeenCalled();
  });
});

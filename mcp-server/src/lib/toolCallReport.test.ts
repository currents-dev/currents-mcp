import { describe, expect, it, vi } from 'vitest';
import { requestContext, ToolCallReport } from './context';
import { logger } from './logger';
import { callApi } from './request';
import { recordApiStatus, reportToolCall } from './toolCallReport';

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
    expect(onToolCall).toHaveBeenCalledWith({
      tool: 'currents-get-projects',
      isError: false,
      apiStatus: 204,
    });
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

    expect(onToolCall).toHaveBeenCalledWith({
      tool: 'currents-delete-run',
      isError: true,
      apiStatus: 403,
    });
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

    expect(onToolCall).toHaveBeenCalledWith({
      tool: 'currents-get-context',
      isError: true,
      apiStatus: 404,
    });
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

    expect(onToolCall).toHaveBeenCalledWith({
      tool: 'tool',
      isError: true,
      apiStatus: null,
    });
  });

  it('reports a tool that made no API call with no status', async () => {
    const onToolCall = vi.fn();
    const handler: Handler = async () => ({ content: [] });

    await withListener(onToolCall, () =>
      reportToolCall('tool', handler as never)({}, extra)
    );

    expect(onToolCall).toHaveBeenCalledWith({
      tool: 'tool',
      isError: false,
      apiStatus: null,
    });
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

    expect(onToolCall).toHaveBeenCalledWith({
      tool: 'tool',
      isError: true,
      apiStatus: 200,
    });
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
      { tool: 'fast', isError: false, apiStatus: 200 },
      { tool: 'slow', isError: true, apiStatus: 500 },
    ]);
  });
});

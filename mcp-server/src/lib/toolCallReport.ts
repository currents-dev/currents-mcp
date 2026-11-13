import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  AnySchema,
  ZodRawShapeCompat,
} from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  getToolCallListener,
  requestContext,
  ToolCallReport,
  ToolRefusalReport,
} from './context';
import { logger } from './logger';

type ApiCallRecord = { status: number | null };

/**
 * One record per tool call rather than per request: a Streamable HTTP `POST`
 * can carry a batch, and the tool calls in it run concurrently, so a record on
 * the request context would hand one call the status of another's `/v1` call.
 */
const apiCallRecord = new AsyncLocalStorage<ApiCallRecord>();

/**
 * Called by `lib/request.ts` after every `/v1` call, with null for one that
 * produced no response. Outside a reported tool call there is no record and
 * this does nothing.
 */
export function recordApiStatus(status: number | null): void {
  const record = apiCallRecord.getStore();
  if (record) {
    record.status = status;
  }
}

type AnyHandler = (...params: unknown[]) => unknown;

type RequestId = string | number;

/**
 * The JSON-RPC ids of the `tools/call` requests whose handler ran, for the
 * HTTP request `reportRefusedToolCalls` serves. The SDK answers a refused call
 * itself, with an `isError` result and no hook, so a call missing from here
 * once the transport has answered is one it refused.
 */
const reachedToolCalls = new AsyncLocalStorage<Set<RequestId>>();

/** The handler's parsed arguments, before the SDK's `extra`, which is last. */
function argumentKeys(params: unknown[]): string[] {
  const args = params.length > 1 ? params[0] : undefined;
  if (!args || typeof args !== 'object') {
    return [];
  }
  return Object.entries(args)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)
    .sort();
}

/**
 * The handler, told to the host's `onToolCall` once it has settled. With no
 * listener set — the stdio server sets none — the handler runs as it is.
 *
 * A handler that throws is reported as an error: the SDK turns the throw into a
 * result with `isError`, so that is what the client sees. The listener's own
 * failure is logged and dropped, because it must not cost the caller the
 * result the tool produced.
 */
export function reportToolCall<
  Args extends undefined | ZodRawShapeCompat | AnySchema,
>(tool: string, handler: ToolCallback<Args>): ToolCallback<Args> {
  const run = handler as AnyHandler;

  const reporting = async (...params: unknown[]) => {
    const extra = params[params.length - 1] as
      | { requestId?: RequestId }
      | undefined;
    if (extra?.requestId !== undefined) {
      reachedToolCalls.getStore()?.add(extra.requestId);
    }
    const onToolCall = getToolCallListener();
    if (!onToolCall) {
      return run(...params);
    }

    const record: ApiCallRecord = { status: null };
    const startedAt = performance.now();
    let isError = true;
    try {
      const result = (await apiCallRecord.run(record, () =>
        run(...params)
      )) as { isError?: boolean };
      isError = result.isError === true;
      return result;
    } finally {
      report<ToolCallReport>(onToolCall, tool, {
        tool,
        isError,
        apiStatus: record.status,
        durationMs: Math.round(performance.now() - startedAt),
        argumentKeys: argumentKeys(params),
      });
    }
  };

  return reporting as ToolCallback<Args>;
}

function report<R>(
  listener: (report: R) => void | Promise<void>,
  tool: string | null,
  toolCall: R
): void {
  const logFailure = (error: unknown) =>
    logger.error(`Error reporting the ${tool} call: ${String(error)}`);
  try {
    // Not awaited: the result is not held back by what the listener does with
    // the report. A rejection is caught so it does not surface as unhandled.
    Promise.resolve(listener(toolCall)).catch(logFailure);
  } catch (error) {
    logFailure(error);
  }
}

/** The `tools/call` requests in a parsed body, one message or a batch. */
function toolCalls(body: unknown): { id: RequestId; name: unknown }[] {
  const messages: unknown[] = Array.isArray(body) ? body : [body];
  return messages.flatMap((message) => {
    const { method, id, params } = (message ?? {}) as {
      method?: unknown;
      id?: unknown;
      params?: { name?: unknown };
    };
    return method === 'tools/call' &&
      (typeof id === 'string' || typeof id === 'number')
      ? [{ id, name: params?.name }]
      : [];
  });
}

/**
 * Runs `serve` and tells the host's `onToolRefused` about each `tools/call` in
 * `body` whose handler `serve` did not reach. `refusal` says why, from the tool
 * name.
 *
 * Only for a 2xx answer, which is what the transport sends once it has
 * dispatched the messages, an `isError` tool result included. It answers 4xx
 * without dispatching anything for a wrong `Accept` or `Content-Type`, an
 * `mcp-protocol-version` it does not support, or a batch it will not take;
 * nothing read those calls' arguments, so they are not refusals. Nothing is
 * reported when `serve` throws either: the host answers with an error of its
 * own.
 */
export async function reportRefusedToolCalls<T extends { ok: boolean }>(
  body: unknown,
  refusal: (name: unknown) => ToolRefusalReport,
  serve: () => Promise<T>
): Promise<T> {
  const onToolRefused = requestContext.getStore()?.onToolRefused;
  if (!onToolRefused) {
    return serve();
  }
  const reached = new Set<RequestId>();
  const result = await reachedToolCalls.run(reached, serve);
  if (!result.ok) {
    return result;
  }
  for (const call of toolCalls(body)) {
    if (!reached.has(call.id)) {
      const refused = refusal(call.name);
      report(onToolRefused, refused.tool, refused);
    }
  }
  return result;
}

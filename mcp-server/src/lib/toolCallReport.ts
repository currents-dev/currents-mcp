import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type {
  AnySchema,
  ZodRawShapeCompat,
} from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { getToolCallListener, RequestContext, ToolCallReport } from './context';
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
    const onToolCall = getToolCallListener();
    if (!onToolCall) {
      return run(...params);
    }

    const record: ApiCallRecord = { status: null };
    let isError = true;
    try {
      const result = (await apiCallRecord.run(record, () =>
        run(...params)
      )) as { isError?: boolean };
      isError = result.isError === true;
      return result;
    } finally {
      report(onToolCall, { tool, isError, apiStatus: record.status });
    }
  };

  return reporting as ToolCallback<Args>;
}

function report(
  onToolCall: NonNullable<RequestContext['onToolCall']>,
  toolCall: ToolCallReport
): void {
  const logFailure = (error: unknown) =>
    logger.error(`Error reporting the ${toolCall.tool} call: ${String(error)}`);
  try {
    // Not awaited: the result is not held back by what the listener does with
    // the report. A rejection is caught so it does not surface as unhandled.
    Promise.resolve(onToolCall(toolCall)).catch(logFailure);
  } catch (error) {
    logFailure(error);
  }
}

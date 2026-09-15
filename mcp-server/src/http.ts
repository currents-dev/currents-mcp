import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RequestContext, requestContext } from './lib/context';
import { logger } from './lib/logger';
import { createMcpServer } from './server';

/**
 * Answers one MCP request over Streamable HTTP.
 *
 * A server and a transport per request, with no session id: the host
 * authenticates every request on its own, so there is no state to carry between
 * two of them, and nothing has to be routed back to the process that served the
 * last one. `enableJsonResponse` answers each call with a single JSON body
 * rather than an SSE stream, which is all a tool call needs — none of the tools
 * send progress or logging notifications while one runs.
 *
 * `context` is applied around the whole exchange rather than around the tool
 * call, because the tool handlers are reached from inside `handleRequest` and
 * `AsyncLocalStorage` is how they read it (`lib/context.ts`).
 *
 * The caller has already parsed the body: the transport takes it as an argument
 * rather than reading the stream, so the host's `express.json()` and this agree
 * on one parse.
 */
export async function handleMcpRequest(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
  context: RequestContext
): Promise<void> {
  const server = createMcpServer(context);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  res.on('close', () => {
    void transport.close().catch((error) => {
      logger.error(`Error closing MCP transport: ${String(error)}`);
    });
    void server.close().catch((error) => {
      logger.error(`Error closing MCP server: ${String(error)}`);
    });
  });

  await requestContext.run(context, async () => {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
}

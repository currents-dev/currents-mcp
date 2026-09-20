import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
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
 * The web-standard transport rather than the node one, which is a wrapper over
 * this same class that converts the node request with `@hono/node-server`. That
 * conversion needs a request backed by a real socket, and the api Lambda has
 * none: `@vendia/serverless-express` builds a stand-in, and the conversion
 * answered `400` with an empty body for every call while the identical chain on
 * a socket answered `200`. Going through the web types directly is what the SDK
 * documents for a host that is not a node HTTP server, and it removes the
 * difference between the two runtimes rather than working around it.
 *
 * The request is rebuilt rather than forwarded because nothing here reads its
 * stream: the host has already parsed the body, and `parsedBody` is what the
 * transport reads, so `express.json()` and this agree on one parse.
 */
export async function handleMcpRequest(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
  context: RequestContext
): Promise<void> {
  const server = createMcpServer(context);
  const transport = new WebStandardStreamableHTTPServerTransport({
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
    const response = await transport.handleRequest(toWebRequest(req), {
      parsedBody: req.body,
    });
    await writeNodeResponse(res, response);
  });
}

/**
 * The node request as the web `Request` the transport takes.
 *
 * No body: the transport reads `parsedBody` instead, and attaching one would
 * mean reading a stream `express.json()` has already consumed. `duplex` is
 * therefore not needed either.
 *
 * The URL is absolute because `Request` requires one. Only its path and query
 * are read — the transport matches the method and the headers — so the origin
 * is reconstructed from the `host` header and a placeholder when a caller sent
 * none, rather than being carried through to anything a client sees.
 */
function toWebRequest(req: IncomingMessage): Request {
  const host = req.headers.host ?? 'mcp.invalid';
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }
    // A header node parsed as a list arrives as an array; `set-cookie` is the
    // only one it always does that for, and a request carries none.
    for (const one of Array.isArray(value) ? value : [value]) {
      headers.append(name, one);
    }
  }
  return new Request(new URL(req.url ?? '/', `https://${host}`), {
    method: req.method ?? 'POST',
    headers,
  });
}

/**
 * The transport's web `Response`, written to the node response the host gave us.
 *
 * Read in full and handed to `end` in one call, rather than written chunk by
 * chunk. `enableJsonResponse` makes every exchange a single JSON body, so there
 * is no stream to preserve, and the two ways of pacing chunks against a
 * consumer are each unavailable somewhere this runs:
 *
 * - `drain` is never emitted under `@vendia/serverless-express`, whose response
 *   carries a socket stand-in with `on` set to `Function.prototype`.
 * - the `write` callback is dropped by `compression`, which replaces `write`
 *   with a two-parameter version that forwards to a zlib stream and returns.
 *
 * Either one silently never resolves, which on the api Lambda is a hung
 * invocation and a 502 rather than an answer. Waiting on neither is what makes
 * this behave the same under a socket, a compression middleware, and the
 * Lambda's stand-in.
 *
 * If a later change turns `enableJsonResponse` off to stream notifications,
 * this has to write through as chunks arrive — and `compression` on the same
 * route has to learn about SSE at the same time, for the same reason.
 */
async function writeNodeResponse(
  res: ServerResponse,
  response: Response
): Promise<void> {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => {
    res.setHeader(name, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  res.end(body.length > 0 ? body : undefined);
}

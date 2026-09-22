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
    await writeNodeResponse(res, response, context, req.body);
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
  response: Response,
  context: RequestContext,
  parsedBody: unknown
): Promise<void> {
  res.statusCode = response.status;
  // Each transport header against whatever stood under that name first. The
  // 413 below takes the response back to what the host's middleware set, and
  // `setHeader` matches case-insensitively, so a transport header sharing a
  // name with one of theirs overwrites it — recording only the names would
  // then drop the host's header instead of restoring its value.
  const replaced = new Map<string, number | string | string[] | undefined>();
  response.headers.forEach((value, name) => {
    if (!replaced.has(name)) {
      replaced.set(name, res.getHeader(name));
    }
    res.setHeader(name, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const body = Buffer.from(await response.arrayBuffer());
  const tooLarge = context.responseTooLarge?.(body);
  // Not truthiness: the contract is `string | undefined`, so an
  // implementation refusing with an empty message still refuses.
  if (tooLarge !== undefined) {
    writeTooLarge(res, tooLarge, parsedBody, replaced);
    return;
  }
  res.end(body.length > 0 ? body : undefined);
}

/**
 * The refusal that replaces a result the host cannot send.
 *
 * A JSON-RPC error rather than a tool result with `isError`, because the
 * result is what does not fit: rebuilding it as an error would mean parsing
 * the body we just decided not to send. 413 is the status `bodyRefused` uses
 * for the request side of the same limit.
 *
 * The transport's headers go back to what they were before it wrote them —
 * they describe a body that is no longer being sent, `content-length` among
 * them. What a host's middleware put on the response before the handler ran
 * stays, whether or not the transport overwrote it: `mcpCors` sets
 * `Access-Control-Allow-Origin` there, and without it a browser-hosted client
 * reads this 413 as a network failure rather than as the status it is, which
 * is the one thing the message here exists to tell it.
 *
 * The id is read off the request so a client holding several calls in flight
 * learns which one will never resolve, and is null for a batch, where one
 * response would otherwise claim one request out of several.
 */
function writeTooLarge(
  res: ServerResponse,
  message: string,
  parsedBody: unknown,
  replaced: ReadonlyMap<string, number | string | string[] | undefined>
): void {
  for (const [name, previous] of replaced) {
    if (previous === undefined) {
      res.removeHeader(name);
    } else {
      res.setHeader(name, previous);
    }
  }
  const id =
    parsedBody && typeof parsedBody === 'object' && !Array.isArray(parsedBody)
      ? (parsedBody as { id?: unknown }).id
      : undefined;
  const body = Buffer.from(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message },
      id: typeof id === 'string' || typeof id === 'number' ? id : null,
    }),
    'utf8'
  );
  res.statusCode = 413;
  res.setHeader('content-type', 'application/json');
  res.end(body);
}

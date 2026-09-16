#!/usr/bin/env node
import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import { fileURLToPath } from 'node:url';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { requestContext } from '../lib/context';
import { logger } from '../lib/logger';
import { createMcpServer } from '../server';
import { FeaturesError, featuresFromLauncher } from './features';
import type { OrgFeatures } from './scopes';
import './logging';

const PORT = Number(process.env.PORT ?? 3000);
const MCP_PATH = '/mcp';

/**
 * JSON-RPC 2.0 error codes used by the MCP HTTP transport.
 * MCP over HTTP speaks JSON-RPC, so parse failures, internal errors, and
 * unsupported methods are reported with standard JSON-RPC error codes.
 */
const JSON_RPC_ERROR = {
  PARSE_ERROR: -32700,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
} as const;

/**
 * Pulls the caller's Currents API key out of the inbound Authorization header.
 *
 * The MCP server performs no authentication itself: whatever token arrives is
 * passed through to the Currents API, which is the sole auth authority. A
 * missing or invalid key therefore surfaces as the Currents API's own 401.
 */
export function extractApiKey(req: IncomingMessage): string | undefined {
  const auth = req.headers.authorization?.trim();
  if (!auth) {
    return undefined;
  }
  const match = /^Bearer\s+(.+)$/i.exec(auth);
  return (match ? match[1] : auth).trim();
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  return raw ? JSON.parse(raw) : undefined;
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function jsonRpcError(code: number, message: string) {
  return { jsonrpc: '2.0' as const, error: { code, message }, id: null };
}

/**
 * Handles a single MCP request in stateless mode: a fresh server + transport
 * per request, with the per-request API key carried via AsyncLocalStorage so
 * the shared tools/api layer needs no changes.
 */
async function handleMcpPost(
  req: IncomingMessage,
  res: ServerResponse,
  orgFeatures: OrgFeatures
): Promise<void> {
  let body: unknown;
  try {
    body = await readJsonBody(req);
  } catch {
    sendJson(res, 400, jsonRpcError(JSON_RPC_ERROR.PARSE_ERROR, 'Parse error'));
    return;
  }

  const apiKey = extractApiKey(req);
  const server = createMcpServer({ orgFeatures });
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on('close', () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await requestContext.run({ apiKey }, () =>
      transport.handleRequest(req, res, body)
    );
  } catch (error) {
    logger.error({ err: error }, 'Error handling MCP request');
    if (!res.headersSent) {
      sendJson(
        res,
        500,
        jsonRpcError(JSON_RPC_ERROR.INTERNAL_ERROR, 'Internal server error')
      );
    }
  }
}

/**
 * @param orgFeatures the flags this process was started for, as with the stdio
 * server: whoever launched it did so for one organization. Resolved here
 * rather than per request so a bad `CURRENTS_MCP_FEATURES` fails the server
 * instead of rejecting inside a `void`ed handler, where it would leave
 * `/healthz` answering for a server that cannot serve `/mcp`.
 */
export function createHttpServer(
  orgFeatures: OrgFeatures = featuresFromLauncher()
): Server {
  return createServer((req, res) => {
    const url = new URL(
      req.url ?? '/',
      `http://${req.headers.host ?? 'localhost'}`
    );

    if (req.method === 'GET' && url.pathname === '/healthz') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (url.pathname === MCP_PATH) {
      if (req.method === 'POST') {
        void handleMcpPost(req, res, orgFeatures);
        return;
      }
      // Stateless: no standalone SSE stream (GET) or session teardown (DELETE).
      res.writeHead(405, { Allow: 'POST', 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify(
          jsonRpcError(JSON_RPC_ERROR.SERVER_ERROR, 'Method not allowed')
        )
      );
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  });
}

export function start(port: number = PORT): Server {
  const httpServer = createHttpServer();
  httpServer.listen(port, () => {
    logger.debug(
      `🚀 Currents MCP HTTP server listening on :${port}${MCP_PATH}`
    );
  });
  return httpServer;
}

// Only start listening when executed directly (not when imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    start();
  } catch (error) {
    if (error instanceof FeaturesError) {
      logger.error(error.message);
      process.exit(1);
    }
    throw error;
  }
}

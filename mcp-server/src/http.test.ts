import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMcpRequest } from './http';
import { ApiDispatch, RequestContext } from './lib/context';

vi.mock('./lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

/**
 * The transport against a real MCP client, which is what the endpoint has to
 * satisfy: the handshake, the tool catalog and a tool call, on one stateless
 * `POST` per exchange. The API's own suites post JSON-RPC by hand and cannot
 * say that a client's `initialize` is answered.
 */

const dispatch = vi.fn<ApiDispatch>();

/** What the host established about the caller, applied to every request. */
let context: RequestContext = { apiKey: 'key-1', dispatch };

/** The host's part: parse the body, then hand the pair to the transport. */
const serve = () =>
  createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      Object.assign(req, { body: raw ? JSON.parse(raw) : undefined });
      void handleMcpRequest(req, res, context);
    });
  });

let server: Server;
let client: Client;

const connect = async () => {
  const { port } = server.address() as AddressInfo;
  client = new Client({ name: 'test-client', version: '0.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`))
  );
};

beforeEach(async () => {
  dispatch.mockReset();
  context = { apiKey: 'key-1', dispatch };
  server = serve();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  await connect();
});

afterEach(async () => {
  await client.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('handleMcpRequest', () => {
  it('completes the handshake and names the server', () => {
    expect(client.getServerVersion()).toMatchObject({ name: 'currents' });
  });

  it('lists the tools', async () => {
    const { tools } = await client.listTools();

    expect(tools.map((tool) => tool.name)).toContain('currents-get-projects');
  });

  it('answers a tool call from the dispatch', async () => {
    dispatch.mockResolvedValue(
      new Response(JSON.stringify({ status: 'OK', data: { runId: 'run-1' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    const result = await client.callTool({
      name: 'currents-get-run-details',
      arguments: { runId: 'run-1' },
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/runs/run-1' })
    );
    expect(JSON.stringify(result.content)).toContain('run-1');
  });

  // Each exchange gets a server and a transport of its own, so nothing may
  // depend on the one before it.
  it('serves a second exchange with no session to carry', async () => {
    dispatch.mockResolvedValue(
      new Response(JSON.stringify({ status: 'OK', data: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );

    await client.listTools();
    const result = await client.callTool({
      name: 'currents-get-projects',
      arguments: {},
    });

    // `callTool` resolves for a tool that reported a failure too, so the flag
    // is what says the second exchange was served rather than refused.
    expect(result.isError).not.toBe(true);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', path: '/projects' })
    );
  });

  describe('for a token granted results:read', () => {
    beforeEach(async () => {
      await client.close();
      context = { ...context, oauthScopes: ['results:read'] };
      await connect();
    });

    it('lists only the tools that scope reaches', async () => {
      const { tools } = await client.listTools();
      const names = tools.map((tool) => tool.name);

      expect(names).toContain('currents-get-run-details');
      expect(names).not.toContain('currents-delete-run');
      expect(names).not.toContain('currents-get-projects');
    });

    // Named anyway — from memory of a fuller list, or guessed — the tool is
    // refused before any request is built, so `/v1` is never asked. The SDK
    // reports an unknown tool as a failed result rather than a JSON-RPC error,
    // which is what puts the refusal in front of the model.
    it('refuses a call to a tool outside the grant without dispatching it', async () => {
      const result = await client.callTool({
        name: 'currents-delete-run',
        arguments: { runId: 'run-1' },
      });

      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).toContain(
        'Tool currents-delete-run not found'
      );
      expect(dispatch).not.toHaveBeenCalled();
    });

    it('still serves a tool the grant reaches', async () => {
      dispatch.mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'OK', data: { runId: 'run-1' } }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );

      const result = await client.callTool({
        name: 'currents-get-run-details',
        arguments: { runId: 'run-1' },
      });

      expect(result.isError).not.toBe(true);
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'GET', path: '/runs/run-1' })
      );
    });
  });

  describe('for a read API key', () => {
    beforeEach(async () => {
      await client.close();
      context = { ...context, apiKeyScope: 'read' };
      await connect();
    });

    it('lists only the tools a read key may call', async () => {
      const { tools } = await client.listTools();
      const names = tools.map((tool) => tool.name);

      expect(names).toContain('currents-get-run-details');
      expect(names).toContain('currents-get-projects');
      expect(names).toContain('currents-list-jira-projects');
      expect(names).not.toContain('currents-delete-run');
      expect(names).not.toContain('currents-create-jira-issue');
    });

    it('refuses a call to a write tool without dispatching it', async () => {
      const result = await client.callTool({
        name: 'currents-delete-run',
        arguments: { runId: 'run-1' },
      });

      expect(result.isError).toBe(true);
      expect(JSON.stringify(result.content)).toContain(
        'Tool currents-delete-run not found'
      );
      expect(dispatch).not.toHaveBeenCalled();
    });
  });
});

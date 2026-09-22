import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMcpRequest } from './http';
import { ApiDispatch, RequestContext } from './lib/context';
import { getSkills } from './skills';

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

/**
 * Headers a test wants the host to have set before the handler ran, on top of
 * the one every test gets. Used for a name the transport sets too, which is
 * the case where restoring and removing differ.
 */
let hostHeaders: Record<string, string> = {};

/** The host's part: parse the body, then hand the pair to the transport. */
const serve = () =>
  createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      Object.assign(req, { body: raw ? JSON.parse(raw) : undefined });
      // Stands in for what the API mounts above this handler — `mcpCors` sets
      // its headers before the route runs, and they have to survive whatever
      // the handler answers.
      res.setHeader('x-set-by-middleware', 'kept');
      for (const [name, value] of Object.entries(hostHeaders)) {
        res.setHeader(name, value);
      }
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

  // Both halves over the transport, which is where a host meets them:
  // `instructions` comes back from `initialize`, and `prompts/list` needs the
  // capability the registration declares.
  describe('skills', () => {
    it('names them in the instructions the handshake returns', () => {
      expect(client.getInstructions()).toContain('collect-evidence');
    });

    it('lists one prompt per skill', async () => {
      const expected = getSkills().map((skill) => skill.name);
      // Both sides are empty if no skill shipped, which would pass without
      // serving anything.
      expect(expected.length).toBeGreaterThan(0);

      const { prompts } = await client.listPrompts();

      expect(prompts.map((prompt) => prompt.name)).toEqual(expected);
    });

    // The references are the half a second fetch would lose. `skills.test.ts`
    // covers the ordering against a fixture, which this cannot: the order
    // `getSkills` returns depends on the collation of the machine it runs on.
    it('carries the whole skill in the prompt, entry point first', async () => {
      const skill = getSkills()[0];
      const { messages } = await client.getPrompt({ name: skill.name });
      const text = messages
        .map((message) =>
          message.content.type === 'text' ? message.content.text : ''
        )
        .join('');

      for (const file of skill.files) {
        expect(text).toContain(`<file path="${file.path}">`);
        expect(text).toContain(file.content);
      }
      expect(text.startsWith('<file path="SKILL.md">')).toBe(true);
    });
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

/**
 * The host's own limit on what it can put on the wire — the api Lambda answers
 * through an ALB that drops a response over 1MB as a 502 carrying nothing the
 * agent can act on. Posted by hand rather than through the client, because
 * what is being asserted is the HTTP answer rather than a tool result.
 */
describe('a result the host cannot send', () => {
  const post = async (body: unknown) => {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify(body),
    });
    return { response, body: await response.json() };
  };

  const listTools = (id: unknown) => ({
    jsonrpc: '2.0',
    id,
    method: 'tools/list',
    params: {},
  });

  beforeEach(() => {
    context = {
      ...context,
      responseTooLarge: () => 'Narrow the call and try again.',
    };
  });

  afterEach(() => {
    hostHeaders = {};
  });

  it('answers 413 with the message the host gave, against the call it failed', async () => {
    const { response, body } = await post(listTools(7));

    expect(response.status).toBe(413);
    expect(body).toEqual({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Narrow the call and try again.' },
      id: 7,
    });
  });

  // One response cannot claim one request out of several, so it claims none.
  it('names no id for a batch', async () => {
    const { body } = await post([listTools(1), listTools(2)]);

    expect(body.id).toBeNull();
  });

  // What a host's middleware set before the handler ran is not the transport's
  // to drop: `mcpCors` puts `Access-Control-Allow-Origin` there, and a browser
  // reads a response without it as a network failure rather than as a 413.
  it('keeps the headers the host set before the handler ran', async () => {
    const { response } = await post(listTools(3));

    expect(response.status).toBe(413);
    expect(response.headers.get('x-set-by-middleware')).toBe('kept');
    // The transport's own headers describe a body no longer being sent.
    expect(response.headers.get('mcp-session-id')).toBeNull();
  });

  // `setHeader` matches case-insensitively, so the transport overwrites a host
  // header sharing its name. Removing that name on the way out would take the
  // host's value with it, which is the header it was set to survive.
  it('puts back a host header the transport overwrote', async () => {
    hostHeaders = { 'mcp-session-id': 'host-owned' };

    const { response } = await post(listTools(4));

    expect(response.status).toBe(413);
    expect(response.headers.get('mcp-session-id')).toBe('host-owned');
  });

  // The contract is `string | undefined`: an empty message is still a refusal,
  // and reading it as truthiness would send the body this exists to withhold.
  it('refuses on an empty message rather than sending the body', async () => {
    context = { ...context, responseTooLarge: () => '' };

    const { response, body } = await post(listTools(5));

    expect(response.status).toBe(413);
    expect(body).toEqual({
      jsonrpc: '2.0',
      error: { code: -32000, message: '' },
      id: 5,
    });
  });

  it('serves the result when the host can send it', async () => {
    context = { ...context, responseTooLarge: () => undefined };

    const { response, body } = await post(listTools(1));

    expect(response.status).toBe(200);
    expect(body.result.tools.length).toBeGreaterThan(0);
  });
});

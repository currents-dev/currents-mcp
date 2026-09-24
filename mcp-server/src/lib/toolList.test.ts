import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { describe, expect, it, vi } from 'vitest';
import { createMcpServer, TOOL_CATALOG } from '../server';
import { listTools, MAX_CACHED_TOOL_SETS } from './toolList';

vi.mock('./logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

/** The tools a real MCP client is told, over a transport pair in this process. */
const listFrom = async (server: McpServer) => {
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test-client', version: '0.0.0' });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  const { tools } = await client.listTools();
  await client.close();
  return tools;
};

/**
 * The same catalog on a plain server, so its `tools/list` is the SDK's own
 * handler rather than the cached one `createMcpServer` installs.
 */
const sdkBuiltServer = () => {
  const server = new McpServer({ name: 'currents', version: 'test' });
  for (const { name, title, description, annotations, tool } of TOOL_CATALOG) {
    server.registerTool<never, AnySchema>(
      name,
      { title, description, annotations, inputSchema: tool.schema },
      tool.handler
    );
  }
  return server;
};

describe('the cached tools/list', () => {
  /**
   * The payload is built here instead of by the SDK, so it has to be the one
   * the SDK would have sent — a field the SDK adds to a tool definition and
   * this does not is one every client silently stops receiving.
   */
  it('is the list the SDK would have built from the same catalog', async () => {
    const [cached, sdkBuilt] = await Promise.all([
      listFrom(createMcpServer()),
      listFrom(sdkBuiltServer()),
    ]);

    expect(cached).toEqual(sdkBuilt);
  });

  it('describes every tool the caller may call, and no other', async () => {
    const tools = await listFrom(createMcpServer({ apiKeyScope: 'read' }));

    const names = tools.map((tool) => tool.name);
    expect(names).toContain('currents-get-run-details');
    expect(names).not.toContain('currents-delete-run');
    for (const tool of tools) {
      expect(tool.inputSchema.type).toBe('object');
    }
  });
});

describe('listTools', () => {
  /**
   * The nth set, distinct for every n the cache bound needs: `n` past the
   * catalog's length wraps to a new start with one more tool, so a longer set
   * or a different first tool makes a different key.
   */
  const someTools = (n: number) =>
    Array.from(
      { length: 1 + Math.floor(n / TOOL_CATALOG.length) },
      (_, i) => TOOL_CATALOG[(n + i) % TOOL_CATALOG.length]
    );

  it('builds the list once for a tool set', () => {
    const first = listTools(TOOL_CATALOG.slice(0, 3));
    const second = listTools(TOOL_CATALOG.slice(0, 3));

    expect(second).toBe(first);
  });

  it('keeps two tool sets apart', () => {
    const three = listTools(TOOL_CATALOG.slice(0, 3));
    const two = listTools(TOOL_CATALOG.slice(0, 2));

    expect(three).not.toBe(two);
    expect(three).toHaveLength(3);
    expect(two).toHaveLength(2);
  });

  // What the key is built from comes from a token, so the cache has to have an
  // end.
  it('drops the least recently used set once it is full', () => {
    const oldest = someTools(0);
    const first = listTools(oldest);
    for (let n = 1; n <= MAX_CACHED_TOOL_SETS; n++) {
      listTools(someTools(n));
    }

    expect(listTools(oldest)).not.toBe(first);
  });
});

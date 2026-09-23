import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CURRENTS_API_KEY, MISSING_CURRENTS_API_KEY_MESSAGE } from '../lib/env';
import { logger } from '../lib/logger';
import { createMcpServer } from '../server';
import './logging';

/** Starts the MCP server over stdio (used by the CLI and programmatic embedders). */
export async function startMcpServer(): Promise<void> {
  if (!CURRENTS_API_KEY) {
    throw new Error(MISSING_CURRENTS_API_KEY_MESSAGE);
  }

  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.debug('🚀 Currents MCP Server is live');
  await new Promise(() => {});
}

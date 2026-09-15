import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CURRENTS_API_KEY, MISSING_CURRENTS_API_KEY_MESSAGE } from '../lib/env';
import { logger } from '../lib/logger';
import { createMcpServer } from '../server';
import { featuresFromLauncher } from './features';
import './logging';

/** Starts the MCP server over stdio (used by the CLI and programmatic embedders). */
export async function startMcpServer(): Promise<void> {
  if (!CURRENTS_API_KEY) {
    throw new Error(MISSING_CURRENTS_API_KEY_MESSAGE);
  }

  // Always a set, never left unset: the shared gate reads "not told" as
  // "allow every gated tool", which is right for the API — it knows the
  // organization — and wrong for a server run on a developer's machine, which
  // does not.
  const server = createMcpServer({ orgFeatures: featuresFromLauncher() });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.debug('🚀 Currents MCP Server is live');
  await new Promise(() => {});
}

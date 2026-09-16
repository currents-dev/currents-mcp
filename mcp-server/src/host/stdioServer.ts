import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CURRENTS_API_KEY, MISSING_CURRENTS_API_KEY_MESSAGE } from '../lib/env';
import { logger } from '../lib/logger';
import { createMcpServer } from '../server';
import type { OrgFeatures } from './scopes';
import './logging';

export interface StartMcpServerOptions {
  /**
   * The org feature flags to serve tools for. Empty by default, which withholds
   * every tool that declares one — the shared gate reads an unset `orgFeatures`
   * as "allow", which is right for the API and wrong for a server that never
   * loads an organization.
   *
   * The CLI fills this from `--features` / `CURRENTS_MCP_FEATURES`. Nothing is
   * read from `process.argv` here: an embedder's argv is its own, and a
   * `--features` it passes for its own reasons is not a statement about
   * Currents.
   */
  orgFeatures?: OrgFeatures;
}

/** Starts the MCP server over stdio (used by the CLI and programmatic embedders). */
export async function startMcpServer(
  options: StartMcpServerOptions = {}
): Promise<void> {
  if (!CURRENTS_API_KEY) {
    throw new Error(MISSING_CURRENTS_API_KEY_MESSAGE);
  }

  const server = createMcpServer({ orgFeatures: options.orgFeatures ?? {} });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.debug('🚀 Currents MCP Server is live');
  await new Promise(() => {});
}

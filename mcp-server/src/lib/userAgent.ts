import { MCP_SERVER_VERSION } from '../host/assets';
import { getApiDispatch, requestContext } from './context';
import { CURRENTS_MCP_SURFACE } from './env';

/**
 * The product token `trackApiRequest` reads as the MCP server
 * (`CURRENTS_MCP_USER_AGENT` in the api package). Unchanged from the
 * `currents-app/1.0` every release sent before, so a chart filtering `api_call`
 * on it keeps matching.
 */
const PRODUCT = 'currents-app';

/**
 * Where these tools are running from, as `api_call` groups by it:
 *
 * - `remote`: `POST /mcp` on the API, which serves the tool's `/v1` request in
 *   its own process.
 * - `ide-extension`: the published `@currents/mcp`, started by the Currents
 *   IDE extension rather than by a configuration the developer wrote.
 * - `standalone`: the published `@currents/mcp`, any other way it was started.
 */
export type McpSurface = 'remote' | 'ide-extension' | 'standalone';

/** How the MCP client reached this server. */
export type McpTransport = 'stdio' | 'http';

/**
 * What `CURRENTS_MCP_SURFACE` may say. `remote` is not in it because the
 * dispatch already says so, and an unknown value is dropped rather than sent,
 * so a variable set by mistake does not open a bucket of its own in `api_call`.
 */
const SURFACES_FROM_ENV: ReadonlySet<string> = new Set<McpSurface>([
  'ide-extension',
]);

export function getSurface(): McpSurface {
  // A dispatch is set only by a host that serves the REST API in this process,
  // which is the remote endpoint.
  if (getApiDispatch()) {
    return 'remote';
  }
  if (SURFACES_FROM_ENV.has(CURRENTS_MCP_SURFACE)) {
    return CURRENTS_MCP_SURFACE as McpSurface;
  }
  return 'standalone';
}

/**
 * The HTTP hosts — `/mcp` here and `currents-mcp-http` in the published
 * package — open a request context for every exchange, and the stdio host
 * never opens one (`lib/context.ts`). Read off that rather than told by the
 * host, so the published HTTP binary reports the right transport without a
 * change of its own.
 */
export function getTransport(): McpTransport {
  return requestContext.getStore() ? 'http' : 'stdio';
}

/**
 * The `User-Agent` on every `/v1` request a tool makes, in the
 * `product/version (comment)` form of RFC 9110: `currents-app/2.4.2
 * (standalone; stdio)`. The version is whatever `host/assets.ts` reports for
 * this copy — the package release in `@currents/mcp`, the api commit here.
 * `trackApiRequest` records it raw on `api_call`, which is the one place the
 * standalone server's traffic is counted at all.
 */
export function getUserAgent(): string {
  return `${PRODUCT}/${MCP_SERVER_VERSION} (${getSurface()}; ${getTransport()})`;
}

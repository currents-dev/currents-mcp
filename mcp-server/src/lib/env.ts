export const CURRENTS_API_URL =
  process.env.CURRENTS_API_URL || 'https://api.currents.dev/v1';
export const CURRENTS_API_KEY = (process.env.CURRENTS_API_KEY ?? '').trim();
/**
 * Set by a program that starts the published package on a developer's behalf
 * — the Currents IDE extension is to set `ide-extension` — so its traffic can be
 * told from an install the developer configured. `lib/userAgent.ts` accepts
 * the values it knows and ignores the rest.
 */
export const CURRENTS_MCP_SURFACE = (
  process.env.CURRENTS_MCP_SURFACE ?? ''
).trim();

/** Machine-readable; CLI maps this to a short user message without a stack trace. */
export const MISSING_CURRENTS_API_KEY_MESSAGE =
  'CURRENTS_API_KEY env variable is not set.';

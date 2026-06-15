import { AsyncLocalStorage } from "node:async_hooks";
import { CURRENTS_API_KEY } from "./env.js";

export interface RequestContext {
  /** Per-request Currents API key (e.g. from the inbound Authorization header). */
  apiKey?: string;
}

/**
 * Carries per-request data (such as the caller's API key) down to the shared
 * api/tools layer without changing any handler signatures. The HTTP transport
 * populates this per request; the stdio transport never does, so it falls back
 * to the env var.
 */
export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Resolves the Currents API key for the current request.
 *
 * - Remote (HTTP): the key set via `requestContext.run(...)` wins.
 * - Local (stdio): no context is set, so it falls back to `CURRENTS_API_KEY`.
 */
export function getApiKey(): string {
  const contextKey = requestContext.getStore()?.apiKey;
  return contextKey ?? CURRENTS_API_KEY;
}

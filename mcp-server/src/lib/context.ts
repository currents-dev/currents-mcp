import type { ApiKeyScope, OAuthApiScope, OrgFeatures } from '../host/scopes';
import { AsyncLocalStorage } from 'node:async_hooks';
import { CURRENTS_API_KEY } from './env';

/** A `/v1` request a tool makes, as `lib/request.ts` would have sent it. */
export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** Path and query below the `/v1` base, e.g. `/runs/abc?limit=10`. */
  path: string;
  headers: Record<string, string>;
  /** Already parsed, as `express.json()` would leave `req.body`. */
  body?: unknown;
}

/**
 * Serves a tool's `/v1` request without a network hop.
 *
 * Set by a host that runs the REST API in this process, which answers from its
 * own router — so the scope check and the controller a tool reaches are the
 * ones a REST caller reaches. Absent everywhere else, and `lib/request.ts`
 * then fetches `CURRENTS_API_URL` over HTTP.
 */
export type ApiDispatch = (request: ApiRequest) => Promise<Response>;

/** What the host is told about a tool call once it has settled. */
export interface ToolCallReport {
  /** The registered tool name, e.g. `currents-get-projects`. */
  tool: string;
  /** The result carried `isError`, or the handler threw. */
  isError: boolean;
  /**
   * The status of the `/v1` call the tool made last, or null when it made none
   * or that call produced no response. Every tool but
   * `currents-get-test-evidence` returns at its first failure, so on an error
   * result this is the status that failed it.
   */
  apiStatus: number | null;
}

/** The two credentials that carry a scope set. An API key carries none. */
export type ScopedCredential = 'access-token' | 'personal-access-token';

export interface RequestContext {
  /** Per-request Currents API key (e.g. from the inbound Authorization header). */
  apiKey?: string;
  dispatch?: ApiDispatch;
  /**
   * The scopes the caller's OAuth token carries, as the host verified them.
   * Only the tools these reach are registered (`lib/tool.ts`). Left unset for
   * an API key.
   */
  oauthScopes?: readonly OAuthApiScope[];
  /**
   * Which credential `oauthScopes` came off, which only the `instructions`
   * read: the tool list is the same either way. An access token is widened by
   * re-authorizing it, a personal access token by issuing another, and an
   * agent that gives the wrong one sends the user somewhere they cannot go.
   * Unset reads as an access token, which is what every caller before personal
   * access tokens reached this mount with.
   */
  scopesFrom?: ScopedCredential;
  /**
   * The `read`/`write` of the caller's API key, as the host resolved it. Only
   * the tools a key of that scope may call are registered (`lib/tool.ts`). A
   * key created before scopes existed arrives as `write`, the way
   * `getAuthCtxScope` in `packages/api/src/api/auth.ts` treats it. The stdio
   * server has no way to learn its key's scope and leaves this unset, which
   * registers every tool.
   */
  apiKeyScope?: ApiKeyScope;
  /**
   * The feature flags of the caller's organization, as the host read them.
   * Only the tools whose `feature` these enable are registered
   * (`lib/tool.ts`). The stdio server loads no organization and leaves this
   * unset, which registers every tool and lets each route decide.
   */
  orgFeatures?: OrgFeatures;
  /**
   * Asked whether the host can send a response of these bytes, and answering
   * with what to tell the caller when it cannot.
   *
   * The api Lambda answers through an ALB, which caps a response at 1MB, and a
   * tool result over that is dropped as a 502 carrying nothing the agent can
   * act on. Only the host knows what its own transport costs — the base64 an
   * ALB response pays for compressed bytes, for one — so it measures, and this
   * turns the answer into a JSON-RPC error naming what to narrow. Unset for the
   * published package, whose responses cross no such cap.
   */
  responseTooLarge?: (body: Buffer) => string | undefined;
  /**
   * Told about each tool call served under this context. A call the SDK
   * refuses before reaching the handler — an unknown tool name, arguments the
   * input schema rejects, a tool the caller's scopes left unregistered — is
   * not reported: the SDK answers those itself.
   * Not awaited: a returned promise is only watched for a rejection to log.
   */
  onToolCall?: (report: ToolCallReport) => void | Promise<void>;
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

/** The in-process dispatch for this request, or null to go over HTTP. */
export function getApiDispatch(): ApiDispatch | null {
  return requestContext.getStore()?.dispatch ?? null;
}

/** The host's tool call listener, or null when none is set (stdio). */
export function getToolCallListener(): RequestContext['onToolCall'] | null {
  return requestContext.getStore()?.onToolCall ?? null;
}

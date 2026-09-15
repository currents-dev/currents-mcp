import { isOAuthWriteScope } from '../host/scopes';
import type { ApiKeyScope, OAuthApiScope } from '../host/scopes';
import type { ToolCallback } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import type { RequestContext } from './context';

/**
 * The scope the tool's `/v1` route names with `requireScope`
 * (`packages/api/src/api/auth.ts`), or `'any'` for a route that checks none.
 *
 * `OAuthApiScope` is the vocabulary from `packages/common/src/oauth/scopes.ts`,
 * so a tag outside it fails to compile rather than hiding the tool from every
 * caller. `packages/api/src/api/mcp/__tests__/toolScopes.test.ts` checks each
 * tag against the declaration on the route the tool calls.
 */
export type ToolScope = OAuthApiScope | 'any';

export type McpTool<Schema extends AnySchema = AnySchema> = {
  scope: ToolScope;
  /**
   * The API key scope the route asks for, when it is not the one `scope`
   * implies. `requireScope` maps a `:write` scope to a `write` key and the
   * rest to `read`; a route that overrides that second argument (the Jira
   * project and issue-type lists take `issues:write` from a token but any key)
   * sets this to match.
   */
  apiKeyScope?: ApiKeyScope;
  schema: Schema;
  handler: ToolCallback<Schema>;
};

/** The key scope the tool's route asks for, as `requireScope` derives it. */
export function toolApiKeyScope(tool: Pick<McpTool, 'scope' | 'apiKeyScope'>) {
  if (tool.apiKeyScope) {
    return tool.apiKeyScope;
  }
  return tool.scope !== 'any' && isOAuthWriteScope(tool.scope)
    ? 'write'
    : 'read';
}

/**
 * Whether the caller behind `context` reaches `tool`.
 *
 * A token reaches the tools its scopes name, and every `'any'` tool. Its
 * scopes are already capped by the holder's role when they get here
 * (`verifyOAuthJwt`), so a tool this hides is one `requireScope` would have
 * refused. A `read` key reaches the tools whose route takes a `read` key; a
 * `write` key reaches all of them. A context carrying neither — the stdio
 * server reading `CURRENTS_API_KEY`, which never sees the key's scope — gets
 * every tool and lets the route decide each call.
 */
export function isToolGranted(
  tool: Pick<McpTool, 'scope' | 'apiKeyScope'>,
  context: Pick<RequestContext, 'oauthScopes' | 'apiKeyScope'>
): boolean {
  if (context.oauthScopes !== undefined) {
    return tool.scope === 'any' || context.oauthScopes.includes(tool.scope);
  }
  if (context.apiKeyScope !== undefined) {
    return context.apiKeyScope === 'write' || toolApiKeyScope(tool) === 'read';
  }
  return true;
}

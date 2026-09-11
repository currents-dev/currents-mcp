/**
 * The scope vocabulary the tool declarations and `lib/tool.ts` are written
 * against.
 *
 * A seam because the monorepo copy of this source takes these from
 * `@currents/common`, a workspace package this build cannot resolve. Declared
 * here instead, and the monorepo's definitions are the ones that count — the
 * list below mirrors `packages/common/src/oauth/scopes.ts`.
 *
 * Nothing here decides anything for this build: a stdio server has no way to
 * learn its API key's scope, so it leaves `apiKeyScope` unset and
 * `isToolGranted` registers every tool. These exist so the shared code
 * compiles.
 *
 * Drift fails loudly rather than silently: every tool declares `scope` as a
 * `ToolScope`, so a scope this union is missing does not compile and the error
 * names it. Add it here when that happens.
 */
export const OAUTH_API_SCOPES = [
  'projects:read',
  'projects:write',
  'results:read',
  'analytics:read',
  'actions:read',
  'actions:write',
  'issues:write',
  'runs:write',
  'webhooks:read',
  'webhooks:write',
  'ai:invoke',
] as const;

export type OAuthApiScope = (typeof OAUTH_API_SCOPES)[number];

export type ApiKeyScope = 'read' | 'write';

export function isOAuthWriteScope(scope: string): boolean {
  return scope.endsWith(':write') || scope === 'ai:invoke';
}

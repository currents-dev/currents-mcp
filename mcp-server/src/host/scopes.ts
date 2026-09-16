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

/**
 * Boolean org-level feature flags, which gate a tool whose `/v1` route is
 * behind one. Mirrors `packages/common/src/organization/` in the monorepo.
 *
 * Inert here for the same reason the scopes are: a stdio server is never told
 * an organization's features, so `orgFeatures` is unset and every tool with a
 * `feature` is registered, exactly as before. These exist so the shared code
 * compiles.
 */
export interface OrgFeatures {
  traceArtifactAnalysis?: boolean;
  aiAnalysis?: boolean;
  aiAssistantEnabled?: boolean;
  evidenceSharing?: boolean;
  pullRequestsPage?: boolean;
}

export type OrgFeatureKey = keyof OrgFeatures;

/** Opt-in: enabled only when the flag is explicitly `true`. */
export function isOrgFeatureEnabled(
  org: { features?: OrgFeatures } | null | undefined,
  key: OrgFeatureKey
): boolean {
  return org?.features?.[key] === true;
}

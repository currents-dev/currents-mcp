import type { OrgFeatureKey } from '../host/scopes';

/**
 * Every flag `McpTool.feature` can name.
 *
 * The mapped type is what keeps the list honest, in all three ways it can go
 * wrong: a key added to `OrgFeatureKey` and left out here is a missing
 * property, a key here that the standalone copy's `OrgFeatureKey` lacks is an
 * excess one, and an entry whose value is not its own key is a type mismatch —
 * which would otherwise drop one name from the list and repeat another. A
 * plain `string[]` catches none of the three.
 *
 * Shared rather than declared next to its one caller because that caller is
 * `host/features.ts` in the standalone copy, which never syncs. The list has
 * to travel with the flags, and the flags come from here.
 */
const ORG_FEATURES: { [K in OrgFeatureKey]: K } = {
  traceArtifactAnalysis: 'traceArtifactAnalysis',
  aiAnalysis: 'aiAnalysis',
  aiAssistantEnabled: 'aiAssistantEnabled',
  evidenceSharing: 'evidenceSharing',
  pullRequestsPage: 'pullRequestsPage',
};

export const ORG_FEATURE_KEYS = Object.values(ORG_FEATURES);

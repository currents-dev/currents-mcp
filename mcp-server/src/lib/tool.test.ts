import { describe, expect, it } from 'vitest';
import type { RequestContext } from './context';
import { isToolGranted, type McpTool } from './tool';

/** The two fields the grant is decided from; the rest never reach it. */
const tool = (fields: Partial<Pick<McpTool, 'scope' | 'feature'>> = {}) => ({
  scope: 'any' as const,
  ...fields,
});

const gated = tool({ feature: 'evidenceSharing' });

describe('isToolGranted with a feature flag', () => {
  it('grants a flagged tool to an org holding the flag', () => {
    expect(
      isToolGranted(gated, { orgFeatures: { evidenceSharing: true } })
    ).toBe(true);
  });

  it('withholds it from an org without the flag', () => {
    expect(
      isToolGranted(gated, { orgFeatures: { evidenceSharing: false } })
    ).toBe(false);
    expect(isToolGranted(gated, { orgFeatures: {} })).toBe(false);
  });

  // Another flag being on is not this one being on.
  it('withholds it from an org holding a different flag', () => {
    expect(isToolGranted(gated, { orgFeatures: { aiAnalysis: true } })).toBe(
      false
    );
  });

  // The stdio server loads no organization, so it has no flags to read and the
  // route decides each call.
  it('grants it to a context carrying no flags', () => {
    expect(isToolGranted(gated, {})).toBe(true);
  });

  it('leaves a tool declaring no feature alone', () => {
    expect(isToolGranted(tool(), { orgFeatures: {} })).toBe(true);
  });

  // The two checks are independent: the flag does not widen a grant the
  // caller's scopes do not carry.
  it('still needs the scope the tool names', () => {
    const context: Pick<RequestContext, 'oauthScopes' | 'orgFeatures'> = {
      oauthScopes: ['results:read'],
      orgFeatures: { evidenceSharing: true },
    };
    expect(
      isToolGranted(
        { scope: 'runs:write', feature: 'evidenceSharing' },
        context
      )
    ).toBe(false);
    expect(
      isToolGranted(
        { scope: 'results:read', feature: 'evidenceSharing' },
        context
      )
    ).toBe(true);
  });

  it('refuses a flagged tool the flag is off for even to a write key', () => {
    expect(
      isToolGranted(gated, { apiKeyScope: 'write', orgFeatures: {} })
    ).toBe(false);
  });
});

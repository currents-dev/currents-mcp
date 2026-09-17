import { describe, expect, it } from 'vitest';
import { buildServerInstructions, SCOPES_WITHOUT_TOOLS } from './instructions';

describe('instructions for an access token', () => {
  it('names every granted scope', () => {
    const text = buildServerInstructions({
      oauthScopes: ['results:read', 'webhooks:read'],
    });

    expect(text).toContain('results:read');
    expect(text).toContain('webhooks:read');
  });

  it('says what the tools behind a granted scope do', () => {
    const text = buildServerInstructions({ oauthScopes: ['runs:write'] });

    expect(text).toContain('cancel, reset and delete runs');
  });

  // The toolless scopes are the deliberate exception, named by
  // `MISSING_TOOL_LINE` regardless of the grant.
  it('names no scope the token does not carry', () => {
    const text = buildServerInstructions({ oauthScopes: ['results:read'] });

    expect(SCOPES_WITHOUT_TOOLS).not.toContain('webhooks:read');
    expect(text).not.toContain('webhooks:');
    expect(text).not.toContain('actions:');
  });

  // The whole point of the field here: an agent that finds no webhook tool
  // otherwise reports that Currents has no webhooks.
  it('tells the agent a missing tool is a missing grant', () => {
    const text = buildServerInstructions({ oauthScopes: ['results:read'] });

    expect(text).toContain('filtered to the scopes above');
    expect(text).toContain('re-authorize');
  });

  // A tool is also withheld when the organization does not hold its `feature`
  // flag, which no re-authorization adds. The advice has to hang on the scope
  // being absent rather than on the tool being absent.
  it('conditions the re-authorization advice on the scope being absent', () => {
    const text = buildServerInstructions({ oauthScopes: ['results:read'] });

    expect(text).toContain('if its scope is not listed above');
  });

  // `isToolGranted` withholds on a feature flag as well as on a scope, and
  // `currents-create-trace-link` is tagged `results:read` and gated on
  // `evidenceSharing`. Without this branch an agent holding `results:read` and
  // finding no trace-link tool has no account of why.
  it('names the feature flag when the scope is listed but the tool is not', () => {
    const text = buildServerInstructions({ oauthScopes: ['results:read'] });

    expect(text).toContain(
      'if it is listed, the tool is off for this organization'
    );
    expect(text).toContain('re-authorizing will not add it');
  });

  it('marks a granted scope that reaches no tool', () => {
    const text = buildServerInstructions({
      oauthScopes: ['projects:write', 'results:read'],
    });

    expect(text).toContain('projects:write — REST API only, no tool');
    expect(text).not.toContain('results:read — REST API only, no tool');
  });

  // Granted, the holder of `projects:write` would otherwise read the paragraph
  // above as an instruction to re-authorize for a scope it already holds.
  // Ungranted is the commoner case and the one that used to be wrong: nothing
  // named `projects:write`, so an agent asked to edit a project was sent to a
  // re-authorization that adds no tool.
  it('names a toolless scope whether or not the grant carries it', () => {
    for (const oauthScopes of [
      ['projects:write'] as const,
      ['results:read'] as const,
    ]) {
      const text = buildServerInstructions({ oauthScopes: [...oauthScopes] });

      for (const scope of SCOPES_WITHOUT_TOOLS) {
        expect(text).toContain(scope);
      }
      expect(text).toContain('granted or not');
    }
  });

  // Six tools carry `openWorldHint: true`, and a preamble claiming everything
  // stays inside Currents would contradict them.
  it('names the tools that reach outside the organization', () => {
    const text = buildServerInstructions({ oauthScopes: ['results:read'] });

    expect(text).toContain('Jira');
    expect(text).toContain('POST run data to');
  });

  // A grant of identity scopes alone arrives here as an empty array. Listing a
  // heading with nothing under it would read as a rendering fault.
  it('says so when the grant names no tool at all', () => {
    const text = buildServerInstructions({ oauthScopes: [] });

    expect(text).toContain('carries no scopes that name a tool');
    expect(text).toContain('re-authorize');
  });

  it('orders the scopes the same way whatever order the token lists them', () => {
    expect(
      buildServerInstructions({
        oauthScopes: ['webhooks:read', 'results:read'],
      })
    ).toBe(
      buildServerInstructions({
        oauthScopes: ['results:read', 'webhooks:read'],
      })
    );
  });
});

describe('instructions for an API key', () => {
  it('sends a read key to the key rather than to a re-authorization', () => {
    const text = buildServerInstructions({ apiKeyScope: 'read' });

    expect(text).toContain('This key is read');
    expect(text).toContain('needs a key with write access');
    expect(text).toContain('nothing to re-authorize');
  });

  // The write restriction is a fact about the tool list, not about the REST
  // API: `POST /v1/ai-requests` and `/v1/ai-sessions` declare
  // `requireScope('ai:invoke', 'read')` and take a read key.
  it('limits the read key write restriction to the tools', () => {
    const text = buildServerInstructions({ apiKeyScope: 'read' });

    expect(text).toContain('through them needs a key with write access');
  });

  it('tells a write key every tool the organization has is listed', () => {
    const text = buildServerInstructions({ apiKeyScope: 'write' });

    expect(text).toContain(
      'This key is write, so every tool this organization has is listed'
    );
  });

  // The stdio server never learns its key's scope, so the tool list rules
  // nothing out and a write tool can still be refused at the route.
  it('warns an unknown key scope that a call can still be refused', () => {
    const text = buildServerInstructions({});

    expect(text).toContain('every tool this organization has is listed');
    expect(text).toContain('403');
  });

  it('names no OAuth scope', () => {
    for (const context of [
      { apiKeyScope: 'read' } as const,
      { apiKeyScope: 'write' } as const,
      {},
    ]) {
      expect(buildServerInstructions(context)).not.toContain(':read');
    }
  });
});

describe('scopes that reach no tool', () => {
  it('is not every scope', () => {
    expect(SCOPES_WITHOUT_TOOLS.length).toBeGreaterThan(0);
    expect(SCOPES_WITHOUT_TOOLS).not.toContain('results:read');
  });
});

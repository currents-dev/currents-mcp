import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestContext } from './context';

vi.mock('../host/assets', () => ({ MCP_SERVER_VERSION: '9.9.9' }));

const env = vi.hoisted(() => ({ CURRENTS_MCP_SURFACE: '' }));
vi.mock('./env', () => ({
  CURRENTS_API_KEY: 'env-key',
  CURRENTS_API_URL: 'https://api.test.com',
  get CURRENTS_MCP_SURFACE() {
    return env.CURRENTS_MCP_SURFACE;
  },
}));

import { getSurface, getTransport, getUserAgent } from './userAgent';

const dispatch = async () => new Response(null);

afterEach(() => {
  env.CURRENTS_MCP_SURFACE = '';
});

describe('getUserAgent', () => {
  // The product token is what `trackApiRequest` and any chart on `api_call`
  // written before this already match on.
  it('keeps the currents-app product token and adds the version', () => {
    expect(getUserAgent()).toMatch(/^currents-app\/9\.9\.9 \(/);
  });

  it('names the remote endpoint when a dispatch serves the request', () => {
    const userAgent = requestContext.run({ dispatch }, getUserAgent);
    expect(userAgent).toBe('currents-app/9.9.9 (remote; http)');
  });

  it('names the published package over stdio when nothing else is known', () => {
    expect(getUserAgent()).toBe('currents-app/9.9.9 (standalone; stdio)');
  });

  // The published `currents-mcp-http` binary opens a request context for the
  // key and sets no dispatch.
  it('names the published package over HTTP from the request context alone', () => {
    const userAgent = requestContext.run({ apiKey: 'k' }, getUserAgent);
    expect(userAgent).toBe('currents-app/9.9.9 (standalone; http)');
  });

  it('names the IDE extension when it says so in the environment', () => {
    env.CURRENTS_MCP_SURFACE = 'ide-extension';
    expect(getUserAgent()).toBe('currents-app/9.9.9 (ide-extension; stdio)');
  });
});

describe('getSurface', () => {
  it('ignores a surface it does not know', () => {
    env.CURRENTS_MCP_SURFACE = 'my-laptop';
    expect(getSurface()).toBe('standalone');
  });

  // The environment names what started a local process; the API's own
  // environment is not that, whatever is set in it.
  it('reports remote over the environment when a dispatch is set', () => {
    env.CURRENTS_MCP_SURFACE = 'ide-extension';
    expect(requestContext.run({ dispatch }, getSurface)).toBe('remote');
  });
});

describe('getTransport', () => {
  it('is stdio outside a request context and http inside one', () => {
    expect(getTransport()).toBe('stdio');
    expect(requestContext.run({}, getTransport)).toBe('http');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

/**
 * The published README documents the tool and skill catalogs, and
 * `scripts/sync-readme-tools.mjs` generates the tools table from `server.ts`.
 * Nothing regenerates either on its own, so this fails the build when they
 * drift.
 *
 * Kept out of `server.test.ts` and `skills.test.ts` because those are shared
 * with the monorepo copy of this source, which has no such README.
 */
const registeredTools = vi.hoisted(() => [] as Array<{ name: string }>);

// Stands in for as much of `McpServer` as `createMcpServer` touches, which is
// more than the two registration calls: it reaches through to the low-level
// `server` to answer `tools/list` itself. A mock that omits it throws on a
// property nobody here is testing, in a file that only wants the tool names.
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    server = { setRequestHandler() {} };
    registerTool(name: string) {
      registeredTools.push({ name });
    }
    registerResource() {}
  },
}));

const { createMcpServer } = await import('../server');
const { getSkills } = await import('../skills');
createMcpServer();

describe('README.md tools table', () => {
  const readme = readFileSync(
    new URL('../../../README.md', import.meta.url),
    'utf-8'
  );
  const toolNamesInReadme = [
    ...readme.matchAll(/\| `(currents-[\w-]+)` /g),
  ].map((m) => m[1]);

  it('every registered tool is listed in README', () => {
    const registered = registeredTools.map((t) => t.name);
    const missing = registered.filter(
      (name) => !toolNamesInReadme.includes(name)
    );
    expect(
      missing,
      `tools missing from README: ${missing.join(', ')}. Run: npm run sync-readme`
    ).toHaveLength(0);
  });

  it('README does not list removed tools', () => {
    const registered = registeredTools.map((t) => t.name);
    const stale = toolNamesInReadme.filter(
      (name) => !registered.includes(name)
    );
    expect(
      stale,
      `stale tools in README: ${stale.join(', ')}. Run: npm run sync-readme`
    ).toHaveLength(0);
  });
});

describe('README.md skills table', () => {
  const readme = readFileSync(
    new URL('../../../README.md', import.meta.url),
    'utf-8'
  );
  const skillNamesInReadme = [
    ...readme.matchAll(/\| \[`([\w-]+)`\]\(skills\//g),
  ].map((m) => m[1]);

  it('every skill is listed in README', () => {
    const missing = getSkills()
      .map((s) => s.name)
      .filter((name) => !skillNamesInReadme.includes(name));
    expect(
      missing,
      `skills missing from README: ${missing.join(', ')}`
    ).toEqual([]);
  });

  it('README does not list removed skills', () => {
    const names = getSkills().map((s) => s.name);
    const stale = skillNamesInReadme.filter((name) => !names.includes(name));
    expect(stale, `stale skills in README: ${stale.join(', ')}`).toEqual([]);
  });
});

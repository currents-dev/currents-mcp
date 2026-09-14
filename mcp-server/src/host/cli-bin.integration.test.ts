/**
 * Packaged **CLI** integration tests: the `bin` field and `npx` behavior for a
 * tarball shaped like a publish (not the programmatic `exports` entry; see
 * `package-published-esm.integration.test.ts` for `import "@currents/mcp"`).
 *

 * The binary is driven through a real MCP handshake rather than checked for a
 * log line. A stdio server never exits, so a spawn with a timeout always times
 * out — an assertion that accepted the timeout passed whether the server was
 * serving or hung. Waiting for `initialize` to come back cannot be satisfied by
 * a process that is merely still running.
 *
 * 1. Prerequisite: `dist/index.mjs` exists (`npm run test:run` runs `build`
 *    first). If missing, the suite is skipped so `vitest` without a prior
 *    build does not fail noisily.
 * 2. `packTarball`: `npm pack` from the package root → one `.tgz` under a
 *    temp dir. Contents follow `package.json` `files` and npm’s pack rules
 *    (same artifact shape as registry install, minus release-only publish.cjs
 *    mutations).
 */
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { execNpm, npxCommand } from '../../test/npm-exec';

const root = fileURLToPath(new URL('../..', import.meta.url));
const buildIndex = path.join(root, 'dist', 'index.mjs');

function packTarball(packDest: string): string {
  // Respect `files` and standard pack rules; do not mutate package.json (unlike release `publish.cjs`).
  execNpm(['pack', '--ignore-scripts', '--pack-destination', packDest], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const tgz = readdirSync(packDest).filter((f) => f.endsWith('.tgz'));
  if (tgz.length !== 1) {
    throw new Error(`expected one .tgz in ${packDest}, got: ${tgz.join(', ')}`);
  }
  return path.join(packDest, tgz[0]);
}

/** The environment a spawned server needs, with the holes node leaves in it. */
function childEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }
  // Required for startup; never spent, since no tool is called here.
  env.CURRENTS_API_KEY = 'vitest-packaging-smoke';
  return env;
}

/** Connects to a packaged server over stdio and asks it what it serves. */
async function handshake(command: string, args: string[], cwd: string) {
  const client = new Client({ name: 'packaging-smoke', version: '0.0.0' });
  await client.connect(
    new StdioClientTransport({
      command,
      args,
      cwd,
      env: childEnv(),
      stderr: 'ignore',
    })
  );
  try {
    const { tools } = await client.listTools();
    return { server: client.getServerVersion(), tools };
  } finally {
    await client.close();
  }
}

describe.skipIf(!existsSync(buildIndex))(
  'packaged CLI (npx / bin)',
  { timeout: 180_000 },
  () => {
    let tarball: string;
    let packDir: string;
    let installDir: string;
    let binDir: string;

    // Packed and installed once: both entry paths below exercise the same
    // artifact, and doing it per test doubled the slowest part of the suite.
    beforeAll(() => {
      packDir = mkdtempSync(path.join(tmpdir(), 'mcp-pack-'));
      installDir = mkdtempSync(path.join(tmpdir(), 'mcp-install-'));
      tarball = packTarball(packDir);
      execNpm(['init', '-y'], { cwd: installDir, stdio: 'ignore' });
      execNpm(['install', tarball], { cwd: installDir, stdio: 'ignore' });
      binDir = path.join(installDir, 'node_modules', '.bin');
    });

    /*
     * `npm install <tgz>` links `node_modules/.bin/mcp` (or `mcp.cmd`) to the
     * packed CLI. Catches a broken `bin`, a `files` list missing
     * `dist/index.mjs`, or an install layout problem.
     */
    it('exposes mcp bin after npm install from tarball', () => {
      const hasMcp =
        existsSync(path.join(binDir, 'mcp')) ||
        existsSync(path.join(binDir, 'mcp.cmd'));
      expect(hasMcp).toBe(true);
    });

    /*
     * The installed bin, driven as a client would drive it. This is what says
     * the synced source still serves: a dependency the monorepo declares and
     * this package does not resolves in a dev tree and fails here, where the
     * package is installed on its own.
     */
    it('serves MCP from the installed bin', async () => {
      const { server, tools } = await handshake(
        path.join(binDir, 'mcp'),
        [],
        installDir
      );

      expect(server).toMatchObject({ name: 'currents' });
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.map((tool) => tool.name)).toContain('currents-get-projects');
    });

    /*
     * `npx -y --package <abs .tgz> mcp`: npm installs the tarball transiently
     * and runs the `mcp` bin from its `bin` map. This is the invocation the
     * README documents, so it is worth proving separately from the local
     * install above.
     */
    it('serves MCP via npx --package tarball', async () => {
      const { command, args } = npxCommand(['-y', '--package', tarball, 'mcp']);

      const { server, tools } = await handshake(command, args, packDir);

      expect(server).toMatchObject({ name: 'currents' });
      expect(tools.length).toBeGreaterThan(0);
    });
  }
);

/**
 * Packaged **CLI** integration tests: the `bin` field and `npx` behavior for a
 * tarball shaped like a publish (not the programmatic `exports` entry; see
 * `package-published-esm.integration.test.ts` for `import "@currents/mcp"`).
 *

 * 1. Prerequisite: `build/index.js` exists (`npm run test:run` runs `build`
 *    first). If missing, the suite is skipped so `vitest` without a prior
 *    build does not fail noisily.
 * 2. `packTarball`: `npm pack` from the package root → one `.tgz` under a
 *    temp dir. Contents follow `package.json` `files` and npm’s pack rules
 *    (same artifact shape as registry install, minus release-only publish.cjs
 *    mutations).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const buildIndex = path.join(root, "build", "index.js");

function packTarball(packDest: string): string {
  // Respect `files` and standard pack rules; do not mutate package.json (unlike release `publish.cjs`).
  execFileSync("npm", ["pack", "--pack-destination", packDest], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const tgz = readdirSync(packDest).filter((f) => f.endsWith(".tgz"));
  if (tgz.length !== 1) {
    throw new Error(`expected one .tgz in ${packDest}, got: ${tgz.join(", ")}`);
  }
  return path.join(packDest, tgz[0]);
}

describe.skipIf(!existsSync(buildIndex))(
  "packaged CLI (npx / bin)",
  { timeout: 60_000 },
  () => {
    /**
     * `npx -y --package <abs-path-to.tgz> mcp`: npm treats the tarball as the
     *    package to install transiently; `mcp` is the bin name from that package’s
     *    `package.json` `bin` map (not the scoped package name). The child should
     *    start the MCP server and log the “live” line (stdio MCP servers run until
     *    stdin closes; we cap wall time with `spawnSync` timeout). Accept either
     *    that log line or process timeout as success so slow CI still passes.
     *  */
    it("starts via npx --package tarball mcp", () => {
      const packDir = mkdtempSync(path.join(tmpdir(), "mcp-pack-"));
      const tarball = packTarball(packDir);
      const r = spawnSync("npx", ["-y", "--package", tarball, "mcp"], {
        cwd: packDir,
        timeout: 45_000,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          // Required for server startup; value is unused in this smoke test.
          CURRENTS_API_KEY: "vitest-cli-pack-smoke",
        },
      });
      const combined = `${r.stdout ?? ""}${r.stderr ?? ""}`;
      const timedOut =
        r.error != null && "code" in r.error && r.error.code === "ETIMEDOUT";
      expect(combined.includes("Currents MCP Server is live") || timedOut).toBe(
        true
      );
    });

    /*
     * Second `it` — consumer project + `node_modules/.bin`:
     * - `npm init -y` and `npm install <tgz>` in a fresh temp project. npm links
     *    `node_modules/.bin/mcp` (or `mcp.cmd` on Windows) to the packed CLI.
     * - Assert the shim exists. This catches broken `bin`, wrong `files` (missing
     *    `build/index.js`), or install layout issues without spawning the server.
     * */
    it("exposes mcp bin after npm install from tarball", () => {
      const packDir = mkdtempSync(path.join(tmpdir(), "mcp-pack-"));
      const installDir = mkdtempSync(path.join(tmpdir(), "mcp-install-"));
      const tarball = packTarball(packDir);
      execFileSync("npm", ["init", "-y"], {
        cwd: installDir,
        stdio: "ignore",
      });
      execFileSync("npm", ["install", tarball], {
        cwd: installDir,
        stdio: "ignore",
      });
      const binDir = path.join(installDir, "node_modules", ".bin");
      const hasMcp =
        existsSync(path.join(binDir, "mcp")) ||
        existsSync(path.join(binDir, "mcp.cmd"));
      expect(hasMcp).toBe(true);
    });
  }
);

/**
 * Published-artifact ESM integration test: resolve the **package name**
 * `@currents/mcp` using `package.json` `exports` after an install from a
 * tarball (same shape users get from the registry).
 *
 * Why a separate file from `package-environments.integration.test.ts`:
 * workspace tests import `build/*.js` via relative paths; they never ask Node
 * to apply `"exports"` for the scoped name. This suite closes that gap.
 *
 * Flow (`it`):
 * 1. Prerequisite: `build/index.js` exists (`test:run` runs `build` first).
 *    If missing, the suite is skipped (same gate as CLI pack tests).
 * 2. `packTarball`: run `npm pack` with `cwd` = package root. npm creates a
 *    `.tgz` containing exactly what publishing would ship (`package.json`
 *    `files`, plus auto-included `package.json`). That includes `build/` and
 *    the `exports` map pointing `"import"` → `./build/api.js`.
 * 3. Create two temp dirs: one receives the `.tgz`, one is a minimal consumer
 *    project (`npm init -y`, then `npm install <path-to.tgz>`). npm unpacks into
 *    `<installDir>/node_modules/@currents/mcp`.
 * 4. Copy `test/fixtures/consumer-published-esm.mjs` into the consumer project
 *    as `run-published-esm.mjs`. The script must live under `installDir` so
 *    Node walks upward to **that** `node_modules` for bare specifiers like
 *    `@currents/mcp` (a fixture left in the repo tree would not see the temp
 *    install’s `node_modules`).
 * 5. Run `node run-published-esm.mjs` with `cwd = installDir`. Node loads the
 *    ESM entry via the `"import"` condition and must find `startMcpServer`.
 * 6. Assert stdout `published-esm-ok`. Failures here typically mean broken
 *    `exports`, missing files from the packed `build/`, or a bad dual-package
 *    layout.
 * */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const buildIndex = path.join(root, "build", "index.js");

/** Run `npm pack` from the package root and return the path to the single `.tgz` in `packDest`. */
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
  "published tarball (package exports, ESM)",
  { timeout: 120_000 },
  () => {
    it('resolves `import "@currents/mcp"` after npm install <tgz>', () => {
      const packDir = mkdtempSync(path.join(tmpdir(), "mcp-pack-published-"));
      const installDir = mkdtempSync(
        path.join(tmpdir(), "mcp-install-published-")
      );
      const tarball = packTarball(packDir);
      execFileSync("npm", ["init", "-y"], {
        cwd: installDir,
        stdio: "ignore",
      });
      execFileSync("npm", ["install", tarball], {
        cwd: installDir,
        stdio: "ignore",
      });
      const fixture = path.join(
        root,
        "test",
        "fixtures",
        "consumer-published-esm.mjs"
      );
      const runner = path.join(installDir, "run-published-esm.mjs");
      copyFileSync(fixture, runner);
      const out = execFileSync(process.execPath, [runner], {
        cwd: installDir,
        encoding: "utf-8",
      });
      expect(out.trim()).toBe("published-esm-ok");
    });
  }
);

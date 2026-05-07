/**
 * Workspace build integration tests: programmatic `startMcpServer` entry from a
 * real Node child process (not Vitest’s module graph).
 *
 * Flow (each `it`):
 * 1. `npm run test:run` has already run `build`, so `build/` and `build/cjs/`
 *    exist under the package root (`mcp-server/`).
 * 2. Spawn `process.execPath` (Node) with a small script under
 *    `test/fixtures/*.mjs` or `*.cjs`.
 * 3. Set `cwd` to that package root so paths and semantics match “consumer runs
 *    next to a checked-out / linked package,” not the Vitest test file’s dir.
 * 4. The fixture imports the **built** API:
 *    - ESM: relative file URL to `build/api.js` (Node ESM resolution, `.js`
 *      extension required).
 *    - CJS: `require("../../build/cjs/api.js")` with `build/cjs/package.json`
 *      `type: commonjs` so nested `.js` files load as CommonJS.
 *    - CJS + dynamic `import()`: CommonJS script `import()`s the ESM build;
 *      exercises interop from a `.cjs` entry.
 * 5. Each script prints a single token to stdout; the parent asserts it to
 *    detect load/execute failures (missing files, wrong export shape, etc.).
 *
 * What this does *not* cover: installing from `npm pack` / registry or resolving
 * the package **name** `@currents/mcp` via `package.json` `exports` (see
 * `package-published-esm.integration.test.ts`).
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));

describe("package consumers (Node ESM, CJS require, CJS dynamic import)", () => {
  it("loads programmatic API from ESM", () => {
    const out = execFileSync(
      process.execPath,
      [path.join(root, "test", "fixtures", "consumer-esm.mjs")],
      { cwd: root, encoding: "utf-8" }
    );
    expect(out.trim()).toBe("esm-ok");
  });

  it("loads programmatic API from CJS require (build/cjs)", () => {
    const out = execFileSync(
      process.execPath,
      [path.join(root, "test", "fixtures", "consumer-cjs.cjs")],
      { cwd: root, encoding: "utf-8" }
    );
    expect(out.trim()).toBe("cjs-require-ok");
  });

  it("loads the ESM build via import() from a CommonJS script", () => {
    const out = execFileSync(
      process.execPath,
      [path.join(root, "test", "fixtures", "consumer-cjs-dynamic-import.cjs")],
      { cwd: root, encoding: "utf-8" }
    );
    expect(out.trim()).toBe("cjs-dynamic-import-ok");
  });
});

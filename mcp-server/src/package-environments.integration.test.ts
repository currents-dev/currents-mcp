import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const hasDualBuild =
  existsSync(path.join(root, "build", "api.js")) &&
  existsSync(path.join(root, "build", "cjs", "api.js"));

describe.skipIf(!hasDualBuild)(
  "package consumers (Node ESM, CJS require, CJS dynamic import)",
  () => {

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

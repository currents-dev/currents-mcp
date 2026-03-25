import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const buildIndex = path.join(root, "build", "index.js");

function packTarball(packDest: string): string {
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

describe.skipIf(!existsSync(buildIndex))("packaged CLI (npx / bin)", () => {
  // Local tarballs need --package <tgz> <bin>; registry `npx @currents/mcp` maps to bin `mcp`.
  it("starts via npx --package tarball mcp", () => {
    const packDir = mkdtempSync(path.join(tmpdir(), "mcp-pack-"));
    const tarball = packTarball(packDir);
    const r = spawnSync("npx", ["-y", "--package", tarball, "mcp"], {
      cwd: packDir,
      timeout: 8_000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const combined = `${r.stdout ?? ""}${r.stderr ?? ""}`;
    const timedOut = r.error?.code === "ETIMEDOUT";
    expect(
      combined.includes("Currents MCP Server is live") || timedOut
    ).toBe(true);
  });

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
});

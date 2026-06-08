import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const buildIndex = path.join(root, "dist", "index.mjs");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";

function packTarball(packDest: string): string {
  execFileSync(
    npmCommand,
    ["pack", "--ignore-scripts", "--pack-destination", packDest],
    {
      cwd: root,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const tgz = readdirSync(packDest).filter((f) => f.endsWith(".tgz"));
  if (tgz.length !== 1) {
    throw new Error(`expected one .tgz in ${packDest}, got: ${tgz.join(", ")}`);
  }
  return path.join(packDest, tgz[0]);
}

function npmBinPath(installDir: string, name: string): string {
  return path.join(
    installDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? `${name}.cmd` : name,
  );
}

function cliEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.CURRENTS_API_KEY;
  return env;
}

describe.skipIf(!existsSync(buildIndex))(
  "packaged CLI (npx / bin)",
  { timeout: 60_000 },
  () => {
    it("starts via npx --package tarball mcp", () => {
      const packDir = mkdtempSync(path.join(tmpdir(), "mcp-pack-"));
      const tarball = packTarball(packDir);
      const r = spawnSync(npxCommand, ["-y", "--package", tarball, "mcp"], {
        cwd: packDir,
        timeout: 45_000,
        encoding: "utf-8",
        shell: process.platform === "win32",
        stdio: ["pipe", "pipe", "pipe"],
        env: {
          ...process.env,
          CURRENTS_API_KEY: "vitest-cli-pack-smoke",
        },
      });
      const combined = `${r.stdout ?? ""}${r.stderr ?? ""}`;
      const timedOut =
        r.error != null && "code" in r.error && r.error.code === "ETIMEDOUT";
      expect(combined.includes("Currents MCP Server is live") || timedOut).toBe(
        true,
      );
    });

    it("exposes mcp bin after npm install from tarball", () => {
      const packDir = mkdtempSync(path.join(tmpdir(), "mcp-pack-"));
      const installDir = mkdtempSync(path.join(tmpdir(), "mcp-install-"));
      const tarball = packTarball(packDir);
      execFileSync(npmCommand, ["init", "-y"], {
        cwd: installDir,
        shell: process.platform === "win32",
        stdio: "ignore",
      });
      execFileSync(npmCommand, ["install", tarball], {
        cwd: installDir,
        shell: process.platform === "win32",
        stdio: "ignore",
      });
      const binDir = path.join(installDir, "node_modules", ".bin");
      const hasMcp =
        existsSync(path.join(binDir, "mcp")) ||
        existsSync(path.join(binDir, "mcp.cmd"));
      expect(hasMcp).toBe(true);
    });

    it.each([
      ["--help", "Usage: mcp [options]"],
      ["--version", "2.3.2"],
    ])("handles %s without CURRENTS_API_KEY", (flag, expected) => {
      const packDir = mkdtempSync(path.join(tmpdir(), "mcp-pack-"));
      const installDir = mkdtempSync(path.join(tmpdir(), "mcp-install-"));
      const tarball = packTarball(packDir);
      execFileSync(npmCommand, ["init", "-y"], {
        cwd: installDir,
        shell: process.platform === "win32",
        stdio: "ignore",
      });
      execFileSync(npmCommand, ["install", tarball], {
        cwd: installDir,
        shell: process.platform === "win32",
        stdio: "ignore",
      });

      const r = spawnSync(npmBinPath(installDir, "mcp"), [flag], {
        cwd: installDir,
        encoding: "utf-8",
        env: cliEnv(),
        shell: process.platform === "win32",
      });
      const combined = `${r.stdout ?? ""}${r.stderr ?? ""}`;

      expect(r.status).toBe(0);
      expect(combined).toContain(expected);
      expect(combined).not.toContain("CURRENTS_API_KEY");
    });
  },
);

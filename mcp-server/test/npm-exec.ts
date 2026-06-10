import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const npmCli = process.env.npm_execpath;
const npxCli = npmCli ? path.join(path.dirname(npmCli), "npx-cli.js") : undefined;

export function execNpm(
  args: string[],
  options: Parameters<typeof execFileSync>[2]
) {
  if (npmCli && existsSync(npmCli)) {
    return execFileSync(process.execPath, [npmCli, ...args], options);
  }
  return execFileSync("npm", args, options);
}

export function spawnNpx(
  args: string[],
  options: Parameters<typeof spawnSync>[2]
) {
  if (npxCli && existsSync(npxCli)) {
    return spawnSync(process.execPath, [npxCli, ...args], options);
  }
  return spawnSync("npx", args, options);
}

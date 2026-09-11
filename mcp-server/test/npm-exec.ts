import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const npmCli = process.env.npm_execpath;
const npxCli = npmCli
  ? path.join(path.dirname(npmCli), 'npx-cli.js')
  : undefined;

export function execNpm(
  args: string[],
  options: Parameters<typeof execFileSync>[2]
) {
  if (npmCli && existsSync(npmCli)) {
    return execFileSync(process.execPath, [npmCli, ...args], options);
  }
  return execFileSync('npm', args, options);
}

export function spawnNpx(
  args: string[],
  options: Parameters<typeof spawnSync>[2]
) {
  if (npxCli && existsSync(npxCli)) {
    return spawnSync(process.execPath, [npxCli, ...args], options);
  }
  return spawnSync('npx', args, options);
}

/**
 * The npx invocation as a command and arguments, for a caller that spawns the
 * process itself rather than through `spawnSync` — the MCP client transport
 * needs the pair, not a finished child.
 */
export function npxCommand(args: string[]): {
  command: string;
  args: string[];
} {
  if (npxCli && existsSync(npxCli)) {
    return { command: process.execPath, args: [npxCli, ...args] };
  }
  return { command: 'npx', args };
}

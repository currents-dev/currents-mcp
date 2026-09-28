/**
 * Prints the tools registered in one `server.ts` and absent from another, one
 * per line, so a sync can tell whether it withdraws a tool.
 *
 * Deleted files are not enough to tell. The tools live in files under
 * `src/tools`, but the name a client calls is the string `server.ts`
 * registers, and a rename changes that string while leaving every file in
 * place. `currents-get-affected-executions` became
 * `currents-get-action-executions` that way, and the sync reported nothing
 * withdrawn.
 *
 * Usage:  node scripts/withdrawn-tools.mjs <before/server.ts> <after/server.ts>
 *
 * Exits 1 when either file registers no tools: a pattern that stopped
 * matching would otherwise report every tool withdrawn, or none.
 */

import { readFileSync } from "node:fs";
import { registeredTools } from "./tool-names.mjs";

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error("usage: withdrawn-tools.mjs <before/server.ts> <after/server.ts>");
  process.exit(2);
}

/** @param {string} path */
function namesIn(path) {
  const names = new Set(
    registeredTools(readFileSync(path, "utf-8")).map((tool) => tool.name),
  );
  if (names.size === 0) {
    console.error(`ERROR: no tools found in ${path}`);
    process.exit(1);
  }
  return names;
}

const before = namesIn(beforePath);
const after = namesIn(afterPath);
for (const name of before) {
  if (!after.has(name)) console.log(name);
}

/**
 * Regenerates the tools table in README.md from the actual registered tools.
 *
 * Usage:  node scripts/sync-readme-tools.mjs [--check]
 *   --check   exit with code 1 if the README is out of date (useful in CI)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readmePath = join(root, "..", "README.md");
const checkOnly = process.argv.includes("--check");

// ── Capture tool registrations via a loader hook ────────────────
const registeredTools = [];

// Mock the MCP SDK so importing server.ts just records registerTool calls
// without starting any I/O.
const origResolve = await (async () => {
  // We can't use loader hooks easily from a script, so we take the simpler
  // approach: build a small inline module that re-exports a mock McpServer,
  // then patch globalThis so the built server.js picks it up.

  // Dynamically import the built server module after shimming the dep.
  // The built output lives at build/server.js and uses:
  //   import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
  //   import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
  //
  // We register a custom loader that intercepts those two specifiers.
  return null;
})();

// Simpler approach: run vitest in JSON mode and parse the registered tools
// from test output. But that couples us to tests. Instead, we'll parse
// server.ts source directly — it's a flat list of registerTool() calls.

const serverSrc = readFileSync(join(root, "src", "server.ts"), "utf-8");

const toolRegex =
  /server\.registerTool\(\s*"([^"]+)",\s*\{\s*description:\s*\n?\s*"([^"]*(?:"[^"]*)*?)"/g;

// More robust: match multiline descriptions
const toolRegex2 =
  /server\.registerTool\(\s*\n?\s*"([^"]+)",\s*\n?\s*\{\s*\n?\s*description:\s*\n?\s*"((?:[^"\\]|\\.)*)"/g;

let match;
while ((match = toolRegex2.exec(serverSrc)) !== null) {
  const name = match[1];
  const description = match[2].replace(/\\"/g, '"');
  const firstSentence = description.split(/\.\s/)[0];
  const shortDesc = firstSentence.endsWith(".")
    ? firstSentence
    : firstSentence + ".";
  registeredTools.push({ name, shortDesc });
}

if (registeredTools.length === 0) {
  console.error("ERROR: No tools found in server.ts — regex may need updating");
  process.exit(1);
}

// ── Build the markdown table ────────────────────────────────────
const nameColWidth = Math.max(
  "Tool".length,
  ...registeredTools.map((t) => `\`${t.name}\``.length)
);
const descColWidth = Math.max(
  "Description".length,
  ...registeredTools.map((t) => t.shortDesc.length)
);

const pad = (s, w) => s + " ".repeat(Math.max(0, w - s.length));

const header = `| ${pad("Tool", nameColWidth)} | ${pad("Description", descColWidth)} |`;
const separator = `| ${"-".repeat(nameColWidth)} | ${"-".repeat(descColWidth)} |`;
const rows = registeredTools.map(
  (t) =>
    `| ${pad(`\`${t.name}\``, nameColWidth)} | ${pad(t.shortDesc, descColWidth)} |`
);

const table = [header, separator, ...rows].join("\n");

// ── Splice the table into README.md ─────────────────────────────
const readme = readFileSync(readmePath, "utf-8");
const tableStart = readme.indexOf("| Tool");

if (tableStart === -1) {
  const msg = 'Cannot find tools table anchor ("| Tool") in README.md';
  if (checkOnly) {
    console.error(`${msg} — cannot verify table freshness.`);
  } else {
    console.error(`${msg} — cannot update.`);
  }
  process.exit(1);
}

const tableEndMarker = readme.indexOf("\n\n", tableStart);
const tableEnd = tableEndMarker === -1 ? readme.length : tableEndMarker;

const oldTable = readme.slice(tableStart, tableEnd);

if (oldTable === table) {
  console.log("README.md tools table is up to date.");
  process.exit(0);
}

if (checkOnly) {
  console.error("README.md tools table is out of date. Run: npm run sync-readme");
  process.exit(1);
}

const updated = readme.slice(0, tableStart) + table + readme.slice(tableEnd);
writeFileSync(readmePath, updated);
console.log(`README.md updated with ${registeredTools.length} tools.`);

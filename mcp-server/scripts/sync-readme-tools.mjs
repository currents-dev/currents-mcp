/**
 * Regenerates the tools and skills tables in README.md from the source of
 * truth for each: the registrations in `server.ts`, and the skill directories
 * `loadSkills` reads.
 *
 * Both tables are generated because both are checked. `host/readme.test.ts`
 * fails when either drifts from what the server carries, and a sync applies
 * this script, so a tool or skill arriving from the monorepo updates its row
 * here rather than needing one written by hand in this repository.
 *
 * Usage:  node scripts/sync-readme-tools.mjs [--check]
 *   --check   exit with code 1 if the README is out of date (useful in CI)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadSkills } from "./load-skills.mjs";

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
  // The built output lives at dist/ and uses:
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

// Quote-agnostic: the source is prettier-formatted with singleQuote, but the
// monorepo copy this file's subject is synced from has been both.
// Anchored on the tool name and its description, not on whatever function
// declares them. That call has been renamed three times — `server.registerTool`,
// then a local `registerTool` wrapper applying scope filtering, then
// `catalogTool` building a TOOL_CATALOG the server loops over — and each rename
// silently found zero tools until someone noticed.
//
// `currents-` is the stable part: `server.test.ts` asserts every registered name
// matches it, so a tool that stopped being found here would have to stop being a
// tool. The loop that registers them passes variables, so it cannot match and
// nothing is counted twice.
//
// The character class is the one `server.test.ts` allows, dots and slashes
// included, rather than the narrower `\w`. A name outside it would be skipped
// rather than reported: this only refuses to run when it finds *no* tools, so a
// partial match writes a README missing a tool and says nothing. That would be
// caught next by `host/readme.test.ts`, which fails when a registered tool is
// absent from the table — one step later, and for a reason that does not name
// the cause.
const toolRegex =
  /(['"])(currents-[A-Za-z0-9_./-]+)\1\s*,\s*\{\s*description:\s*(['"])((?:\\.|(?!\3)[^\\])*)\3/g;

/**
 * The lead sentence of a description, for a table cell. Both catalogs carry
 * more than that in their descriptions — a tool's names its arguments, a
 * skill's continues into the phrases that make an agent reach for it — and
 * neither belongs in a table of contents.
 *
 * A break is `.`, `!` or `?`, then space, then a capital. The capital is what
 * keeps "based on conditions like test title, file path, git branch, etc.
 * Requires projectId" splitting where it should while leaving "e.g. the runId"
 * and "1.5 times" alone — an abbreviation and a decimal continue in lower case
 * or in a digit, where a new sentence does not. It is a rule about the shape of
 * the text rather than a list of abbreviations, which the next abbreviation
 * would not be on.
 *
 * @param {string} description
 * @returns {string}
 */
function firstSentence(description) {
  const lead = description.split(/(?<=[.!?])\s+(?=[A-Z])/)[0].trimEnd();
  return /[.!?]$/.test(lead) ? lead : lead + ".";
}

let match;
while ((match = toolRegex.exec(serverSrc)) !== null) {
  const name = match[2];
  const description = match[4].replace(/\\(['"])/g, '$1');
  registeredTools.push({ name, shortDesc: firstSentence(description) });
}

if (registeredTools.length === 0) {
  console.error("ERROR: No tools found in server.ts — regex may need updating");
  process.exit(1);
}

// ── Build the markdown tables ───────────────────────────────────
// Padded to the widest cell, which is what the tables in this README already
// look like. Nothing reformats them afterwards: `npm run format` covers `src`
// and `../skills`, not the README.
const pad = (s, w) => s + " ".repeat(Math.max(0, w - s.length));

function markdownTable(headings, rows) {
  // A `|` in a cell would close it early and add a column, which no test here
  // would catch: `host/readme.test.ts` reads names out of the first cell and
  // never looks at the shape of the row. Nothing in either catalog carries one
  // today, and a description is free text that one day will.
  //
  // The backslash goes first, or escaping a description that already reads
  // `a\|b` would write `a\\|b`, which is a literal backslash followed by a
  // live delimiter — the corruption this is here to prevent.
  const cells = rows.map((row) =>
    row.map((cell) => cell.replaceAll("\\", "\\\\").replaceAll("|", "\\|")),
  );
  const widths = headings.map((heading, column) =>
    Math.max(heading.length, ...cells.map((row) => row[column].length)),
  );
  const line = (row) =>
    `| ${row.map((cell, column) => pad(cell, widths[column])).join(" | ")} |`;
  return [
    line(headings),
    `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`,
    ...cells.map(line),
  ].join("\n");
}

const toolsTable = markdownTable(
  ["Tool", "Description"],
  registeredTools.map((tool) => [`\`${tool.name}\``, tool.shortDesc]),
);

// The name is the directory name — `load-skills.mjs` refuses a skill whose
// frontmatter disagrees with it — so the link cannot point at a directory that
// is not there. `host/readme.test.ts` reads the name back out of this link.
const skillsTable = markdownTable(
  ["Skill", "Description"],
  loadSkills().map((skill) => [
    `[\`${skill.name}\`](skills/${skill.name})`,
    firstSentence(skill.description),
  ]),
);

// ── Splice the tables into README.md ────────────────────────────
let readme = readFileSync(readmePath, "utf-8");
const stale = [];

for (const [heading, table, label] of [
  ["Tool", toolsTable, "tools"],
  ["Skill", skillsTable, "skills"],
]) {
  // Anchored to the start of a line, so a description that happens to contain
  // the heading cannot be mistaken for the table it belongs to.
  const anchor = new RegExp(`^\\| ${heading}[ |]`, "m").exec(readme);
  if (!anchor) {
    console.error(
      `Cannot find the ${label} table header ("| ${heading}") in README.md.`,
    );
    process.exit(1);
  }
  const start = anchor.index;
  const blankLine = readme.indexOf("\n\n", start);
  const end = blankLine === -1 ? readme.length : blankLine;
  if (readme.slice(start, end) === table) {
    continue;
  }
  stale.push(label);
  readme = readme.slice(0, start) + table + readme.slice(end);
}

if (stale.length === 0) {
  console.log("README.md tools and skills tables are up to date.");
  process.exit(0);
}

if (checkOnly) {
  console.error(
    `README.md ${stale.join(" and ")} table out of date. Run: npm run sync-readme`,
  );
  process.exit(1);
}

writeFileSync(readmePath, readme);
console.log(
  `README.md updated: ${registeredTools.length} tools, ${loadSkills().length} skills.`,
);

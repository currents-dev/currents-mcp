/**
 * The tool registrations in `server.ts`, read from its source rather than by
 * importing it, so nothing the file carries is executed.
 *
 * Shared by `sync-readme-tools.mjs`, which builds the README table from them,
 * and `withdrawn-tools.mjs`, which compares two copies of `server.ts` to find a
 * tool a sync removes or renames. One pattern for both, so the check for a
 * withdrawn tool cannot quietly find fewer tools than the README lists.
 */

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
const TOOL_PATTERN =
  /(['"])(currents-[A-Za-z0-9_./-]+)\1\s*,\s*\{\s*description:\s*(['"])((?:\\.|(?!\3)[^\\])*)\3/g;

/**
 * `src` with every comment blanked to spaces, newlines kept.
 *
 * A registration left behind in a comment is not a tool, and counting it as
 * one would hide exactly the withdrawal `withdrawn-tools.mjs` is looking for:
 * the name disappears from the catalog but still matches here.
 *
 * Strings and template literals are stepped over, so a `//` inside one (a URL
 * in a description) does not start a comment. Two things are not handled,
 * because `server.ts` has neither: regex literals, and a backtick nested inside
 * a template's `${}`.
 *
 * @param {string} src
 * @returns {string}
 */
export function withoutComments(src) {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const char = src[i];
    const next = src[i + 1];
    if (char === "/" && next === "/") {
      const end = src.indexOf("\n", i);
      const stop = end === -1 ? src.length : end;
      out += " ".repeat(stop - i);
      i = stop;
    } else if (char === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else if (char === "'" || char === '"' || char === "`") {
      let j = i + 1;
      while (j < src.length && src[j] !== char) {
        j += src[j] === "\\" ? 2 : 1;
      }
      out += src.slice(i, j + 1);
      i = j + 1;
    } else {
      out += char;
      i += 1;
    }
  }
  return out;
}

/**
 * Every tool `serverSrc` registers, in source order, with its description as
 * written between the quotes (escapes still in place). Registrations inside
 * comments are not counted.
 *
 * @param {string} serverSrc
 * @returns {{ name: string, rawDescription: string }[]}
 */
export function registeredTools(serverSrc) {
  const code = withoutComments(serverSrc);
  return [...code.matchAll(TOOL_PATTERN)].map((match) => ({
    name: match[2],
    rawDescription: match[4],
  }));
}

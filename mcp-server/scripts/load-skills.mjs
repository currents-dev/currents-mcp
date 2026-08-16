import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The skills live at the repo root, outside the npm package directory, so npm
 * cannot pack them. Both the build (tsdown) and the tests (vitest) read them
 * from here and inline them into `__SKILLS__`.
 *
 * Plain .mjs, not .ts: tsdown loads tsdown.config.ts through a native import
 * that does not resolve TypeScript sources.
 *
 * @typedef {{ path: string, content: string }} SkillFile
 * @typedef {{ name: string, description: string, files: SkillFile[] }} Skill
 */
const SKILLS_DIR = fileURLToPath(new URL("../../skills", import.meta.url));

/**
 * @param {string} dir
 * @param {string} root
 * @returns {SkillFile[]}
 */
function markdownFiles(dir, root) {
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return markdownFiles(full, root);
    }
    if (!entry.name.endsWith(".md")) {
      return [];
    }
    return [
      {
        path: relative(root, full).split(sep).join("/"),
        content: readFileSync(full, "utf-8"),
      },
    ];
  });
}

/**
 * Reads a single-line field out of the leading YAML frontmatter block.
 *
 * @param {string} source
 * @param {string} field
 * @returns {string | undefined}
 */
function frontmatterField(source, field) {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  if (!block) {
    return undefined;
  }
  const line = new RegExp(`^${field}:[ \\t]*(.+)$`, "m").exec(block[1]);
  return line?.[1].trim();
}

/**
 * Collects every skill directory into a manifest. Throws rather than skipping a
 * malformed skill: a skill that silently fails to load here ships as a server
 * with one fewer resource, which nobody notices until an agent cannot find it.
 *
 * @returns {Skill[]}
 */
export function loadSkills() {
  /** @type {string[]} */
  let dirs;
  try {
    dirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }

  return dirs.map((dirName) => {
    const root = join(SKILLS_DIR, dirName);
    const files = markdownFiles(root, root);
    const skillMd = files.find((file) => file.path === "SKILL.md");
    if (!skillMd) {
      throw new Error(`skills/${dirName} has no SKILL.md`);
    }

    const name = frontmatterField(skillMd.content, "name");
    const description = frontmatterField(skillMd.content, "description");
    if (!name || !description) {
      throw new Error(
        `skills/${dirName}/SKILL.md frontmatter needs both name and description`,
      );
    }
    if (name !== dirName) {
      throw new Error(
        `skills/${dirName}/SKILL.md declares name "${name}"; it must match the directory`,
      );
    }

    return { name, description, files };
  });
}

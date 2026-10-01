import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  ErrorCode,
  McpError,
  RequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { getSkills, skillFileUri, type Skill } from './skills';

/**
 * The Skills extension (SEP-2640, `io.modelcontextprotocol/skills`): a
 * catalog of the skills this server serves, each with its frontmatter and a
 * digest per file, on top of the `skill://` resources `registerSkills`
 * already publishes.
 *
 * What it is for: the OpenAI plugin dashboard reads `skills/list` when it
 * scans the server and imports the skills into the listing, so a skill
 * changed here reaches ChatGPT and Codex through a rescan rather than a
 * package upload. Hosts that load MCP-served skills at runtime verify each
 * file against the digest before using it, so the digest has to be of the
 * exact bytes `resources/read` returns.
 *
 * The SDK has no handler for these methods yet (typescript-sdk#2798), so the
 * two are registered on the underlying `Server` by hand. Neither is in its
 * capability switch, which is what lets an unknown method through.
 */
export const SKILLS_EXTENSION = 'io.modelcontextprotocol/skills';

const SkillsListRequestSchema = RequestSchema.extend({
  method: z.literal('skills/list'),
  params: z.object({ cursor: z.string().optional() }).loose().optional(),
});

const SkillsGetRequestSchema = RequestSchema.extend({
  method: z.literal('skills/get'),
  params: z.object({ uri: z.string() }).loose(),
});

export type SkillEntry = {
  uri: string;
  frontmatter: Record<string, string>;
  resources: Array<{ uri: string; digest: string; size: number }>;
};

/**
 * The frontmatter block of a SKILL.md as the JSON object the catalog carries.
 *
 * A host compares this field by field against what it parses from the file it
 * fetches, so the two have to agree exactly. The parser handles the one shape
 * the skills use, a single-line `key: value` per field, and throws on any
 * other line rather than guess at YAML: `skillsExtension.test.ts` runs it
 * over every shipped skill, so a field written another way fails there and
 * not in a host's verification.
 */
export function skillFrontmatter(skillMd: string): Record<string, string> {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(skillMd);
  if (!block) {
    throw new Error('SKILL.md has no frontmatter block');
  }
  const fields: Record<string, string> = {};
  for (const line of block[1].split(/\r?\n/)) {
    if (line.trim() === '') {
      continue;
    }
    const match = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(line);
    if (!match) {
      throw new Error(`unsupported frontmatter line: ${line}`);
    }
    fields[match[1]] = match[2].trim();
  }
  return fields;
}

/** `sha256:<hex>` over the UTF-8 bytes, the form the extension specifies. */
export function skillFileDigest(content: string): string {
  return `sha256:${createHash('sha256').update(content, 'utf8').digest('hex')}`;
}

export function skillEntry(skill: Skill): SkillEntry {
  const entryPoint = skill.files.find((file) => file.path === 'SKILL.md');
  if (!entryPoint) {
    throw new Error(`skill ${skill.name} has no SKILL.md`);
  }
  return {
    uri: skillFileUri(skill.name, 'SKILL.md'),
    frontmatter: skillFrontmatter(entryPoint.content),
    resources: skill.files.map((file) => ({
      uri: skillFileUri(skill.name, file.path),
      digest: skillFileDigest(file.content),
      size: Buffer.byteLength(file.content, 'utf8'),
    })),
  };
}

let catalog: SkillEntry[] | undefined;

/** Every skill's entry, computed once: the digests are over content that does not change while the process runs. */
export function skillCatalog(): SkillEntry[] {
  if (!catalog) {
    catalog = getSkills().map(skillEntry);
  }
  return catalog;
}

/**
 * Declares the extension and answers its two methods. Must run before the
 * server connects to a transport, which is where the SDK freezes
 * capabilities.
 *
 * The catalog is small enough to serve in one page, so `cursor` is accepted
 * and ignored and no `nextCursor` is returned. `resultType` is in the SEP's
 * examples but not in the 2025-11-25 protocol the SDK negotiates; it is sent
 * for importers that validate against the examples.
 */
export function registerSkillsExtension(server: McpServer): void {
  server.server.registerCapabilities({
    extensions: { [SKILLS_EXTENSION]: {} },
  });

  server.server.setRequestHandler(SkillsListRequestSchema, () => ({
    resultType: 'complete',
    skills: skillCatalog(),
  }));

  server.server.setRequestHandler(SkillsGetRequestSchema, (request) => {
    const skill = skillCatalog().find(
      (entry) => entry.uri === request.params.uri
    );
    if (!skill) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Unknown skill: ${request.params.uri}`
      );
    }
    return { resultType: 'complete', skill };
  });
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSkills } from './host/assets';

export { getSkills };

export type SkillFile = { path: string; content: string };
export type Skill = { name: string; description: string; files: SkillFile[] };

export const SKILL_MIME_TYPE = 'text/markdown';

const ENTRY_POINT = 'SKILL.md';

/** The delimiter `skillDocument` writes, which no file content may hold. */
export const FILE_CLOSE_TAG = '</file>';

export function skillFileUri(skillName: string, filePath: string): string {
  return `skill://currents/${skillName}/${filePath}`;
}

/**
 * The whole skill as one document.
 *
 * The entry point leads whatever order `getSkills` returned, because it is
 * what links to the rest: a reader handed `references/x.md` first reaches the
 * appendix before the workflow it belongs to.
 *
 * Each file is wrapped in a `<file>` tag naming its path, so a
 * `](references/x.md)` link in the entry point names something in the same
 * message. A file whose own content held the closing tag would end its block
 * early, which `skills.test.ts` rejects at the source.
 */
export function skillDocument(skill: Skill): string {
  return [...skill.files]
    .sort(
      (a, b) => Number(b.path === ENTRY_POINT) - Number(a.path === ENTRY_POINT)
    )
    .map((file) => `<file path="${file.path}">\n${file.content}\n</file>`)
    .join('\n\n');
}

/**
 * Publishes each skill's markdown as an MCP resource, and each skill as a
 * prompt.
 *
 * The MCP SDK has no skill primitive. A resource is read only by an agent
 * that goes looking for it; a prompt is listed at the handshake, which is
 * where a host can show one — Claude Code renders it as a slash command.
 *
 * The prompt carries every file rather than the entry point alone, because a
 * reference left behind a second fetch is one a host has no reason to make.
 */
export function registerSkills(server: McpServer): void {
  for (const skill of getSkills()) {
    for (const file of skill.files) {
      const uri = skillFileUri(skill.name, file.path);
      const isEntryPoint = file.path === ENTRY_POINT;
      server.registerResource(
        `${skill.name}/${file.path}`,
        uri,
        {
          title: isEntryPoint ? skill.name : `${skill.name}: ${file.path}`,
          description: isEntryPoint
            ? skill.description
            : `Supporting reference for the ${skill.name} skill.`,
          mimeType: SKILL_MIME_TYPE,
        },
        () => ({
          contents: [{ uri, mimeType: SKILL_MIME_TYPE, text: file.content }],
        })
      );
    }

    server.registerPrompt(
      skill.name,
      { description: skill.description },
      () => ({
        messages: [
          {
            role: 'user',
            content: { type: 'text', text: skillDocument(skill) },
          },
        ],
      })
    );
  }
}

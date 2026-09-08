import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getSkills } from './host/assets';

export { getSkills };

export type SkillFile = { path: string; content: string };
export type Skill = { name: string; description: string; files: SkillFile[] };

export const SKILL_MIME_TYPE = 'text/markdown';

export function skillFileUri(skillName: string, filePath: string): string {
  return `skill://currents/${skillName}/${filePath}`;
}

/**
 * Publishes each skill's markdown as an MCP resource.
 *
 * The MCP SDK has no skill primitive, so resources are the only way an agent
 * can read a skill off the server. Without this, the skills are reachable only
 * by cloning the repo and copying the directory into the agent's skills folder.
 */
export function registerSkills(server: McpServer): void {
  for (const skill of getSkills()) {
    for (const file of skill.files) {
      const uri = skillFileUri(skill.name, file.path);
      const isEntryPoint = file.path === 'SKILL.md';
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
  }
}

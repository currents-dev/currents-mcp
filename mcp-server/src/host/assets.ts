import type { Skill } from '../skills';

declare const __LOGO_BASE64__: string;
declare const __VERSION__: string;
declare const __SKILLS__: Skill[];

/**
 * The version, logo and skills, inlined at build time by `tsdown`.
 *
 * This is the seam the two builds of these tools differ at. npm cannot pack the
 * `skills/` directory that sits above this package's root, so the build reads
 * all three and defines them into the bundle. The monorepo copy has no such
 * limit and reads them from disk instead.
 */
export const MCP_SERVER_VERSION: string = __VERSION__;

export function getLogoDataUri(): string | undefined {
  return `data:image/png;base64,${__LOGO_BASE64__}`;
}

export function getSkills(): Skill[] {
  return __SKILLS__;
}

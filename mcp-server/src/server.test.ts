import { describe, expect, it, vi } from 'vitest';

const { registeredTools, registeredResources } = vi.hoisted(() => {
  const registeredTools: Array<{ name: string; description: string }> = [];
  const registeredResources: Array<{
    name: string;
    uri: string;
    mimeType?: string;
    read: () => { contents: Array<{ uri: string; text: string }> };
  }> = [];
  return { registeredTools, registeredResources };
});

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    registerTool(
      name: string,
      opts: { description: string; inputSchema: unknown },
      _handler: unknown
    ) {
      registeredTools.push({ name, description: opts.description });
    }

    registerResource(
      name: string,
      uri: string,
      opts: { mimeType?: string },
      read: () => { contents: Array<{ uri: string; text: string }> }
    ) {
      registeredResources.push({ name, uri, mimeType: opts.mimeType, read });
    }
  },
}));

// Building the server triggers all registerTool / registerResource calls
import { createMcpServer } from './server';
import { getSkills, skillFileUri } from './skills';

createMcpServer();

// SEP-986 (Final): tool names SHOULD be 1–64 characters
const TOOL_NAME_MAX_LENGTH = 64;
// Allowed: a-zA-Z0-9 _ - . /
const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_\-./]+$/;
// No hard spec limit; 1024 is the practical ceiling across major LLM providers
const TOOL_DESCRIPTION_MAX_LENGTH = 1024;
// Cursor IDE prefixes tool names with "extension-<server>:" when displaying them.
// Combined length must stay ≤ 60 to avoid filtering warnings.
const CURSOR_SERVER_PREFIX = 'extension-currents:';
const CURSOR_COMBINED_MAX_LENGTH = 60;

describe('MCP tool best practices', () => {
  it('has at least one registered tool', () => {
    expect(registeredTools.length).toBeGreaterThan(0);
  });

  it('tool names are unique', () => {
    const names = registeredTools.map((t) => t.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes, `duplicate tool names: ${dupes.join(', ')}`).toHaveLength(0);
  });

  describe.each(registeredTools)('$name', ({ name, description }) => {
    // ── name constraints (SEP-986) ──────────────────────────────
    it(`name length ≤ ${TOOL_NAME_MAX_LENGTH}`, () => {
      expect(
        name.length,
        `"${name}" is ${name.length} chars`
      ).toBeLessThanOrEqual(TOOL_NAME_MAX_LENGTH);
    });

    it('name contains only allowed characters', () => {
      expect(name).toMatch(TOOL_NAME_PATTERN);
    });

    it('name is not empty', () => {
      expect(name.length).toBeGreaterThan(0);
    });

    it(`combined Cursor name length ≤ ${CURSOR_COMBINED_MAX_LENGTH}`, () => {
      const combined = `${CURSOR_SERVER_PREFIX}${name}`;
      expect(
        combined.length,
        `"${combined}" is ${combined.length} chars`
      ).toBeLessThanOrEqual(CURSOR_COMBINED_MAX_LENGTH);
    });

    // ── description constraints ─────────────────────────────────
    it('description is not empty', () => {
      expect(description.length).toBeGreaterThan(0);
    });

    it(`description length ≤ ${TOOL_DESCRIPTION_MAX_LENGTH}`, () => {
      expect(
        description.length,
        `description is ${description.length} chars`
      ).toBeLessThanOrEqual(TOOL_DESCRIPTION_MAX_LENGTH);
    });

    it('description has no leading/trailing whitespace', () => {
      expect(description).toBe(description.trim());
    });

    it('description starts with a capital letter', () => {
      expect(description).toMatch(/^[A-Z]/);
    });

    it('description ends with a period', () => {
      expect(description.at(-1)).toBe('.');
    });
  });
});

describe('skills registered as resources', () => {
  it('registers every file of every skill', () => {
    const expected = getSkills().flatMap((skill) =>
      skill.files.map((file) => skillFileUri(skill.name, file.path))
    );
    expect(expected.length).toBeGreaterThan(0);
    expect(registeredResources.map((r) => r.uri).sort()).toEqual(
      expected.sort()
    );
  });

  it('resource URIs are unique', () => {
    const uris = registeredResources.map((r) => r.uri);
    expect(new Set(uris).size).toBe(uris.length);
  });

  it('serves the skill markdown as text/markdown', () => {
    for (const resource of registeredResources) {
      expect(resource.mimeType).toBe('text/markdown');
      const [content] = resource.read().contents;
      expect(content.uri).toBe(resource.uri);
      expect(content.text.length).toBeGreaterThan(0);
    }
  });

  it('serves the frontmatter of each skill entry point', () => {
    for (const skill of getSkills()) {
      const entryPoint = registeredResources.find(
        (r) => r.uri === skillFileUri(skill.name, 'SKILL.md')
      );
      expect(
        entryPoint,
        `no SKILL.md resource for ${skill.name}`
      ).toBeDefined();
      expect(entryPoint?.read().contents[0].text).toContain(
        `name: ${skill.name}`
      );
    }
  });
});

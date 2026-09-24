import { describe, expect, it, vi } from 'vitest';

const { registeredTools, registeredResources, serverOptions } = vi.hoisted(
  () => {
    const registeredTools: Array<{
      name: string;
      title: string;
      description: string;
      annotations?: Record<string, unknown>;
    }> = [];
    const registeredResources: Array<{
      name: string;
      uri: string;
      mimeType?: string;
      read: () => { contents: Array<{ uri: string; text: string }> };
    }> = [];
    const registeredPrompts: Array<{
      name: string;
      description?: string;
      get: () => {
        messages: Array<{ content: { type: string; text: string } }>;
      };
    }> = [];
    const serverOptions: Array<{
      info: Record<string, unknown>;
      options?: Record<string, unknown>;
    }> = [];
    return {
      registeredTools,
      registeredResources,
      registeredPrompts,
      serverOptions,
    };
  }
);

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: class {
    // The factory replaces the SDK's `tools/list` handler through this; what
    // it serves is `lib/toolList.test.ts`.
    server = { setRequestHandler: vi.fn() };

    constructor(
      info: Record<string, unknown>,
      options?: Record<string, unknown>
    ) {
      serverOptions.push({ info, options });
    }

    registerTool(
      name: string,
      opts: {
        title: string;
        description: string;
        inputSchema: unknown;
        annotations?: Record<string, unknown>;
      },
      _handler: unknown
    ) {
      registeredTools.push({
        name,
        title: opts.title,
        description: opts.description,
        annotations: opts.annotations,
      });
    }

    registerResource(
      name: string,
      uri: string,
      opts: { mimeType?: string },
      read: () => { contents: Array<{ uri: string; text: string }> }
    ) {
      registeredResources.push({ name, uri, mimeType: opts.mimeType, read });
    }

    // What the prompts are is `http.test.ts`, over the transport. Without the
    // method the factory throws here and every test in this file fails.
    registerPrompt() {}
  },
}));

// Building the server triggers all registerTool / registerResource calls
import type { RequestContext } from './lib/context';
import {
  buildServerInstructions,
  SCOPE_ORDER,
  SCOPES_WITHOUT_TOOLS,
} from './lib/instructions';
import { createMcpServer } from './server';
import { getSkills, skillFileUri } from './skills';

createMcpServer();

// SEP-986 (Final): tool names SHOULD be 1–64 characters
const TOOL_NAME_MAX_LENGTH = 64;
// Allowed: a-zA-Z0-9 _ - . /
const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_\-./]+$/;
// No hard spec limit; 1024 is the practical ceiling across major LLM providers
const TOOL_DESCRIPTION_MAX_LENGTH = 1024;
// A title is rendered in a tool-call card beside the server name, which is
// where it gets cut off rather than wrapped.
const TOOL_TITLE_MAX_LENGTH = 60;
// Cursor IDE prefixes tool names with "extension-<server>:" when displaying them.
// Combined length must stay ≤ 60 to avoid filtering warnings.
const CURSOR_SERVER_PREFIX = 'extension-currents:';
const CURSOR_COMBINED_MAX_LENGTH = 60;

// Every tool's expected annotations, written out rather than derived from the
// same constants `server.ts` registers with. A host's confirmation prompt is
// built from these four booleans, so a tool silently picking up the wrong
// combination — a create marked read-only, `currents-reset-run` marked
// idempotent — has to fail here, and a new tool has to be classified before it
// can be registered.
const EXPECTED_ANNOTATIONS: Record<string, Record<string, boolean>> = {
  'currents-list-actions': { r: true, d: false, i: true, o: false },
  'currents-create-action': { r: false, d: false, i: false, o: false },
  'currents-get-action': { r: true, d: false, i: true, o: false },
  'currents-update-action': { r: false, d: true, i: false, o: false },
  'currents-delete-action': { r: false, d: true, i: true, o: false },
  'currents-enable-action': { r: false, d: false, i: true, o: false },
  'currents-disable-action': { r: false, d: false, i: true, o: false },
  'currents-list-affected-tests': { r: true, d: false, i: true, o: false },
  'currents-get-affected-test-executions': {
    r: true,
    d: false,
    i: true,
    o: false,
  },
  'currents-get-action-executions': { r: true, d: false, i: true, o: false },
  'currents-get-projects': { r: true, d: false, i: true, o: false },
  'currents-get-project': { r: true, d: false, i: true, o: false },
  'currents-get-project-insights': { r: true, d: false, i: true, o: false },
  'currents-list-pull-requests': { r: true, d: false, i: true, o: false },
  'currents-list-project-terms': { r: true, d: false, i: true, o: false },
  'currents-create-jira-issue': { r: false, d: false, i: false, o: true },
  'currents-link-jira-issue': { r: false, d: false, i: false, o: true },
  'currents-list-jira-projects': { r: true, d: false, i: true, o: true },
  'currents-list-jira-issue-types': { r: true, d: false, i: true, o: true },
  'currents-get-runs': { r: true, d: false, i: true, o: false },
  'currents-get-run-details': { r: true, d: false, i: true, o: false },
  'currents-find-run': { r: true, d: false, i: true, o: false },
  'currents-cancel-run': { r: false, d: true, i: true, o: false },
  'currents-reset-run': { r: false, d: true, i: false, o: false },
  'currents-delete-run': { r: false, d: true, i: true, o: false },
  'currents-cancel-run-github-ci': { r: false, d: true, i: true, o: false },
  'currents-get-spec-instance': { r: true, d: false, i: true, o: false },
  'currents-get-spec-files-performance': {
    r: true,
    d: false,
    i: true,
    o: false,
  },
  'currents-get-tests-performance': { r: true, d: false, i: true, o: false },
  'currents-get-tests-signatures': { r: true, d: false, i: true, o: false },
  'currents-get-test-results': { r: true, d: false, i: true, o: false },
  'currents-get-context': { r: true, d: false, i: true, o: false },
  'currents-get-errors-explorer': { r: true, d: false, i: true, o: false },
  'currents-get-test-evidence': { r: true, d: false, i: true, o: false },
  // Each call mints another link to the same trace, and the ones already
  // handed out keep working.
  'currents-create-evidence-links': { r: false, d: false, i: false, o: false },
  // Each call records another run; the ones already recorded are untouched.
  'currents-create-session': { r: false, d: false, i: false, o: false },
  'currents-list-webhooks': { r: true, d: false, i: true, o: false },
  'currents-create-share-link': { r: false, d: false, i: false, o: true },
  'currents-create-webhook': { r: false, d: false, i: false, o: true },
  'currents-get-webhook': { r: true, d: false, i: true, o: false },
  'currents-update-webhook': { r: false, d: true, i: false, o: true },
  'currents-delete-webhook': { r: false, d: true, i: true, o: false },
};

// The table is written in the short keys above to stay readable at 39 rows.
const hints = (expected: Record<string, boolean>) => ({
  readOnlyHint: expected.r,
  destructiveHint: expected.d,
  idempotentHint: expected.i,
  openWorldHint: expected.o,
});

describe('MCP tool best practices', () => {
  it('has at least one registered tool', () => {
    expect(registeredTools.length).toBeGreaterThan(0);
  });

  it('tool names are unique', () => {
    const names = registeredTools.map((t) => t.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes, `duplicate tool names: ${dupes.join(', ')}`).toHaveLength(0);
  });

  // Two tools sharing a title are two identical rows in a client that renders
  // titles, with nothing to tell the caller which one it approved.
  it('tool titles are unique', () => {
    const titles = registeredTools.map((t) => t.title);
    const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
    expect(dupes, `duplicate tool titles: ${dupes.join(', ')}`).toHaveLength(0);
  });

  describe.each(registeredTools)(
    '$name',
    ({ name, title, description, annotations }) => {
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

      // ── title constraints ───────────────────────────────────────
      // A host that renders a title has only `currents-get-spec-instance` to
      // print without one, and the connector directory asks for one per tool.
      it('title is not empty', () => {
        expect(title.length).toBeGreaterThan(0);
      });

      it(`title length ≤ ${TOOL_TITLE_MAX_LENGTH}`, () => {
        expect(
          title.length,
          `"${title}" is ${title.length} chars`
        ).toBeLessThanOrEqual(TOOL_TITLE_MAX_LENGTH);
      });

      it('title is written for a person, not derived from the name', () => {
        expect(title).toBe(title.trim());
        expect(title).toMatch(/^[A-Z]/);
        expect(title).not.toContain('-');
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

      // ── annotation constraints ──────────────────────────────────
      // All four, not a subset: the spec defaults destructiveHint and
      // openWorldHint to true, so an unannotated read looks to a host like the
      // most dangerous kind of write.
      it('declares the four hints the catalog assigns it', () => {
        expect(annotations).toEqual(hints(EXPECTED_ANNOTATIONS[name]));
      });
    }
  );
});

describe('annotations agree with the tool name', () => {
  // Catches a tool registered without a row in the table, and a row left
  // behind by a rename — either way the per-tool check above would compare
  // against undefined and pass.
  it('the annotation table covers exactly the registered tools', () => {
    expect(registeredTools.map((t) => t.name).sort()).toEqual(
      Object.keys(EXPECTED_ANNOTATIONS).sort()
    );
  });

  // The name is what a host and a model see first. A get-/list-/find- tool
  // that writes, or a delete-/cancel- tool that claims to be additive, is
  // misread by both.
  it('every get-, list- and find- tool is read-only', () => {
    const writers = registeredTools
      .filter((t) => /^currents-(get|list|find)-/.test(t.name))
      .filter((t) => t.annotations?.readOnlyHint !== true)
      .map((t) => t.name);

    expect(writers).toEqual([]);
  });

  it('every delete- and cancel- tool is destructive', () => {
    const additive = registeredTools
      .filter((t) => /^currents-(delete|cancel)-/.test(t.name))
      .filter((t) => t.annotations?.destructiveHint !== true)
      .map((t) => t.name);

    expect(additive).toEqual([]);
  });
});

describe('tools registered by scope', () => {
  const everyTool = registeredTools.map((t) => t.name);
  /** On `requireAnyScope`, so it is in every list whatever the grant holds. */
  const ANY_SCOPE_TOOL = 'currents-get-tests-signatures';

  /** Rebuilds the server for one caller and returns the names it registered. */
  const toolsFor = (
    context: Pick<RequestContext, 'oauthScopes' | 'apiKeyScope'>
  ) => {
    registeredTools.length = 0;
    const resourceCount = registeredResources.length;
    createMcpServer(context);
    // The rebuild registers the skills again; the resource suite below reads
    // the set from the first build.
    registeredResources.length = resourceCount;
    return registeredTools.map((t) => t.name);
  };

  it('registers every tool for a caller with neither credential', () => {
    expect(toolsFor({})).toEqual(everyTool);
  });

  it('registers every tool for a write key', () => {
    expect(toolsFor({ apiKeyScope: 'write' })).toEqual(everyTool);
  });

  it('registers only the tools a read key may call', () => {
    const names = toolsFor({ apiKeyScope: 'read' });
    expect(names).toContain('currents-get-run-details');
    expect(names).toContain('currents-get-projects');
    expect(names).toContain('currents-list-webhooks');
    expect(names).toContain('currents-get-tests-signatures');
    // `issues:write` for a token, but the route takes a read key.
    expect(names).toContain('currents-list-jira-projects');
    expect(names).toContain('currents-list-jira-issue-types');
    expect(names).not.toContain('currents-create-jira-issue');
    expect(names).not.toContain('currents-delete-run');
    expect(names).not.toContain('currents-create-webhook');
    expect(names).not.toContain('currents-create-action');
  });

  it('registers only the tools a granted scope reaches', () => {
    const names = toolsFor({ oauthScopes: ['results:read'] });
    expect(names).toContain('currents-get-run-details');
    expect(names).toContain('currents-get-test-results');
    expect(names).not.toContain('currents-delete-run');
    expect(names).not.toContain('currents-list-webhooks');
    expect(names).not.toContain('currents-get-projects');
  });

  // `POST /signature/test` is `requireAnyScope`, a route every token reaches,
  // so its tool is registered whatever the grant holds — here a scope no other
  // tool is tagged with.
  it('registers the tool on the route that checks no scope for any grant', () => {
    expect(toolsFor({ oauthScopes: ['projects:write'] })).toEqual([
      'currents-get-tests-signatures',
    ]);
  });

  it('registers the union across several scopes', () => {
    const names = toolsFor({
      oauthScopes: ['projects:read', 'webhooks:read'],
    });
    expect(names).toContain('currents-get-projects');
    expect(names).toContain('currents-list-webhooks');
    expect(names).not.toContain('currents-create-webhook');
    expect(names).not.toContain('currents-get-runs');
  });

  // `lib/instructions.ts` tells a token holding one of these that no tool uses
  // it. Tagging a tool with one of them turns that line into a denial of a
  // tool the agent has been handed.
  it('leaves exactly the scopes the instructions call toolless without tools', () => {
    const toolless = SCOPE_ORDER.filter(
      (scope) =>
        toolsFor({ oauthScopes: [scope] }).filter(
          (name) => name !== ANY_SCOPE_TOOL
        ).length === 0
    );

    expect([...toolless].sort()).toEqual([...SCOPES_WITHOUT_TOOLS].sort());
  });
});

describe('instructions passed to the client', () => {
  /** Rebuilds the server for one caller and returns the instructions it set. */
  const instructionsFor = (
    context: Pick<RequestContext, 'oauthScopes' | 'apiKeyScope'>
  ) => {
    const resourceCount = registeredResources.length;
    createMcpServer(context);
    registeredResources.length = resourceCount;
    return serverOptions.at(-1)?.options?.instructions;
  };

  it('describes the credential the server was built for', () => {
    expect(instructionsFor({ oauthScopes: ['results:read'] })).toBe(
      buildServerInstructions({ oauthScopes: ['results:read'] }, getSkills())
    );
    expect(instructionsFor({ apiKeyScope: 'read' })).toBe(
      buildServerInstructions({ apiKeyScope: 'read' }, getSkills())
    );
  });

  // A skill declares no scopes, so this names them for every credential —
  // `lib/instructions.ts` says why, and the line carries the caveat.
  it('names the skills whatever the credential', () => {
    for (const context of [
      { oauthScopes: ['results:read'] as const },
      { apiKeyScope: 'read' as const },
      {},
    ]) {
      const instructions = instructionsFor(context);
      for (const skill of getSkills()) {
        expect(instructions).toContain(skill.name);
      }
    }
  });

  // The stdio server passes no context, and a client that gets an empty
  // `instructions` back learns nothing about the key it is calling with.
  it('is set for a caller with neither credential', () => {
    expect(instructionsFor({})).toEqual(expect.any(String));
    expect(instructionsFor({})).not.toBe('');
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

describe('server metadata', () => {
  it('advertises the logo as a png data URI', () => {
    const icons = serverOptions[0]?.info.icons as
      | Array<{ src: string; mimeType: string }>
      | undefined;

    expect(icons?.length).toBeGreaterThan(0);
    expect(icons?.[0].mimeType).toBe('image/png');
    // The base64 payload, not just the prefix: an unreadable logo would still
    // produce a well-formed but empty data URI.
    expect(
      icons?.[0].src.replace('data:image/png;base64,', '').length
    ).toBeGreaterThan(0);
  });

  // Not a shape: the two builds of this source version differently. The npm
  // package reports its own semver, and the copy the API serves reports the
  // commit it was built from, because it has no release of its own to name.
  // Each checks its own in its `host/` tests; what both owe a client is a
  // version at all.
  it('advertises a name and version', () => {
    expect(serverOptions[0]?.info.name).toBe('currents');
    expect(serverOptions[0]?.info.version).toEqual(expect.any(String));
    expect(serverOptions[0]?.info.version).not.toBe('');
  });
});

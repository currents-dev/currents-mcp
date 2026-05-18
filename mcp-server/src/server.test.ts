import { describe, expect, it, vi } from "vitest";

const { registeredTools } = vi.hoisted(() => {
  const registeredTools: Array<{ name: string; description: string }> = [];
  return { registeredTools };
});

vi.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: class {
    registerTool(
      name: string,
      opts: { description: string; inputSchema: unknown },
      _handler: unknown
    ) {
      registeredTools.push({ name, description: opts.description });
    }
  },
}));

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  StdioServerTransport: class {},
}));

// Triggers all registerTool calls at module scope
import "./server.js";

// SEP-986 (Final): tool names SHOULD be 1–64 characters
const TOOL_NAME_MAX_LENGTH = 64;
// Allowed: a-zA-Z0-9 _ - . /
const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_\-./]+$/;
// No hard spec limit; 1024 is the practical ceiling across major LLM providers
const TOOL_DESCRIPTION_MAX_LENGTH = 1024;

describe("MCP tool best practices", () => {
  it("has at least one registered tool", () => {
    expect(registeredTools.length).toBeGreaterThan(0);
  });

  it("tool names are unique", () => {
    const names = registeredTools.map((t) => t.name);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    expect(dupes, `duplicate tool names: ${dupes.join(", ")}`).toHaveLength(0);
  });

  describe.each(registeredTools)("$name", ({ name, description }) => {
    // ── name constraints (SEP-986) ──────────────────────────────
    it(`name length ≤ ${TOOL_NAME_MAX_LENGTH}`, () => {
      expect(
        name.length,
        `"${name}" is ${name.length} chars`
      ).toBeLessThanOrEqual(TOOL_NAME_MAX_LENGTH);
    });

    it("name contains only allowed characters", () => {
      expect(name).toMatch(TOOL_NAME_PATTERN);
    });

    it("name is not empty", () => {
      expect(name.length).toBeGreaterThan(0);
    });

    // ── description constraints ─────────────────────────────────
    it("description is not empty", () => {
      expect(description.length).toBeGreaterThan(0);
    });

    it(`description length ≤ ${TOOL_DESCRIPTION_MAX_LENGTH}`, () => {
      expect(
        description.length,
        `description is ${description.length} chars`
      ).toBeLessThanOrEqual(TOOL_DESCRIPTION_MAX_LENGTH);
    });

    it("description has no leading/trailing whitespace", () => {
      expect(description).toBe(description.trim());
    });

    it("description starts with a capital letter", () => {
      expect(description).toMatch(/^[A-Z]/);
    });

    it("description ends with a period", () => {
      expect(description.at(-1)).toBe(".");
    });
  });
});

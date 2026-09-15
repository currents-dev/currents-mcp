import { normalizeObjectSchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
import type { Tool, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { McpTool } from './tool';

/** A tool as `server.ts` declares it, before any server registers it. */
export type CatalogTool = {
  name: string;
  description: string;
  annotations: ToolAnnotations;
  tool: McpTool;
};

/**
 * The options the SDK converts an input schema under, copied from its own
 * `tools/list` handler (`server/mcp.js`). The payload this module serves
 * replaces that handler's, so a client has to get the same JSON Schema from
 * either — `toolList.test.ts` lists a server built each way and compares.
 */
const JSON_SCHEMA_OPTIONS = {
  strictUnions: true,
  pipeStrategy: 'input',
} as const;

/** What the SDK sends for a tool that declares no input. */
const EMPTY_INPUT_SCHEMA = { type: 'object', properties: {} } as const;

/**
 * How many tool sets keep their list. Each one is around 50kb, so this holds
 * the cache near 3mb — far above the number of distinct grants a deployment
 * serves, and a bound rather than none, since what the key is built from comes
 * from a token and from the organization's feature flags.
 */
export const MAX_CACHED_TOOL_SETS = 64;

/** Insertion order is the recency order: a hit re-inserts, so the oldest evicts first. */
const cache = new Map<string, Tool[]>();

/**
 * The `tools/list` answer for `granted`, built once per distinct tool set.
 *
 * The SDK builds this answer inside its own handler on every call, converting
 * each tool's Zod schema to JSON Schema — 4ms for the 39-tool list, on a
 * `POST /mcp` that builds a server and throws it away per request. Nothing in
 * it varies per request once the set is decided, so the answer is cached and
 * `server.ts` serves it in place of the SDK's handler.
 *
 * Keyed on the granted names rather than on what `isToolGranted` read to
 * choose them. Those inputs are a moving set — scopes, and now the
 * organization's feature flags — and a key naming some of them serves one
 * organization's list to another the first time a tool is gated on something
 * the key left out. The names are what the payload is built from, so a key
 * made of them cannot disagree with it, whatever `isToolGranted` grows to
 * read. `server.ts` has the set in hand already, and joining 39 short strings
 * is far below the 4ms of a rebuild.
 */
export function listTools(granted: CatalogTool[]): Tool[] {
  // Newline-joined: tool names are unique and carry no whitespace
  // (`server.test.ts`), so no two sets can produce one key.
  const key = granted.map((entry) => entry.name).join('\n');
  const cached = cache.get(key);
  if (cached) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  const listed = granted.map(toolDefinition);
  if (cache.size >= MAX_CACHED_TOOL_SETS) {
    cache.delete(cache.keys().next().value as string);
  }
  cache.set(key, listed);
  return listed;
}

function toolDefinition({
  name,
  description,
  annotations,
  tool,
}: CatalogTool): Tool {
  const schema = normalizeObjectSchema(tool.schema);
  return {
    name,
    description,
    inputSchema: schema
      ? (toJsonSchemaCompat(schema, JSON_SCHEMA_OPTIONS) as Tool['inputSchema'])
      : EMPTY_INPUT_SCHEMA,
    annotations,
    // `registerTool` is the SDK's non-task registration, so every tool here
    // forbids the task protocol; `registerToolTask` is what would not.
    execution: { taskSupport: 'forbidden' },
  };
}

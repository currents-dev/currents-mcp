import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  signature: z.string().describe("The test signature."),
  date_start: z
    .string()
    .describe("Start date in ISO 8601 format (required)."),
  date_end: z
    .string()
    .describe("End date in ISO 8601 format (required)."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Maximum number of items to return (default: 10, max: 100)."),
  starting_after: z
    .string()
    .optional()
    .describe(
      "Cursor for pagination. Returns items after this cursor value."
    ),
  ending_before: z
    .string()
    .optional()
    .describe(
      "Cursor for pagination. Returns items before this cursor value."
    ),
  branches: z
    .array(z.string())
    .optional()
    .describe("Filter by git branches (can be specified multiple times)."),
  branch: z
    .array(z.string())
    .optional()
    .describe(
      "Deprecated OpenAPI filter: serialized as branch[] (prefer branches)."
    ),
  tags: z
    .array(z.string())
    .optional()
    .describe("Filter by run tags (can be specified multiple times)."),
  tag: z
    .array(z.string())
    .optional()
    .describe("Deprecated OpenAPI filter: serialized as tag[] (prefer tags)."),
  authors: z
    .array(z.string())
    .optional()
    .describe("Filter by git authors (can be specified multiple times)."),
  git_author: z
    .array(z.string())
    .optional()
    .describe(
      "Deprecated OpenAPI filter: serialized as git_author[] (prefer authors)."
    ),
  status: z
    .array(z.enum(["passed", "failed", "pending", "skipped"]))
    .optional()
    .describe("Filter by test status (can be specified multiple times)."),
  groups: z
    .array(z.string())
    .optional()
    .describe("Filter by run groups (can be specified multiple times)."),
  group: z
    .array(z.string())
    .optional()
    .describe(
      "Deprecated OpenAPI filter: serialized as group[] (prefer groups)."
    ),
  flaky: z
    .boolean()
    .optional()
    .describe("Filter by flaky status. When true, returns only flaky tests. When false, returns only non-flaky tests. When omitted, returns all tests regardless of flaky status."),
  annotations: z
    .string()
    .optional()
    .describe('Filter by test annotations. JSON-stringified array of objects: [{\"type\": \"string\", \"description\": \"string\" | [\"string\"] or null}]. Omit description or set to null to match any value for that annotation type.'),
});

const handler = async ({
  signature,
  date_start,
  date_end,
  limit = 10,
  starting_after,
  ending_before,
  branches,
  branch,
  tags,
  tag,
  authors,
  git_author,
  status,
  groups,
  group,
  flaky,
  annotations,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("date_start", date_start);
  queryParams.append("date_end", date_end);
  queryParams.append("limit", limit.toString());

  if (starting_after) {
    queryParams.append("starting_after", starting_after);
  }

  if (ending_before) {
    queryParams.append("ending_before", ending_before);
  }

  if (branches && branches.length > 0) {
    branches.forEach((b) => queryParams.append("branches[]", b));
  }

  if (branch && branch.length > 0) {
    branch.forEach((b) => queryParams.append("branch[]", b));
  }

  if (tags && tags.length > 0) {
    tags.forEach((t) => queryParams.append("tags[]", t));
  }

  if (tag && tag.length > 0) {
    tag.forEach((t) => queryParams.append("tag[]", t));
  }

  if (authors && authors.length > 0) {
    authors.forEach((a) => queryParams.append("authors[]", a));
  }

  if (git_author && git_author.length > 0) {
    git_author.forEach((a) => queryParams.append("git_author[]", a));
  }

  if (status && status.length > 0) {
    status.forEach((s) => queryParams.append("status[]", s));
  }

  if (groups && groups.length > 0) {
    groups.forEach((g) => queryParams.append("groups[]", g));
  }

  if (group && group.length > 0) {
    group.forEach((g) => queryParams.append("group[]", g));
  }

  if (flaky !== undefined) {
    queryParams.append("flaky", flaky.toString());
  }

  if (annotations) {
    queryParams.append("annotations", annotations);
  }

  logger.info(
    `Fetching test results for test ${signature} with query params: ${queryParams.toString()}`
  );

  const data = await fetchApi(
    `/test-results/${signature}?${queryParams.toString()}`
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve test results",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
};

export const getTestResultsTool = {
  schema: zodSchema.shape,
  handler,
};

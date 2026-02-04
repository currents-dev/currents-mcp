import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to fetch runs from."),
  limit: z
    .number()
    .optional()
    .describe("The maximum number of results to return per page (default: 10, max: 100)."),
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
  branch: z
    .string()
    .optional()
    .describe("Filter runs by git branch name."),
  tag: z
    .array(z.string())
    .optional()
    .describe("Filter runs by tags (can be specified multiple times). Use tag_operator to control matching behavior."),
  tag_operator: z
    .enum(["AND", "OR"])
    .optional()
    .describe("Logical operator for tag filtering. AND requires all tags to be present (default), OR requires any tag to be present."),
  search: z
    .string()
    .optional()
    .describe("Search runs by ciBuildId or commit message. Case-insensitive."),
  author: z
    .array(z.string())
    .optional()
    .describe("Filter runs by git commit author name (can be specified multiple times)."),
  status: z
    .array(z.enum(["PASSED", "FAILED", "RUNNING", "FAILING"]))
    .optional()
    .describe("Filter runs by status. PASSED: all tests passed, FAILED: some tests failed, RUNNING: run is in progress and passing, FAILING: run is in progress but has failures."),
  completion_state: z
    .array(z.enum(["COMPLETE", "IN_PROGRESS", "CANCELED", "TIMEOUT"]))
    .optional()
    .describe("Filter runs by completion state. COMPLETE: run finished normally, IN_PROGRESS: run is still executing, CANCELED: run was canceled, TIMEOUT: run timed out."),
  date_start: z
    .string()
    .optional()
    .describe("Filter runs created on or after this date (ISO 8601 format)."),
  date_end: z
    .string()
    .optional()
    .describe("Filter runs created before this date (ISO 8601 format)."),
});

const handler = async ({
  projectId,
  limit = 10,
  starting_after,
  ending_before,
  branch,
  tag,
  tag_operator,
  search,
  author,
  status,
  completion_state,
  date_start,
  date_end,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("limit", limit.toString());

  if (starting_after) {
    queryParams.append("starting_after", starting_after);
  }

  if (ending_before) {
    queryParams.append("ending_before", ending_before);
  }

  if (branch) {
    queryParams.append("branch", branch);
  }

  if (tag && tag.length > 0) {
    tag.forEach((t) => queryParams.append("tag[]", t));
  }

  if (tag_operator) {
    queryParams.append("tag_operator", tag_operator);
  }

  if (search) {
    queryParams.append("search", search);
  }

  if (author && author.length > 0) {
    author.forEach((a) => queryParams.append("author[]", a));
  }

  if (status && status.length > 0) {
    status.forEach((s) => queryParams.append("status", s));
  }

  if (completion_state && completion_state.length > 0) {
    completion_state.forEach((cs) => queryParams.append("completion_state", cs));
  }

  if (date_start) {
    queryParams.append("date_start", date_start);
  }

  if (date_end) {
    queryParams.append("date_end", date_end);
  }

  logger.info(`Fetching runs with query params: ${queryParams.toString()}`);

  const data = await fetchApi(
    `/projects/${projectId}/runs?${queryParams.toString()}`
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve runs",
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

export const getRunsTool = {
  schema: zodSchema.shape,
  handler,
};

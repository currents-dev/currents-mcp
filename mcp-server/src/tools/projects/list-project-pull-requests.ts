import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z.string().describe("The project ID to list pull requests for."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Maximum number of PR cards per page (default: 10, max: 50)."),
  starting_after: z
    .string()
    .optional()
    .describe("Cursor for forward pagination."),
  ending_before: z
    .string()
    .optional()
    .describe("Cursor for backward pagination."),
  runs_per_pr: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Number of recent runs to preview per PR card (default: 1, max: 10)."),
  tags: z
    .array(z.string())
    .optional()
    .describe("Filter by run tags (can be specified multiple times)."),
  branches: z
    .array(z.string())
    .optional()
    .describe("Filter by git branch names (can be specified multiple times)."),
  authors: z
    .array(z.string())
    .optional()
    .describe("Filter by git commit author glob patterns (can be specified multiple times)."),
  tag_operator: z
    .enum(["AND", "OR"])
    .optional()
    .describe("Logical operator for tag filtering. AND requires all tags (default), OR requires any tag."),
  status: z
    .array(z.enum(["PASSED", "FAILED", "RUNNING", "FAILING"]))
    .optional()
    .describe("Filter PR cards by latest run status (can be specified multiple times)."),
});

const handler = async ({
  projectId,
  limit,
  starting_after,
  ending_before,
  runs_per_pr,
  tags,
  branches,
  authors,
  tag_operator,
  status,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();

  if (limit !== undefined) {
    queryParams.append("limit", limit.toString());
  }
  if (starting_after) {
    queryParams.append("starting_after", starting_after);
  }
  if (ending_before) {
    queryParams.append("ending_before", ending_before);
  }
  if (runs_per_pr !== undefined) {
    queryParams.append("runs_per_pr", runs_per_pr.toString());
  }
  if (tags?.length) {
    tags.forEach((t) => queryParams.append("tags[]", t));
  }
  if (branches?.length) {
    branches.forEach((b) => queryParams.append("branches[]", b));
  }
  if (authors?.length) {
    authors.forEach((a) => queryParams.append("authors[]", a));
  }
  if (tag_operator) {
    queryParams.append("tag_operator", tag_operator);
  }
  if (status?.length) {
    status.forEach((s) => queryParams.append("status", s));
  }

  const qs = queryParams.toString();
  const path = `/projects/${encodeURIComponent(projectId)}/pull-requests${qs ? `?${qs}` : ""}`;
  logger.info(`Fetching pull requests: ${path}`);

  const data = await fetchApi(path);
  if (!data) {
    return {
      content: [{ type: "text" as const, text: "Failed to retrieve pull requests" }],
    };
  }

  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
};

export const listProjectPullRequestsTool = {
  schema: zodSchema,
  handler,
};

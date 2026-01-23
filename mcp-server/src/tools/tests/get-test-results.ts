import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  signature: z.string().describe("The test signature."),
  date_start: z
    .string()
    .describe("Start date in ISO 8601 format."),
  date_end: z
    .string()
    .describe("End date in ISO 8601 format."),
  limit: z
    .number()
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
  branch: z
    .array(z.string())
    .optional()
    .describe("Filter by git branch (can be specified multiple times)."),
  tag: z
    .array(z.string())
    .optional()
    .describe("Filter by run tags (can be specified multiple times)."),
  git_author: z
    .array(z.string())
    .optional()
    .describe("Filter by git author (can be specified multiple times)."),
  status: z
    .array(z.enum(["passed", "failed", "pending", "skipped"]))
    .optional()
    .describe("Filter by test status (can be specified multiple times)."),
  group: z
    .array(z.string())
    .optional()
    .describe("Filter by run group (can be specified multiple times)."),
});

const handler = async ({
  signature,
  date_start,
  date_end,
  limit = 10,
  starting_after,
  ending_before,
  branch,
  tag,
  git_author,
  status,
  group,
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

  if (branch && branch.length > 0) {
    branch.forEach((b) => queryParams.append("branch", b));
  }

  if (tag && tag.length > 0) {
    tag.forEach((t) => queryParams.append("tag", t));
  }

  if (git_author && git_author.length > 0) {
    git_author.forEach((a) => queryParams.append("git_author", a));
  }

  if (status && status.length > 0) {
    status.forEach((s) => queryParams.append("status", s));
  }

  if (group && group.length > 0) {
    group.forEach((g) => queryParams.append("group", g));
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

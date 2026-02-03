import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to fetch test performance metrics from."),
  date_start: z
    .string()
    .optional()
    .describe(
      "The start of the date range to fetch the metrics from. ISO 8601 date format. Defaults to 30 days ago."
    ),
  date_end: z
    .string()
    .optional()
    .describe(
      "The end of the date range to fetch the metrics from. ISO 8601 date format. Defaults to now."
    ),
  spec: z
    .string()
    .optional()
    .describe(
      "Filter tests by spec file name (partial match)."
    ),
  title: z
    .string()
    .optional()
    .describe(
      "Filter tests by title (partial match)."
    ),
  order: z
    .enum([
      "failures",
      "passes",
      "flakiness",
      "flakinessXSamples",
      "failRateXSamples",
      "duration",
      "durationDelta",
      "flakinessRateDelta",
      "failureRateDelta",
      "durationXSamples",
      "executions",
      "title",
    ])
    .optional()
    .describe("The field to order the results by. Defaults to 'title'."),
  dir: z
    .enum(["asc", "desc"])
    .optional()
    .describe("The direction to sort the results in. Defaults to 'desc'."),
  limit: z
    .number()
    .optional()
    .describe("The maximum number of results to return per page (default: 50)."),
  page: z
    .number()
    .optional()
    .describe("The page number to fetch (0-indexed). Defaults to 0."),
  tags: z
    .array(z.string())
    .optional()
    .describe("Filter results by tags (can be specified multiple times)."),
  branches: z
    .array(z.string())
    .optional()
    .describe("Filter results by branches (can be specified multiple times)."),
  groups: z
    .array(z.string())
    .optional()
    .describe("Filter results by groups (can be specified multiple times)."),
  authors: z
    .array(z.string())
    .optional()
    .describe("Filter results by git authors (can be specified multiple times)."),
  min_executions: z
    .number()
    .optional()
    .describe("Minimum number of executions to include."),
  test_state: z
    .array(z.enum(["passed", "failed", "pending", "skipped"]))
    .optional()
    .describe("Filter by test state (can be specified multiple times)."),
  metric_settings: z
    .string()
    .optional()
    .describe('Override which test statuses are included in metric calculations. Pass a JSON object with optional keys: `executions`, `avgDuration`, `flakinessRate`, `failureRate`. Each value is an array of status strings: `passed`, `failed`, `pending`, `skipped`. Omitted keys use defaults. Example: `{"executions":["failed","passed"],"failureRate":["failed"]}`'),
});

const handler = async ({
  projectId,
  date_start = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString(),
  date_end = new Date().toISOString(),
  spec,
  title,
  order = "title",
  dir = "desc",
  limit = 50,
  page = 0,
  tags,
  branches,
  groups,
  authors,
  min_executions,
  test_state,
  metric_settings,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("date_start", date_start);
  queryParams.append("date_end", date_end);
  queryParams.append("order", order);
  queryParams.append("dir", dir);
  queryParams.append("limit", limit.toString());
  queryParams.append("page", page.toString());

  if (spec) {
    queryParams.append("spec", spec);
  }

  if (title) {
    queryParams.append("title", title);
  }

  if (tags && tags.length > 0) {
    tags.forEach((t) => queryParams.append("tags[]", t));
  }

  if (branches && branches.length > 0) {
    branches.forEach((b) => queryParams.append("branches[]", b));
  }

  if (groups && groups.length > 0) {
    groups.forEach((g) => queryParams.append("groups[]", g));
  }

  if (authors && authors.length > 0) {
    authors.forEach((a) => queryParams.append("authors[]", a));
  }

  if (min_executions !== undefined) {
    queryParams.append("min_executions", min_executions.toString());
  }

  if (test_state && test_state.length > 0) {
    test_state.forEach((ts) => queryParams.append("test_state[]", ts));
  }

  if (metric_settings) {
    queryParams.append("metric_settings", metric_settings);
  }

  logger.info(
    `Fetching tests performance for project ${projectId} with query params: ${queryParams.toString()}`
  );

  const data = await fetchApi(`/tests/${projectId}?${queryParams.toString()}`);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve project tests",
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

export const getTestsPerformanceTool = {
  schema: zodSchema.shape,
  handler,
};

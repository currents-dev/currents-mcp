import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to fetch spec files performance metrics from."),
  date_start: z
    .string()
    .describe(
      "The start of the date range to fetch the metrics from. ISO 8601 date format (required)."
    ),
  date_end: z
    .string()
    .describe(
      "The end of the date range to fetch the metrics from. ISO 8601 date format (required)."
    ),
  specNameFilter: z
    .string()
    .optional()
    .describe(
      "Filter spec files by name (partial match)."
    ),
  order: z
    .enum([
      "avgDuration",
      "failedExecutions",
      "failureRate",
      "flakeRate",
      "flakyExecutions",
      "fullyReported",
      "overallExecutions",
      "suiteSize",
      "timeoutExecutions",
      "timeoutRate",
    ])
    .optional()
    .describe("The field to order the spec files by. Defaults to 'avgDuration'."),
  dir: z
    .enum(["asc", "desc"])
    .optional()
    .describe("The direction to sort the results in. Defaults to 'desc'."),
  limit: z
    .number()
    .optional()
    .describe("The maximum number of results to return per page (default: 50, max: 50)."),
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
  includeFailedInDuration: z
    .boolean()
    .optional()
    .describe("Include failed executions in duration calculation. Defaults to false."),
});

const handler = async ({
  projectId,
  date_start,
  date_end,
  specNameFilter,
  order = "avgDuration",
  dir = "desc",
  limit = 50,
  page = 0,
  tags,
  branches,
  groups,
  authors,
  includeFailedInDuration = false,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("date_start", date_start);
  queryParams.append("date_end", date_end);
  queryParams.append("order", order);
  queryParams.append("dir", dir);
  queryParams.append("limit", limit.toString());
  queryParams.append("page", page.toString());

  if (specNameFilter) {
    queryParams.append("specNameFilter", specNameFilter);
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

  if (includeFailedInDuration) {
    queryParams.append("includeFailedInDuration", "true");
  }

  logger.info(
    `Fetching spec files performance for project ${projectId} with query params: ${queryParams.toString()}`
  );

  const data = await fetchApi(
    `/spec-files/${projectId}?${queryParams.toString()}`
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve project spec files",
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

export const getSpecFilesPerformanceTool = {
  schema: zodSchema.shape,
  handler,
};

import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to fetch test performance metrics from."),
  from: z
    .string()
    .describe(
      "The start of the date range to fetch the metrics from. ISO 8601 date, but without the time part"
    )
    .default(
      // 30 days ago
      new Date(new Date().setDate(new Date().getDate() - 30))
        .toISOString()
        .split("T")[0]
    ),
  to: z
    .string()
    .describe(
      "The end of the date range to fetch the metrics from. ISO 8601 date, but without the time part"
    )
    .default(new Date().toISOString().split("T")[0]),
  specNameFilter: z
    .string()
    .optional()
    .describe(
      "The spec name to filter by. If not provided, a paginated response of all spec files will be returned."
    ),
  testNameFilter: z
    .string()
    .optional()
    .describe(
      "The test name to filter by. If not provided, a paginated response of all tests will be returned."
    ),
  order: z
    .enum([
      "duration",
      "executions",
      "failures",
      "flakiness",
      "passes",
      "title",
      "durationXSamples",
      "failRateXSamples",
      "failureRateDelta",
      "flakinessRateDelta",
      "flakinessXSamples",
    ])
    .describe("The field to order the results by."),
  orderDirection: z
    .enum(["asc", "desc"])
    .default("desc")
    .describe("The direction to sort the results in."),
  limit: z
    .number()
    .max(50)
    .optional()
    .default(50)
    .describe("The maximum number of results to return per page."),
  page: z
    .number()
    .optional()
    .default(0)
    .describe("The page number to fetch (0-based)."),
  tags: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Filter results by test tags."),
  branches: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Filter results by git branches."),
  authors: z
    .array(z.string())
    .optional()
    .default([])
    .describe("Filter results by git authors."),
});

const handler = async ({
  projectId,
  from,
  to,
  specNameFilter,
  testNameFilter,
  order,
  orderDirection,
  limit,
  page,
  tags,
  branches,
  authors,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("date_start", from);
  queryParams.append("date_end", to);
  queryParams.append("order", order);
  queryParams.append("dir", orderDirection);
  queryParams.append("limit", limit.toString());
  queryParams.append("page", page.toString());

  if (specNameFilter) {
    queryParams.append("spec", specNameFilter);
  }

  if (testNameFilter) {
    queryParams.append("test", testNameFilter);
  }

  if (tags.length > 0) {
    queryParams.append("tags", tags.join("&tags[]="));
  }

  if (branches.length > 0) {
    queryParams.append("branches", branches.join("&branches[]="));
  }

  if (authors.length > 0) {
    queryParams.append("authors", authors.join("&authors[]="));
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

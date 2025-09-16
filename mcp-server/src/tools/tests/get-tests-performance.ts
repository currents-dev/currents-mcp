import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { InstanceData } from "../../types.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z.string(),
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
  order: z.enum([
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
  ]),
  orderDirection: z.enum(["asc", "desc"]).default("desc"),
  limit: z.number().optional().default(50),
  page: z.number().optional().default(0),
  tags: z.array(z.string()).optional().default([]),
  branches: z.array(z.string()).optional().default([]),
  authors: z.array(z.string()).optional().default([]),
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

  const data = await fetchApi<InstanceData>(
    `/tests/${projectId}?${queryParams.toString()}`
  );

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

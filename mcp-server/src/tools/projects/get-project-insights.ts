import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to fetch insights from."),
  date_start: z
    .string()
    .describe("Start date in ISO 8601 format."),
  date_end: z
    .string()
    .describe("End date in ISO 8601 format."),
  resolution: z
    .enum(["1h", "1d", "1w"])
    .optional()
    .describe("Time resolution for histogram data. Defaults to '1d'."),
  tags: z
    .array(z.string())
    .optional()
    .describe("Filter by tags (can be specified multiple times)."),
  branches: z
    .array(z.string())
    .optional()
    .describe("Filter by branches (can be specified multiple times)."),
  groups: z
    .array(z.string())
    .optional()
    .describe("Filter by groups (can be specified multiple times)."),
  authors: z
    .array(z.string())
    .optional()
    .describe("Filter by git authors (can be specified multiple times)."),
});

const handler = async ({
  projectId,
  date_start,
  date_end,
  resolution,
  tags,
  branches,
  groups,
  authors,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("date_start", date_start);
  queryParams.append("date_end", date_end);

  if (resolution) {
    queryParams.append("resolution", resolution);
  }

  if (tags && tags.length > 0) {
    tags.forEach((t) => queryParams.append("tags", t));
  }

  if (branches && branches.length > 0) {
    branches.forEach((b) => queryParams.append("branches", b));
  }

  if (groups && groups.length > 0) {
    groups.forEach((g) => queryParams.append("groups", g));
  }

  if (authors && authors.length > 0) {
    authors.forEach((a) => queryParams.append("authors", a));
  }

  logger.info(
    `Fetching project insights for project ${projectId} with query params: ${queryParams.toString()}`
  );

  const data = await fetchApi(
    `/projects/${projectId}/insights?${queryParams.toString()}`
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve project insights",
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

export const getProjectInsightsTool = {
  schema: zodSchema.shape,
  handler,
};

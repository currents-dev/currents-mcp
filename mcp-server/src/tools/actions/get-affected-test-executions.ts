import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID."),
  signature: z
    .string()
    .describe("The test signature to fetch affected executions for."),
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
    .max(50)
    .optional()
    .describe("Maximum number of results per page (1-50). Defaults to 25."),
  dir: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Sort direction. Defaults to 'desc'."),
  actionTypes: z
    .array(z.enum(["quarantine", "skip", "tag"]))
    .optional()
    .describe("Filter by action types (can be specified multiple times)."),
  actionId: z
    .string()
    .optional()
    .describe("Filter by a specific action ID."),
  search: z
    .string()
    .max(100)
    .optional()
    .describe("Search filter."),
});

const handler = async ({
  projectId,
  signature,
  date_start,
  date_end,
  limit = 25,
  dir = "desc",
  actionTypes,
  actionId,
  search,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("date_start", date_start);
  queryParams.append("date_end", date_end);
  queryParams.append("limit", limit.toString());
  queryParams.append("dir", dir);

  if (actionTypes && actionTypes.length > 0) {
    actionTypes.forEach((t) => queryParams.append("actionTypes", t));
  }

  if (actionId) {
    queryParams.append("actionId", actionId);
  }

  if (search) {
    queryParams.append("search", search);
  }

  logger.info(
    `Fetching affected test executions for project ${projectId}, signature ${signature} with query params: ${queryParams.toString()}`
  );

  const data = await fetchApi(
    `/actions/tests/${projectId}/${signature}?${queryParams.toString()}`
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve affected test executions",
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

export const getAffectedTestExecutionsTool = {
  schema: zodSchema.shape,
  handler,
};

import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to fetch affected tests from."),
  date_start: z
    .string()
    .describe("Start date in ISO 8601 format (required)."),
  date_end: z
    .string()
    .describe("End date in ISO 8601 format (required)."),
  page: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Page number (0-indexed). Defaults to 0."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Maximum number of results per page (1-100). Defaults to 25."),
  search: z
    .string()
    .max(100)
    .optional()
    .describe("Search affected tests by name."),
  actionTypes: z
    .array(z.enum(["quarantine", "skip", "tag"]))
    .optional()
    .describe("Filter by action types (can be specified multiple times)."),
  actionId: z
    .string()
    .optional()
    .describe("Filter by a specific action ID."),
  dir: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Sort direction. Defaults to 'desc'."),
  status: z
    .enum(["active", "expired"])
    .optional()
    .describe("Filter by action status."),
});

const handler = async ({
  projectId,
  date_start,
  date_end,
  page = 0,
  limit = 25,
  search,
  actionTypes,
  actionId,
  dir = "desc",
  status,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("date_start", date_start);
  queryParams.append("date_end", date_end);
  queryParams.append("page", page.toString());
  queryParams.append("limit", limit.toString());
  queryParams.append("dir", dir);

  if (search) {
    queryParams.append("search", search);
  }

  if (actionTypes && actionTypes.length > 0) {
    actionTypes.forEach((t) => queryParams.append("actionTypes", t));
  }

  if (actionId) {
    queryParams.append("actionId", actionId);
  }

  if (status) {
    queryParams.append("status", status);
  }

  logger.info(
    `Fetching affected tests for project ${projectId} with query params: ${queryParams.toString()}`
  );

  const data = await fetchApi(
    `/actions/tests/${projectId}?${queryParams.toString()}`
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve affected tests",
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

export const getAffectedTestsTool = {
  schema: zodSchema.shape,
  handler,
};

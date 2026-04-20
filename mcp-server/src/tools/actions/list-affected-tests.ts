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
    .describe("Maximum number of results (1-100). Defaults to 25."),
  search: z
    .string()
    .max(100)
    .optional()
    .describe("Search by spec file path, test title, or action name (case-insensitive)."),
  action_type: z
    .array(z.enum(["quarantine", "skip", "tag"]))
    .optional()
    .describe(
      "Filter by action types (can be specified multiple times)."
    ),
  action_id: z
    .string()
    .optional()
    .describe("Filter by a specific action ID."),
  dir: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Sort direction for lastSeen. Defaults to 'desc'."),
  status: z
    .array(z.enum(["active", "disabled", "expired", "archived"]))
    .optional()
    .describe("Filter by action status. Accepts multiple values. Omit for all statuses."),
});

const handler = async ({
  projectId,
  date_start,
  date_end,
  page = 0,
  limit = 25,
  search,
  action_type,
  action_id,
  dir,
  status,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("projectId", projectId);
  queryParams.append("date_start", date_start);
  queryParams.append("date_end", date_end);
  queryParams.append("page", page.toString());
  queryParams.append("limit", limit.toString());

  if (search) {
    queryParams.append("search", search);
  }

  if (action_type && action_type.length > 0) {
    action_type.forEach((t) => queryParams.append("action_type[]", t));
  }

  if (action_id) {
    queryParams.append("action_id", action_id);
  }

  if (dir) {
    queryParams.append("dir", dir);
  }

  if (status && status.length > 0) {
    status.forEach((s) => queryParams.append("status", s));
  }

  logger.info(
    `Fetching affected tests for project ${projectId} with query params: ${queryParams.toString()}`
  );

  const data = await fetchApi(
    `/actions/tests?${queryParams.toString()}`
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

export const listAffectedTestsTool = {
  schema: zodSchema.shape,
  handler,
};

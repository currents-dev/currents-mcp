import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  actionId: z
    .string()
    .describe("The action ID to fetch affected test executions for."),
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
    .describe("Maximum number of executions (1-50). Defaults to 25."),
  starting_after: z
    .string()
    .optional()
    .describe("Cursor for pagination. Returns items after this cursor value."),
  ending_before: z
    .string()
    .optional()
    .describe("Cursor for pagination. Returns items before this cursor value."),
  search: z
    .string()
    .max(100)
    .optional()
    .describe("Search by action name (case-insensitive)."),
});

const handler = async ({
  actionId,
  date_start,
  date_end,
  limit = 25,
  starting_after,
  ending_before,
  search,
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

  if (search) {
    queryParams.append("search", search);
  }

  logger.info(
    `Fetching affected test executions for action ${actionId} with query params: ${queryParams.toString()}`
  );

  const data = await fetchApi(
    `/actions/${actionId}/tests?${queryParams.toString()}`
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve affected test executions for action",
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

export const getAffectedTestExecutionsByActionTool = {
  schema: zodSchema,
  handler,
};

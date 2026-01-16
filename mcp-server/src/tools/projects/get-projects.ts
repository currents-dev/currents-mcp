import { z } from "zod";
import { fetchApi, fetchCursorBasedPaginatedApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  limit: z
    .number()
    .max(100)
    .optional()
    .describe("Maximum number of items to return (default: 10, max: 100)."),
  starting_after: z
    .string()
    .optional()
    .describe("Cursor for pagination. Returns items after this cursor value."),
  ending_before: z
    .string()
    .optional()
    .describe("Cursor for pagination. Returns items before this cursor value."),
  fetchAll: z
    .boolean()
    .optional()
    .describe("If true, fetches all projects using automatic pagination. Ignores limit, starting_after, and ending_before."),
});

const handler = async ({
  limit,
  starting_after,
  ending_before,
  fetchAll = false,
}: z.infer<typeof zodSchema>) => {
  // If fetchAll is true, use the automatic pagination
  if (fetchAll) {
    logger.info("Fetching all projects with automatic pagination");
    const data = await fetchCursorBasedPaginatedApi("/projects");

    if (!data) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Failed to retrieve projects",
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
  }

  // Otherwise, use manual pagination with parameters
  const queryParams = new URLSearchParams();

  if (limit !== undefined) {
    queryParams.append("limit", limit.toString());
  }

  if (starting_after) {
    queryParams.append("starting_after", starting_after);
  }

  if (ending_before) {
    queryParams.append("ending_before", ending_before);
  }

  const queryString = queryParams.toString();
  const path = queryString ? `/projects?${queryString}` : "/projects";

  logger.info(`Fetching projects with query params: ${queryString}`);

  const data = await fetchApi(path);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve projects",
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

export const getProjectsTool = {
  schema: zodSchema.shape,
  handler,
};

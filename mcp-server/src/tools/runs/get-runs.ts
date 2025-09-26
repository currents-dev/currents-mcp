import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to fetch test performance metrics from."),
  limit: z
    .number()
    .max(50)
    .optional()
    .default(50)
    .describe("The maximum number of results to return per page."),
  cursor: z
    .string()
    .optional()
    .describe(
      "The cursor to fetch the next page of results. Should the id of the last item in the previous page."
    ),
});

const handler = async ({
  projectId,
  limit,
  cursor,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("limit", limit.toString());

  if (cursor) {
    queryParams.append("starting_after", cursor);
  }

  logger.info(`Fetching runs with query params: ${queryParams.toString()}`);

  const data = await fetchApi(
    `/projects/${projectId}/runs?${queryParams.toString()}`
  );

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve runs",
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

export const getRunsTool = {
  schema: zodSchema.shape,
  handler,
};

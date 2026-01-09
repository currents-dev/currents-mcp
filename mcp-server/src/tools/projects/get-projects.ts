import { z } from "zod";
import { fetchApi, PaginatedResponse } from "../../lib/request.js";

const zodSchema = z.object({
  limit: z
    .number()
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
});

const handler = async ({
  limit,
  starting_after,
  ending_before,
}: z.infer<typeof zodSchema>) => {
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
  
  const data = await fetchApi<PaginatedResponse<any>>(path);

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

import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to fetch actions from."),
  status: z
    .array(z.enum(["active", "disabled", "archived", "expired"]))
    .optional()
    .describe("Filter actions by status (can be specified multiple times)."),
  search: z
    .string()
    .optional()
    .describe("Search actions by name."),
});

const handler = async ({
  projectId,
  status,
  search,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("projectId", projectId);

  if (status && status.length > 0) {
    status.forEach((s) => queryParams.append("status", s));
  }

  if (search) {
    queryParams.append("search", search);
  }

  logger.info(
    `Fetching actions for project ${projectId} with query params: ${queryParams.toString()}`
  );

  const data = await fetchApi(`/actions?${queryParams.toString()}`);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve actions",
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

export const listActionsTool = {
  schema: zodSchema.shape,
  handler,
};

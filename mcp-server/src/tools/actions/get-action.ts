import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  actionId: z.string().describe("The action ID to fetch."),
});

const handler = async ({ actionId }: z.infer<typeof zodSchema>) => {
  logger.info(`Fetching action ${actionId}`);

  const data = await fetchApi(`/actions/${actionId}`);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve action",
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

export const getActionTool = {
  schema: zodSchema.shape,
  handler,
};

import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  projectId: z
    .string()
    .describe("The project ID to fetch webhooks from."),
});

const handler = async ({
  projectId,
}: z.infer<typeof zodSchema>) => {
  const queryParams = new URLSearchParams();
  queryParams.append("projectId", projectId);

  logger.info(
    `Fetching webhooks for project ${projectId}`
  );

  const data = await fetchApi(`/webhooks?${queryParams.toString()}`);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve webhooks",
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

export const listWebhooksTool = {
  schema: zodSchema.shape,
  handler,
};

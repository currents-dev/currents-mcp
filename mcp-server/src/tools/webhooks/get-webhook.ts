import { z } from "zod";
import { fetchApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  hookId: z
    .string()
    .describe("The webhook ID (UUID)."),
});

const handler = async ({
  hookId,
}: z.infer<typeof zodSchema>) => {
  logger.info(`Fetching webhook ${hookId}`);

  const data = await fetchApi(`/webhooks/${hookId}`);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to retrieve webhook",
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

export const getWebhookTool = {
  schema: zodSchema.shape,
  handler,
};

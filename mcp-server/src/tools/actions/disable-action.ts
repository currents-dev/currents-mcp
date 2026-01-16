import { z } from "zod";
import { putApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  actionId: z.string().describe("The action ID to disable."),
});

const handler = async ({ actionId }: z.infer<typeof zodSchema>) => {
  logger.info(`Disabling action ${actionId}`);

  const data = await putApi(`/actions/${actionId}/disable`);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to disable action",
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

export const disableActionTool = {
  schema: zodSchema.shape,
  handler,
};

import { z } from "zod";
import { putApi } from "../../lib/request.js";
import { logger } from "../../lib/logger.js";

const zodSchema = z.object({
  runId: z
    .string()
    .describe("The run ID to reset."),
});

const handler = async ({ runId }: z.infer<typeof zodSchema>) => {
  logger.info(`Resetting run ${runId}`);

  const data = await putApi(`/runs/${runId}/reset`);

  if (!data) {
    return {
      content: [
        {
          type: "text" as const,
          text: "Failed to reset run",
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

export const resetRunTool = {
  schema: zodSchema.shape,
  handler,
};
